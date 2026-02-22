<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EzChat - Real-time Chat Application

This is a MSN Messenger-style chat application with polling-based real-time communication.

## Features
- **Polling-based real-time chat** - Updates every 2 seconds instead of WebSocket
- **User status management** - Online, busy, away, offline
- **Persistent chat history** - Messages stored in Turso database
- **Multiple chat windows** - Chat with multiple users simultaneously
- **Nudge notifications** - Send attention-grabbing notifications

## Architecture
- **Frontend**: React + TypeScript + Vite (deployed on Vercel)
- **Backend**: Node.js + Express + TypeScript (deployed on Render/Railway)
- **Database**: Turso (SQLite-compatible distributed database)
- **Communication**: HTTP polling every 2 seconds (no WebSocket)

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set up Turso database:
   - Sign up at [turso.tech](https://turso.tech)
   - Create a new database
   - Generate an auth token
   - Copy `.env.example` to `.env` and fill in your Turso credentials:
     ```
     TURSO_DATABASE_URL=libsql://your-database.turso.io
     TURSO_AUTH_TOKEN=your-auth-token-here
     ```
3. Run the app:
   `npm run dev`

## Deploy to Production

### Backend (Render/Railway)
1. Create an account on [Render](https://render.com) or [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables:
   ```
   TURSO_DATABASE_URL=libsql://your-database.turso.io
   TURSO_AUTH_TOKEN=your-auth-token-here
   ```
6. Deploy and get your backend URL (e.g., `https://your-app.onrender.com`)

### Frontend (Vercel)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variable in Vercel dashboard:
   ```
   VITE_API_URL=https://your-backend-url
   ```
4. Vercel will automatically build and deploy the frontend

## API Endpoints

- `POST /api/login` - User login
- `GET /api/users` - Get online users
- `POST /api/status` - Update user status
- `POST /api/message` - Send message
- `GET /api/messages` - Get new messages (polling)
- `POST /api/logout` - User logout

## How Polling Works

Instead of WebSocket connections, the frontend polls the backend every 2 seconds:
1. **User polling**: Fetches current online users
2. **Message polling**: Fetches new messages since last poll
3. **Real-time feel**: Updates happen automatically without user interaction

This approach is simpler to deploy and works reliably across different hosting platforms.
   ```
7. Redeploy the frontend in Vercel

The app will now work with persistent data storage and real-time chat functionality.
