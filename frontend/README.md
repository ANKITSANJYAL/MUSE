# 🖥️ Muse Frontend

The frontend for Project Muse is built with **Next.js** and provides a responsive, real-time interface for interacting with the creative agent.

## 🛠️ Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env.local` file in this directory:
   ```env
   NEXT_PUBLIC_BACKEND_URL=ws://localhost:8000/ws
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Key Components

- `src/app/page.tsx`: Main entry point for the chat/creative interface.
- `src/components/ChatPanel.tsx`: Handles real-time communication and UI feedback.
- `src/lib/audio`: Utilities for raw PCM audio processing and streaming.

## 🚀 Production Deployment

This frontend is optimized for deployment on **Vercel** or containerized via the included `Dockerfile` for **Google Cloud Run**.
