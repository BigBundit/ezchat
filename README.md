<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/91f9931f-59a5-467b-9613-3ed74e43558f

## Run Locally

**Prerequisites:**  Node.js

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
3. Set the `GEMINI_API_KEY` in [.env](.env) to your Gemini API key
4. Run the app:
   `npm run dev`

## Deploy to Production

### Frontend (Vercel)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Vercel will automatically build and deploy the frontend

### Backend (Railway/Render/Heroku)
1. Create an account on [Railway](https://railway.app) or [Render](https://render.com)
2. Connect your GitHub repository
3. Set environment variables in your hosting service:
   ```
   TURSO_DATABASE_URL=libsql://your-database.turso.io
   TURSO_AUTH_TOKEN=your-auth-token-here
   GEMINI_API_KEY=your-gemini-api-key
   ```
4. Deploy the backend
5. Copy the backend URL (e.g., `https://your-app.onrender.com`)
6. In Vercel, add environment variable:
   ```
   VITE_WS_URL=wss://your-app.onrender.com
   ```
7. Redeploy the frontend in Vercel

The app will now work with persistent data storage and real-time chat functionality.
