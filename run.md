🚀 How to Run the App Locally

You Need 2 Terminals Running Simultaneously

---

Terminal 1: Start Cloudflare Worker (Backend)

Open your first terminal and run:

npm run worker:dev

What you should see:
⛅️ wrangler 4.x.x

---

⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787

✅ This terminal MUST stay open - it's your WebSocket and API server

---

Terminal 2: Start Next.js App (Frontend)

Open a second terminal (keep the first one running!) and run:

npm run dev

What you should see:
▲ Next.js 16.0.0

- Local: http://localhost:3000
  ✓ Starting...
  ✓ Ready in 2.3s

✅ Keep this terminal open too

---

🌐 Access the Application

Open your browser and go to:
http://localhost:3000

---

🧪 Testing the Full Flow

Test with a Single User (Basic Test)

1. Open http://localhost:3000
2. Fill in the registration form:


    - Username: "Test User"
    - Mood: Select any mood (e.g., "Friend Chat")
    - Interests: Click multiple interests (e.g., Tech, Gaming, Movies)
    - Avatar: Try different styles and click "Regenerate"

3. Click "Enter the Globe"
4. Allow location access when prompted (REQUIRED!)
5. You should see the 3D globe with your user marker

Test with Multiple Users (Full Chat Test)

To test the real-time chat feature, you need multiple users:

Option 1: Multiple Browser Windows

1. Open http://localhost:3000 in 2 different browser windows
2. Register as different users in each window
3. Both users should appear on the globe
4. Click on the other user's marker to send a chat request
5. Accept the request in the other window
6. Start chatting!

Option 2: Different Browsers

1. Open Chrome: http://localhost:3000 - Register as "User 1"
2. Open Firefox: http://localhost:3000 - Register as "User 2"
3. Both should see each other on the globe
4. Test the chat functionality

Option 3: Incognito Mode

1. Normal window: Register as "User 1"
2. Incognito window: Register as "User 2"
3. Test chat between them

---

✅ Verification Checklist

Make sure:

- Both terminals are running (worker on 8787, Next.js on 3000)
- You allowed location access in browser
- You can see the 3D globe
- Your user marker appears on the globe
- With multiple users, you can see all online users
- Chat requests work between users
- P2P chat messages are delivered

---

🐛 Troubleshooting

If the globe doesn't load:

- Check Terminal 1 - Worker must be running on port 8787
- Check browser console for errors (F12)

If you don't see other users:

- Make sure both users completed registration
- Check that both allowed location access
- Refresh the page

If chat doesn't connect:

- Wait a few seconds for WebRTC connection
- Check browser console for WebRTC errors
- Make sure both users are on the same local network

---

🎯 What to Expect

1. Registration Page: Beautiful form with avatar selection
2. Location Permission: Browser will ask for location
3. Globe View: Rotating 3D Earth with user markers
4. Online Users: See count in left sidebar
5. Chat Requests: Receive notifications when someone wants to chat
6. P2P Chat: Direct messaging with another user
