# QC Community — Help & Support Web App

## Overview
A full-stack community help and support platform built with **Vite + React** and **Tailwind CSS**, backed by **Firebase**. Designed for the Quezon City community to connect, request help, and offer support.

## Tech Stack
- **Frontend**: Vite 5, React 18, React Router 6, Tailwind CSS 3
- **UI Icons**: Lucide React
- **Utilities**: date-fns, clsx
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Package Manager**: pnpm

## Project Structure
```
src/
├── main.jsx            # Entry point
├── App.jsx             # Router + providers
├── firebase.js         # Firebase config (env vars)
├── index.css           # Tailwind + global styles
├── context/
│   ├── AuthContext.jsx # Firebase auth + demo mode
│   └── ThemeContext.jsx# Dark/light mode
├── data/
│   └── demoData.js     # Demo content (runs without Firebase)
├── components/
│   ├── Navbar.jsx
│   ├── Hero.jsx
│   ├── QuickActions.jsx
│   ├── Categories.jsx
│   ├── CommunityFeed.jsx
│   ├── PostCard.jsx
│   ├── CreatePost.jsx
│   ├── CommunityUpdates.jsx
│   ├── ActiveVolunteers.jsx
│   └── NotificationBell.jsx
└── pages/
    ├── Home.jsx
    ├── Login.jsx
    ├── SignUp.jsx
    ├── GetHelp.jsx
    ├── GiveHelp.jsx
    ├── Resources.jsx
    ├── Messages.jsx
    └── Profile.jsx
```

## Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password, Google, Facebook)
3. Enable Firestore Database
4. Enable Storage
5. Copy `.env.example` to `.env` and fill in your Firebase credentials:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## Demo Mode
Without Firebase configured, the app runs in demo mode with pre-loaded sample content. Login uses a demo user account automatically.

## Firestore Data Structure
- `users/{uid}`: uid, name, email, avatar, location, createdAt
- `posts/{postId}`: uid, userName, userAvatar, content, category, imageURL, likes, commentCount, createdAt
- `helpRequests/{requestId}`: uid, title, description, category, location, status, createdAt
- `chats/{chatId}`: participants, messages

## Dev Server
- Host: 0.0.0.0
- Port: 5000
- Command: `pnpm run dev`

## Deployment
- Vercel-ready (Vite build, env vars via VITE_ prefix)
- Build command: `pnpm run build`
- Output: `dist/`
