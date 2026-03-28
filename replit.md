# QC Community — Help & Support Web App

## Overview
A full-stack community help and support platform built with **Vite + React** and **Tailwind CSS**, fully backed by **Firebase** (Firestore real-time, Auth, Storage). No demo mode — requires Firebase to run.

## Tech Stack
- **Frontend**: Vite 5, React 18, React Router 6, Tailwind CSS 3
- **Icons**: Lucide React
- **Utilities**: date-fns, clsx
- **Backend**: Firebase (Auth, Firestore real-time, Storage)
- **Package Manager**: pnpm

## Project Structure
```
src/
├── main.jsx
├── App.jsx             # Shows FirebaseSetup if env vars missing, else full app
├── firebase.js         # Firebase init (isConfigured export)
├── index.css
├── context/
│   ├── AuthContext.jsx # Firebase Auth (email, Google, Facebook)
│   └── ThemeContext.jsx
├── components/
│   ├── Navbar.jsx
│   ├── Hero.jsx
│   ├── QuickActions.jsx
│   ├── Categories.jsx
│   ├── CommunityFeed.jsx   # onSnapshot real-time
│   ├── PostCard.jsx         # onSnapshot comments
│   ├── CommunityUpdates.jsx # onSnapshot from /communityUpdates
│   ├── ActiveVolunteers.jsx # onSnapshot from /volunteers
│   ├── NotificationBell.jsx # onSnapshot from /notifications
│   ├── CreatePost.jsx
│   └── FirebaseSetup.jsx   # Shown when not configured
└── pages/
    ├── Home.jsx
    ├── Login.jsx
    ├── SignUp.jsx
    ├── GetHelp.jsx     # onSnapshot /helpRequests
    ├── GiveHelp.jsx    # onSnapshot /volunteers + /helpRequests
    ├── Resources.jsx
    ├── Messages.jsx    # onSnapshot real-time chat
    └── Profile.jsx     # onSnapshot user's own posts/requests
```

## Firestore Collections
| Collection | Purpose |
|---|---|
| `users` | User profiles |
| `posts` | Community posts |
| `posts/{id}/comments` | Post comments (subcollection) |
| `helpRequests` | Help request submissions |
| `chats` | Chat room metadata |
| `chats/{id}/messages` | Chat messages (subcollection) |
| `notifications` | User notifications |
| `volunteers` | Registered volunteers |
| `communityUpdates` | Admin-posted updates |

## Firebase Setup (via Shell)
```bash
echo "VITE_FIREBASE_API_KEY=your_value" >> .env
echo "VITE_FIREBASE_AUTH_DOMAIN=your_value" >> .env
echo "VITE_FIREBASE_PROJECT_ID=your_value" >> .env
echo "VITE_FIREBASE_STORAGE_BUCKET=your_value" >> .env
echo "VITE_FIREBASE_MESSAGING_SENDER_ID=your_value" >> .env
echo "VITE_FIREBASE_APP_ID=your_value" >> .env
kill 1   # restart to pick up env vars
```

## Authentication
- Email + Password
- Google OAuth
- Facebook OAuth
- All require Firebase Auth to be configured

## Dev Server
- Host: 0.0.0.0, Port: 5000
- Command: `pnpm run dev`

## Deployment
- Static site deployment (Vite SPA)
- Build: `pnpm run build` → outputs `dist/`
- Vercel: set all `VITE_*` env vars in Vercel project settings
