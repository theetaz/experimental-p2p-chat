# Globe Chat - Real-time P2P Chat Application

A location-based, ephemeral peer-to-peer chat application with a beautiful 3D globe visualization. Connect with people around the world in real-time without storing any personal data.

## Features

- **No Personal Data**: No email, no passwords - just a username and you're in
- **Location-Based**: See online users on an interactive 3D globe
- **Ephemeral Sessions**: All data is cleared when you log out
- **P2P Chat**: Direct peer-to-peer messaging using WebRTC
- **Real-time Updates**: Live user presence and chat requests via WebSockets
- **Beautiful Avatars**: Multiple avatar styles using DiceBear
- **Mood & Interests**: Express yourself and find like-minded people

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS v4** - Modern styling
- **Three.js + React Three Fiber** - 3D globe visualization
- **Zustand** - State management
- **WebRTC** - Peer-to-peer communication

### Backend
- **Cloudflare Workers** - Serverless edge computing
- **Durable Objects** - Stateful coordination and user management
- **WebSockets** - Real-time communication

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Cloudflare account (for deploying workers)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd realtime-chat-app
```

2. Install dependencies
```bash
npm install
```

### Running Locally

You'll need to run both the Next.js app and the Cloudflare Worker:

#### 1. Start the Cloudflare Worker (in one terminal)
```bash
npm run worker:dev
```
This will start the worker at `http://localhost:8787`

#### 2. Start the Next.js app (in another terminal)
```bash
npm run dev
```
This will start the app at `http://localhost:3000`

#### 3. Open your browser
Navigate to `http://localhost:3000` and:
- Enter a username
- Select your mood (Coffee, Friend Chat, Movie Night, etc.)
- Choose your interests
- Pick an avatar style
- Allow location access
- Start connecting!

## Project Structure

```
.
├── app/
│   ├── page.tsx           # Registration page
│   ├── globe/page.tsx     # 3D globe with online users
│   └── chat/page.tsx      # P2P chat interface
├── components/
│   ├── registration-form.tsx
│   ├── globe-3d.tsx
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── types.ts           # TypeScript types
│   ├── constants.ts       # Moods, interests, etc.
│   ├── store.ts           # Zustand state management
│   ├── utils.ts           # Utility functions
│   ├── websocket.ts       # WebSocket hook
│   └── webrtc.ts          # WebRTC hook
└── workers/
    └── src/
        ├── index.ts       # Worker entry point
        └── user-manager.ts # Durable Object
```

## How It Works

1. **Registration**: User enters username, selects mood, interests, and avatar
2. **Location**: Browser requests location permission (required)
3. **Globe View**: User sees all online users on an interactive 3D globe
4. **Connect**: Click on any user to send a chat request
5. **Chat**: Once accepted, establish a P2P WebRTC connection
6. **Privacy**: All messages are peer-to-peer, nothing is stored

## Architecture

```
User Registration → Session Storage (Client)
         ↓
Location Access → WebSocket → Durable Object
         ↓
    Globe View (All Online Users)
         ↓
Chat Request → WebSocket → Target User
         ↓
Accepted → WebRTC Signaling → P2P Connection
         ↓
    Direct P2P Chat (No Server)
```

## Deployment

### Deploy Cloudflare Worker
```bash
npm run worker:deploy
```

### Deploy Next.js App
The Next.js app can be deployed to Vercel, Netlify, or any platform supporting Next.js:

1. Update environment variables:
   - `NEXT_PUBLIC_API_URL` - Your deployed worker URL
   - `NEXT_PUBLIC_WS_URL` - Your deployed worker WebSocket URL

2. Deploy to Vercel:
```bash
vercel deploy
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=https://your-worker.workers.dev
NEXT_PUBLIC_WS_URL=wss://your-worker.workers.dev
```

## Features Breakdown

### Moods
- Coffee Chat ☕
- Friend Chat 💬
- Movie Night 🎬
- Gaming 🎮
- Study Buddy 📚
- Just Talking 🗣️

### Interests
- Music 🎵
- Sports ⚽
- Technology 💻
- Movies 🎬
- Books 📚
- Gaming 🎮
- Art 🎨
- Travel ✈️
- Food 🍕
- Fitness 💪

## Privacy & Security

- **No Data Persistence**: User data is never stored on servers
- **Ephemeral Sessions**: Sessions exist only in browser sessionStorage
- **P2P Messaging**: Messages go directly between peers via WebRTC
- **Location Privacy**: Location is only used for globe visualization
- **No Authentication**: No emails, passwords, or personal information collected

## Browser Requirements

- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Location services enabled
- JavaScript enabled
- WebSocket support

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
