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
| `users` | User profiles with location, role (member/admin/banned) |
| `posts` | Community posts (editable/deletable by owner or admin) |
| `posts/{id}/comments` | Post comments (subcollection) |
| `helpRequests` | Help request submissions with coordinates |
| `chats` | Chat room metadata |
| `chats/{id}/messages` | Chat messages (subcollection) |
| `notifications` | User notifications |
| `volunteers` | Registered volunteers |
| `communityUpdates` | Admin-posted updates |
| `reports` | User-submitted content reports (admin-managed) |

## Admin System
- Admin access: user has `role === 'admin'` in Firestore OR their UID matches `VITE_ADMIN_UID` env var
- Admin env var takes priority and auto-promotes the user in Firestore on login
- Banned users (`role === 'banned'`) are automatically signed out on next load
- Admin panel has sidebar layout with: Overview, Help Requests, Community Updates, Users, Posts, Reports
- Admin can: delete any post, promote/demote admins, ban users, resolve reports

## Post Management
- Post owners see a 3-dot menu on their posts with Edit / Delete options
- Admins see the 3-dot menu on all posts
- Edit mode opens inline textarea; save updates Firestore in real-time
- Deleted posts are removed from Firestore immediately

## Location Detection
- Primary: Browser GPS with `enableHighAccuracy: true`
- Fallback 1: Browser GPS with lower accuracy if high-accuracy fails
- Fallback 2: IP-based location via ipapi.co or ip-api.com if GPS unavailable
- When IP-based, shows "Approximate (IP-based)" label in LocationPicker
- Reverse geocoding via Nominatim returns barangay, city, province
- Outside QC shows real detected city, not forced "Quezon City"

## Firebase Security Rules
- `firestore.rules` contains full rule set for deployment
- Users can only edit/delete their own posts and requests
- Admin UID has full access to all collections
- Banned users cannot create any content
- Reports collection is read/write by admin only

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

## Cloudinary Image Upload
- Cloud Name: `de5zfe8tn`, Upload Preset: `portfolio`, Folder: `qc-community`
- Unsigned upload directly from browser to Cloudinary (no backend needed)
- `src/services/cloudinary.js` — upload function with XHR progress tracking
- `src/components/ImageUpload.jsx` — reusable component with drag-drop, preview, progress bar
- Avatar uploads use `w_200,h_200,c_fill,g_face` transformation for face-focused crops
- Post/request images use `f_auto,q_auto,w_1200` for auto-optimized delivery
- **Avatar upload**: Camera button on profile page, triggers file picker, uploads and saves URL to Firestore
- **Post image upload**: Image icon in CreatePost expands to upload inline before posting
- **Help request image**: Optional drag-drop upload in the help request form

## Chat System (Messages)
- Real-time 1-on-1 chat using Firestore subcollections
- Unread badge on Messages icon in Navbar (counts chats with new messages from others)
- Unread bold styling in chat list for conversations with unseen messages
- Grouped chat bubbles — consecutive messages from same user are visually grouped
- Message notifications sent to recipient via `notifications` collection on every send
- Skeleton loading state for chat list

## Notification System
- `src/services/notifications.js` — `createNotification()` helper
- Triggered on: comment on your post, new message received
- Real-time listener in NotificationBell via Firestore onSnapshot
- Unread count badge, "Mark all read" batch update

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
