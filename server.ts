import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { randomUUID } from 'crypto';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define types locally since we can't import from src/types.ts in server.ts easily without build step
interface User {
  id: string;
  username: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  avatar?: string;
  personalMessage?: string;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

// Initialize Turso database client
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Store connected clients: Map<WebSocket, User>
const clients = new Map<WebSocket, User>();

// Broadcast user list to all connected clients
const broadcastUserList = async () => {
  try {
    // Get users from database (persistent users)
    const result = await db.execute('SELECT id, username, status, avatar, personal_message as personalMessage FROM users');
    const dbUsers = result.rows.map(row => ({
      id: row.id as string,
      username: row.username as string,
      status: row.status as string,
      avatar: row.avatar as string | undefined,
      personalMessage: row.personalMessage as string | undefined,
    }));

    // Get currently connected users from memory
    const connectedUsers = Array.from(clients.values());

    // Merge users: prefer connected users' status over database status
    const userMap = new Map<string, User>();

    // Add database users first
    dbUsers.forEach(user => userMap.set(user.id, {
      ...user,
      status: user.status as User['status'] // Type assertion for status
    }));

    // Override with connected users (they have the most current status)
    connectedUsers.forEach(user => userMap.set(user.id, user));

    // Convert to array and filter out offline users
    const userList = Array.from(userMap.values()).filter(user => user.status !== 'offline');

    const message = JSON.stringify({
      type: 'USER_LIST',
      payload: userList,
    });

    clients.forEach((_, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  } catch (error) {
    console.error('Failed to fetch user list from database:', error);
  }
};

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'LOGIN': {
          const { username, status, avatar, personalMessage } = data.payload;
          const user: User = {
            id: randomUUID(),
            username,
            status: status || 'online',
            avatar,
            personalMessage
          };
          
          try {
            // Insert or update user in database
            await db.execute({
              sql: `
                INSERT INTO users (id, username, status, avatar, personal_message)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (username) DO UPDATE SET
                  status = excluded.status,
                  avatar = excluded.avatar,
                  personal_message = excluded.personal_message
              `,
              args: [user.id, user.username, user.status, user.avatar || null, user.personalMessage || null]
            });
          } catch (error) {
            console.error('Failed to save user to database:', error);
          }
          
          clients.set(ws, user);
          
          // Send back the created user object to the client so they know their ID
          ws.send(JSON.stringify({
            type: 'LOGIN_SUCCESS',
            payload: user
          }));

          await broadcastUserList();
          break;
        }

        case 'STATUS_CHANGE': {
          const user = clients.get(ws);
          if (user) {
            const { status, personalMessage } = data.payload;
            if (status) user.status = status;
            if (personalMessage !== undefined) user.personalMessage = personalMessage;
            
            try {
              await db.execute({
                sql: 'UPDATE users SET status = ?, personal_message = ? WHERE id = ?',
                args: [user.status, user.personalMessage || null, user.id]
              });
            } catch (error) {
              console.error('Failed to update user status in database:', error);
            }
            
            clients.set(ws, user);
            await broadcastUserList();
          }
          break;
        }

        case 'PRIVATE_MESSAGE': {
          const user = clients.get(ws);
          if (user) {
            const { targetId, text, type } = data.payload;
            const msgPayload = {
              id: randomUUID(),
              senderId: user.id,
              targetId,
              text,
              timestamp: Date.now(),
              type: type || 'text'
            };

            try {
              // Save message to database
              await db.execute({
                sql: 'INSERT INTO messages (id, sender_id, target_id, text, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                args: [msgPayload.id, msgPayload.senderId, msgPayload.targetId, msgPayload.text, msgPayload.type, msgPayload.timestamp]
              });
            } catch (error) {
              console.error('Failed to save message to database:', error);
            }

            // Find target socket
            let targetWs: WebSocket | undefined;
            for (const [clientWs, clientUser] of clients.entries()) {
              if (clientUser.id === targetId) {
                targetWs = clientWs;
                break;
              }
            }

            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: 'PRIVATE_MESSAGE',
                payload: msgPayload
              }));
            }
            
            // Also send back to sender for confirmation/consistency
            ws.send(JSON.stringify({
              type: 'PRIVATE_MESSAGE',
              payload: msgPayload
            }));
          }
          break;
        }

        case 'NUDGE': {
          const user = clients.get(ws);
          if (user) {
            const { targetId } = data.payload;
            // Find target socket
            let targetWs: WebSocket | undefined;
            for (const [clientWs, clientUser] of clients.entries()) {
              if (clientUser.id === targetId) {
                targetWs = clientWs;
                break;
              }
            }

            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: 'NUDGE',
                payload: { senderId: user.id }
              }));
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  ws.on('close', async () => {
    if (clients.has(ws)) {
      const user = clients.get(ws)!;
      try {
        await db.execute({
          sql: 'UPDATE users SET status = ? WHERE id = ?',
          args: ['offline', user.id]
        });
      } catch (error) {
        console.error('Failed to update user status to offline:', error);
      }
      
      clients.delete(ws);
      await broadcastUserList();
      console.log('Client disconnected');
    }
  });
});

async function startServer() {
  // Initialize database tables
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'offline',
        avatar TEXT,
        personal_message TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (sender_id) REFERENCES users (id),
        FOREIGN KEY (target_id) REFERENCES users (id)
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static('dist'));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
