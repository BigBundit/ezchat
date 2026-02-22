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
