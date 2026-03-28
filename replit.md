# QC Community — Help & Support Web App

## Overview
A full-stack community help and support platform built with **Vite + React** and **Tailwind CSS**, fully backed by **Firebase** (Firestore real-time, Auth, Storage). Features an interactive map with real-time location, nearby help requests, directions, and Quezon City place discovery.

## Tech Stack
- **Frontend**: Vite 5, React 18, React Router 6, Tailwind CSS 3
- **Map**: Leaflet 1.9 + react-leaflet 4.2 (OpenStreetMap/CartoDB tiles)
- **Routing**: OSRM public API for directions
- **Geocoding**: Nominatim (OpenStreetMap, free reverse geocoding)
- **Icons**: Lucide React
- **Utilities**: date-fns, clsx
- **Backend**: Firebase (Auth, Firestore real-time, Storage)
- **Package Manager**: npm

## Project Structure
```
src/
├── main.jsx
├── App.jsx             # Shows FirebaseSetup if env vars missing, else full app
├── firebase.js         # Firebase init (isConfigured export)
├── index.css           # Tailwind + Leaflet CSS overrides
├── data/
│   └── qcPlaces.js     # QC police/hospital/donation/community place data + utils
├── hooks/
│   └── useGeolocation.js  # Browser Geolocation + Nominatim reverse geocoding
├── context/
│   ├── AuthContext.jsx    # Firebase Auth (email, Google, Facebook) + location fields
│   ├── ThemeContext.jsx   # Dark/light toggle (default: dark)
│   └── LocationContext.jsx # App-wide geolocation state provider
├── components/
│   ├── Navbar.jsx           # Sticky nav with Map link
│   ├── Hero.jsx
│   ├── QuickActions.jsx
│   ├── Categories.jsx
│   ├── CommunityFeed.jsx    # onSnapshot real-time
│   ├── PostCard.jsx
│   ├── CommunityUpdates.jsx
│   ├── ActiveVolunteers.jsx
│   ├── NotificationBell.jsx
│   ├── CreatePost.jsx
│   ├── LocationPicker.jsx   # Mini Leaflet map for profile location editing
│   ├── NearbyHelp.jsx       # Home sidebar — requests within 8km of user
│   └── FirebaseSetup.jsx
└── pages/
    ├── Home.jsx        # Includes NearbyHelp sidebar
    ├── Login.jsx
    ├── SignUp.jsx
    ├── GetHelp.jsx     # Saves lat/lng, distance filter, "Use my location" button
    ├── GiveHelp.jsx
    ├── Resources.jsx
    ├── Messages.jsx
    ├── Profile.jsx     # Location editor with mini-map + QC badge
    └── MapView.jsx     # Full interactive map: places, directions, help requests
```

## Map Features
- **Interactive Leaflet map** centered on Quezon City
- **Dark/light tiles** using CartoDB (matches app theme)
- **Place markers**: police (blue), hospitals (red), donation centers (green), community centers (amber)
- **20 QC places** pre-loaded with addresses and phone numbers
- **Directions**: click a place → OSRM draws route, shows distance & ETA
- **Help request markers** from Firebase (amber dots)
- **Auto location detect**: browser Geolocation API with permission check
- **Reverse geocoding**: Nominatim returns barangay + city
- **QC boundary check**: warns if user is "Outside QC"
- **Desktop**: 380px sidebar + full-height map
- **Mobile**: full-screen map + slide-up bottom sheet

## Location Fields in Firebase
All three main collections now include location data:
| Collection | Location Fields |
|---|---|
| `users` | `lat`, `lng`, `barangay`, `city`, `isQC`, `location` (string) |
| `helpRequests` | `lat`, `lng`, `barangay`, `city`, `location` (string) |
| `posts` | `userLocation` (string) |

## Firestore Collections
| Collection | Purpose |
|---|---|
| `users` | User profiles with location |
| `posts` | Community posts |
| `posts/{id}/comments` | Post comments (subcollection) |
| `helpRequests` | Help request submissions with coordinates |
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

## Default Theme
Dark mode by default (easy on eyes). User can toggle to light mode via the sun/moon button in the navbar.

## Deployment
- Static SPA deployment with Vercel
- `vercel.json` configured for SPA routing (all routes → index.html)
- Build: `npm run build` → outputs `dist/`
- Vercel: set all `VITE_*` env vars in Vercel project settings
- No API keys required for map (OpenStreetMap/CartoDB/OSRM are free)
- Optional: add `VITE_MAPBOX_TOKEN` if switching to Mapbox tiles
