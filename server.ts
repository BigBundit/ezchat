import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { randomUUID } from 'crypto';

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

// Store connected clients: Map<WebSocket, User>
const clients = new Map<WebSocket, User>();

// Broadcast user list to all connected clients
const broadcastUserList = () => {
  const userList = Array.from(clients.values());
  const message = JSON.stringify({
    type: 'USER_LIST',
    payload: userList,
  });

  clients.forEach((_, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
};

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
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
          
          clients.set(ws, user);
          
          // Send back the created user object to the client so they know their ID
          ws.send(JSON.stringify({
            type: 'LOGIN_SUCCESS',
            payload: user
          }));

          broadcastUserList();
          break;
        }

        case 'STATUS_CHANGE': {
          const user = clients.get(ws);
          if (user) {
            const { status, personalMessage } = data.payload;
            if (status) user.status = status;
            if (personalMessage !== undefined) user.personalMessage = personalMessage;
            clients.set(ws, user);
            broadcastUserList();
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

  ws.on('close', () => {
    if (clients.has(ws)) {
      clients.delete(ws);
      broadcastUserList();
      console.log('Client disconnected');
    }
  });
});

async function startServer() {
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
