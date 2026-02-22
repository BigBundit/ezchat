import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { randomUUID } from 'crypto';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface User {
  id: string;
  username: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  avatar?: string;
  personalMessage?: string;
}

const app = express();
const server = createServer(app);
// const wss = new WebSocketServer({ server }); // Commented out for polling

const PORT = 3000;

// Initialize Turso database client
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Store connected clients: Map<WebSocket, User> - commented out for polling
// const clients = new Map<WebSocket, User>();

// Store users in memory for polling
const connectedUsers = new Map<string, User>();

// Middleware
app.use(express.json());

// API Routes for Polling

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, status, avatar, personalMessage } = req.body;

    const user: User = {
      id: randomUUID(),
      username,
      status: status || 'online',
      avatar,
      personalMessage
    };

    // Save to database
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

    // Store in memory
    connectedUsers.set(user.id, user);

    res.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Get users endpoint
app.get('/api/users', async (req, res) => {
  try {
    // Get users from database
    const result = await db.execute('SELECT id, username, status, avatar, personal_message as personalMessage FROM users');
    const dbUsers = result.rows.map(row => ({
      id: row.id as string,
      username: row.username as string,
      status: row.status as string,
      avatar: row.avatar as string | undefined,
      personalMessage: row.personalMessage as string | undefined,
    }));

    // Merge with connected users (prefer connected users' status)
    const userMap = new Map<string, User>();

    // Add database users first
    dbUsers.forEach(user => userMap.set(user.id, {
      ...user,
      status: user.status as User['status']
    }));

    // Override with connected users
    connectedUsers.forEach(user => userMap.set(user.id, user));

    // Convert to array and filter out offline users
    const userList = Array.from(userMap.values()).filter(user => user.status !== 'offline');

    res.json({ success: true, users: userList });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

// Update status endpoint
app.post('/api/status', async (req, res) => {
  try {
    const { userId, status, personalMessage } = req.body;

    if (!connectedUsers.has(userId)) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = connectedUsers.get(userId)!;
    if (status) user.status = status;
    if (personalMessage !== undefined) user.personalMessage = personalMessage;

    // Update database
    await db.execute({
      sql: 'UPDATE users SET status = ?, personal_message = ? WHERE id = ?',
      args: [user.status, user.personalMessage || null, user.id]
    });

    connectedUsers.set(userId, user);

    res.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// Send message endpoint
app.post('/api/message', async (req, res) => {
  try {
    const { senderId, targetId, text, type } = req.body;

    if (!connectedUsers.has(senderId)) {
      return res.status(404).json({ success: false, error: 'Sender not found' });
    }

    const msgPayload = {
      id: randomUUID(),
      senderId,
      targetId,
      text,
      timestamp: Date.now(),
      type: type || 'text'
    };

    // Save to database
    await db.execute({
      sql: 'INSERT INTO messages (id, sender_id, target_id, text, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      args: [msgPayload.id, msgPayload.senderId, msgPayload.targetId, msgPayload.text, msgPayload.type, msgPayload.timestamp]
    });

    res.json({ success: true, message: msgPayload });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Get messages endpoint (for polling)
app.get('/api/messages', async (req, res) => {
  try {
    const { userId, since = 0 } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'userId required and must be string' });
    }

    const sinceTimestamp = typeof since === 'string' ? parseInt(since) : 0;

    // Get messages since timestamp
    const result = await db.execute({
      sql: 'SELECT id, sender_id, target_id, text, type, timestamp FROM messages WHERE (sender_id = ? OR target_id = ?) AND timestamp > ? ORDER BY timestamp ASC',
      args: [userId, userId, sinceTimestamp]
    });

    const messages = result.rows.map(row => ({
      id: row.id as string,
      senderId: row.sender_id as string,
      targetId: row.target_id as string,
      text: row.text as string,
      timestamp: row.timestamp as number,
      type: row.type as string
    }));

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// Logout endpoint
app.post('/api/logout', async (req, res) => {
  try {
    const { userId } = req.body;

    if (connectedUsers.has(userId)) {
      const user = connectedUsers.get(userId)!;
      user.status = 'offline';

      // Update database
      await db.execute({
        sql: 'UPDATE users SET status = ? WHERE id = ?',
        args: ['offline', user.id]
      });

      connectedUsers.delete(userId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Failed to logout' });
  }
});

// Broadcast user list to all connected clients - commented out for polling
// const broadcastUserList = async () => {
//   try {
//     // Get users from database (persistent users)
//     const result = await db.execute('SELECT id, username, status, avatar, personal_message as personalMessage FROM users');
//     const dbUsers = result.rows.map(row => ({
//       id: row.id as string,
//       username: row.username as string,
//       status: row.status as string,
//       avatar: row.avatar as string | undefined,
//       personalMessage: row.personalMessage as string | undefined,
//     }));

//     // Get currently connected users from memory
//     const connectedUsers = Array.from(clients.values());

//     // Merge users: prefer connected users' status over database status
//     const userMap = new Map<string, User>();

//     // Add database users first
//     dbUsers.forEach(user => userMap.set(user.id, {
//       ...user,
//       status: user.status as User['status'] // Type assertion for status
//     }));

//     // Override with connected users (they have the most current status)
//     connectedUsers.forEach(user => userMap.set(user.id, user));

//     // Convert to array and filter out offline users
//     const userList = Array.from(userMap.values()).filter(user => user.status !== 'offline');

//     const message = JSON.stringify({
//       type: 'USER_LIST',
//       payload: userList,
//     });

//     clients.forEach((_, ws) => {
//       if (ws.readyState === WebSocket.OPEN) {
//         ws.send(message);
//       }
//     });
//   } catch (error) {
//     console.error('Failed to fetch user list from database:', error);
//   }
// };

// WebSocket server setup - commented out for polling
// wss.on('connection', (ws) => {
//   console.log('Client connected');

//   ws.on('message', async (message) => {
//     try {
//       const data = JSON.parse(message.toString());
      
//       switch (data.type) {
//         case 'LOGIN': {
//           const { username, status, avatar, personalMessage } = data.payload;
//           const user: User = {
//             id: randomUUID(),
//             username,
//             status: status || 'online',
//             avatar,
//             personalMessage
//           };
          
//           try {
//             // Insert or update user in database
//             await db.execute({
//               sql: `
//                 INSERT INTO users (id, username, status, avatar, personal_message)
//                 VALUES (?, ?, ?, ?, ?)
//                 ON CONFLICT (username) DO UPDATE SET
//                   status = excluded.status,
//                   avatar = excluded.avatar,
//                   personal_message = excluded.personal_message
//               `,
//               args: [user.id, user.username, user.status, user.avatar || null, user.personalMessage || null]
//             });
//           } catch (error) {
//             console.error('Failed to save user to database:', error);
//           }
          
//           clients.set(ws, user);
          
//           // Send back the created user object to the client so they know their ID
//           ws.send(JSON.stringify({
//             type: 'LOGIN_SUCCESS',
//             payload: user
//           }));

//           await broadcastUserList();
//           break;
//         }

//         case 'STATUS_CHANGE': {
//           const user = clients.get(ws);
//           if (user) {
//             const { status, personalMessage } = data.payload;
//             if (status) user.status = status;
//             if (personalMessage !== undefined) user.personalMessage = personalMessage;
            
//             try {
//               await db.execute({
//                 sql: 'UPDATE users SET status = ?, personal_message = ? WHERE id = ?',
//                 args: [user.status, user.personalMessage || null, user.id]
//               });
//             } catch (error) {
//               console.error('Failed to update user status in database:', error);
//             }
            
//             clients.set(ws, user);
//             await broadcastUserList();
//           }
//           break;
//         }

//         case 'PRIVATE_MESSAGE': {
//           const user = clients.get(ws);
//           if (user) {
//             const { targetId, text, type } = data.payload;
//             const msgPayload = {
//               id: randomUUID(),
//               senderId: user.id,
//               targetId,
//               text,
//               timestamp: Date.now(),
//               type: type || 'text'
//             };

//             try {
//               // Save message to database
//               await db.execute({
//                 sql: 'INSERT INTO messages (id, sender_id, target_id, text, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
//                 args: [msgPayload.id, msgPayload.senderId, msgPayload.targetId, msgPayload.text, msgPayload.type, msgPayload.timestamp]
//               });
//             } catch (error) {
//               console.error('Failed to save message to database:', error);
//             }

//             // Find target socket
//             let targetWs: WebSocket | undefined;
//             for (const [clientWs, clientUser] of clients.entries()) {
//               if (clientUser.id === targetId) {
//                 targetWs = clientWs;
//                 break;
//               }
//             }

//             if (targetWs && targetWs.readyState === WebSocket.OPEN) {
//               targetWs.send(JSON.stringify({
//                 type: 'PRIVATE_MESSAGE',
//                 payload: msgPayload
//               }));
//             }
            
//             // Also send back to sender for confirmation/consistency
//             ws.send(JSON.stringify({
//               type: 'PRIVATE_MESSAGE',
//               payload: msgPayload
//             }));
//           }
//           break;
//         }

//         case 'NUDGE': {
//           const user = clients.get(ws);
//           if (user) {
//             const { targetId } = data.payload;
//             // Find target socket
//             let targetWs: WebSocket | undefined;
//             for (const [clientWs, clientUser] of clients.entries()) {
//               if (clientUser.id === targetId) {
//                 targetWs = clientWs;
//                 break;
//               }
//             }

//             if (targetWs && targetWs.readyState === WebSocket.OPEN) {
//               targetWs.send(JSON.stringify({
//                 type: 'NUDGE',
//                 payload: { senderId: user.id }
//               }));
//             }
//           }
//           break;
//         }
//       }
//     } catch (e) {
//       console.error('Error parsing message:', e);
//     }
//   });

//   ws.on('close', async () => {
//     if (clients.has(ws)) {
//       const user = clients.get(ws)!;
//       try {
//         await db.execute({
//           sql: 'UPDATE users SET status = ? WHERE id = ?',
//           args: ['offline', user.id]
//         });
//       } catch (error) {
//         console.error('Failed to update user status to offline:', error);
//       }
      
//       clients.delete(ws);
//       await broadcastUserList();
//       console.log('Client disconnected');
//     }
//   });
// });

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
