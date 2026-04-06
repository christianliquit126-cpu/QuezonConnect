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
    ├── Profile.jsx     # Location editor with mini-map + QC badge + loading/empty states
    ├── Settings.jsx    # Profile, account, and preferences settings page (NEW)
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
- `resources` collection: public read, admin-only write — rule present and correct
- `notifications` collection uses `recipientUid` field for read/update rules (not `userId`)
- `volunteers` collection: public read, owner/admin write, deduplication via `setDoc` with uid as doc ID

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
- **Mark as read**: opening a chat writes `lastReadBy[uid]` to the chat doc; Navbar unread count checks this field
- Unread bold styling in chat list for conversations with unseen messages
- Grouped chat bubbles — consecutive messages from same user are visually grouped
- Message notifications sent to recipient via `notifications` collection on every send
- Skeleton loading state for chat list
- **"Offer Help" integration**: `GetHelp` "Offer Help" button navigates to `/messages?startChat=UID&name=…` to auto-open a conversation with the requester
- **Start new chat panel**: search all users and open a conversation directly from Messages

## Notification System
- `src/services/notifications.js` — `createNotification()` helper
- Triggered on: **like on your post** (new), comment on your post, new message received, nearby help request (proximity alert)
- Real-time listener in NotificationBell via Firestore onSnapshot
- Unread count badge, "Mark all read" batch update
- **Clickable notifications**: each notification navigates to `n.link` and marks itself as read individually on click
- **Type icons**: Lucide icon per notification type (Heart for like, MessageCircle for comment, Mail for message, Bell for help, Users for volunteer)
- **Better empty state**: BellOff icon with descriptive message
- `ProximityNotificationListener.jsx` — silent component on Home that notifies logged-in users when a new helpRequest appears within 3km

## Advanced Features (Added)

### Emergency Quick Mode
- Red "Find Help Now" button in Hero section
- Auto-detects user location and shows 6 nearest hospitals + police stations
- Each entry has Call button and "Open Directions" (Google Maps) button
- Sorted by distance with hospital priority

### User Reporting System
- Floating "Report Incident" button (bottom-right, small pill)
- Minimal form: title, description, location (auto-filled from GPS)
- Saves to Firestore `reports` collection with coordinates
- Visible in Admin panel under the Reports tab

### Direction Integration
- "Open Directions" button on NearbyHelp request rows (visible on hover)
- "Open Directions" on EmergencyQuickMode place entries
- "Open Directions" on SmartSuggestions entries
- All open Google Maps with exact coordinates

### Smart Suggestions
- `SmartSuggestions.jsx` in Home sidebar
- Shows nearest hospital, police, community, and donation center
- Auto-updates when location is detected
- Each row shows distance, type badge, call + directions on hover

### Category Prioritization
- Medical and Safety help requests get weighted priority in NearbyHelp sort
- Emergency categories shown with a red "Priority" badge
- Sort uses distance + category weight (0 for Medical, 0.05 for Safety)

### Search History
- Searches saved to localStorage (max 5 recent)
- Recent searches shown as small chips in Hero below popular tags
- `src/hooks/useSearchHistory.js` — save/load/clear helpers

### Location History
- Successful geocode results saved to localStorage (max 5 entries)
- `saveLocationHistory()` in `src/services/cache.js`
- Auto-called from useGeolocation on successful reverse geocode
- Used for faster reload (existing location fallback in useGeolocation)

### Basic Analytics
- `trackLocationView(placeType)` — tracks which place types are viewed
- `trackSearch(category)` — tracks search queries/categories
- `trackLoadTime()` — captures page load time via Navigation Timing API
- `trackApiCall(name, startTime)` — logs API response durations
- `getMostViewedLocations()` / `getMostSearched()` — query analytics
- All stored silently in localStorage, no UI change

### Performance Monitoring
- `trackLoadTime()` called on `window.load` in `main.jsx`
- Captures Navigation Timing API load time silently
- Logged as `page_load` analytics event

### Low Performance Mode
- `src/hooks/useLowPerfMode.js` — detects slow connections via Network Information API
- Returns `isLowPerf` boolean based on `saveData`, `effectiveType`, `downlink`
- Already used in `overpass.js` via `getAdaptiveFetchLimit()`
- Cached in sessionStorage to avoid repeated checks

### PWA Support
- `public/manifest.json` — full PWA manifest (name, icons, theme color, display: standalone)
- `public/sw.js` — service worker with install/activate/fetch handlers
- Caches app shell (index.html) for basic offline support
- Registered in `main.jsx` on `window.load`
- Apple PWA meta tags in `index.html`

### Branding & Metadata
- Improved `index.html` with keywords, author, application-name
- Full Open Graph tags (og:type, og:site_name, og:locale)
- Twitter Card meta tags
- Apple PWA meta tags (apple-mobile-web-app-capable, title, icon)
- `theme-color` meta for browser chrome color

## Bug Fixes & Improvements (Session 3)
- **Shared categories constant**: Created `src/constants/categories.js` with `HELP_CATEGORIES`, `POST_CATEGORIES`, and `FEED_FILTERS` — eliminates duplication across `GetHelp.jsx`, `CreatePost.jsx`, and `CommunityFeed.jsx`. All three now import from this shared source.
- **CommunityFeed filter completeness**: Added 'Shelter & Housing', 'Clothing', and 'Utilities' to the FEED_FILTERS — now consistent with GetHelp and CreatePost category lists.
- **CreatePost categories**: Added 'Utilities' category to match GetHelp (was missing).
- **Settings isQC bug fix**: `cityName.includes(' qc')` had a leading space that prevented "QC" from being detected. Changed to `cityName.includes('qc')`.
- **NotificationBell Firestore limit**: Added `limit(30)` directly to the Firestore query (both primary and fallback) instead of fetching unlimited documents and slicing client-side.
- **PostCard comment count decrement**: Removed stale `post.commentCount > 0` guard that prevented decrementing when the prop was out of sync. Now always calls `increment(-1)` atomically.
- **GiveHelp skill update error feedback**: `handleUpdateSkills` now sets a `skillsError` state on failure — displayed inline so users know the update didn't save.
- **GiveHelp checkingVolunteer reset**: Added early return when `currentUser` is null so `checkingVolunteer` is set to `false` immediately instead of staying true indefinitely.
- **GiveHelp data loading**: Separated volunteer/requests loading (always runs) from current-user volunteer check (only runs when logged in), so the volunteers list and help requests load correctly for all visitors.
- **GiveHelp duplicate availability badge**: Removed the redundant "Available"/"Unavailable" text badge from volunteer cards — the status dot with `title` already conveys this information.
- **Navbar search icon clickable**: Search icon is now a button that triggers the search navigation, matching the Enter-key behavior.
- **Resources seedIfEmpty guard**: Added a module-level `seedAttempted` flag so the Firestore `getDocs` check for seeding only runs once per session instead of on every component mount.

## Bug Fixes Applied (Session 2)
- **Admin panel status mismatch**: OverviewTab now counts `pending`/`open` as open requests and `completed`/`resolved` as resolved. RequestsTab dropdown now uses `pending`/`in_progress`/`completed` to match what GetHelp.jsx actually stores.
- **PostCard post image**: Added `onError` handler — broken images hide cleanly instead of showing a broken image icon.
- **PostCard editContent sync**: Added `useEffect` to sync `editContent` state when `post.content` changes from Firestore (e.g., edit from another device).
- **PostCard error visibility**: Save failures and delete failures now show inline error messages to the user.
- **PostCard report panel Escape key**: Pressing Escape now closes the report reason panel.
- **Navbar mobile menu**: Added Profile link, Admin Panel link (for admins), and Sign Out button to mobile navigation.
- **Navbar search clear button**: Added X button to clear the search input.
- **Navbar mobile button**: Added `aria-expanded` and `aria-label` to the hamburger button.
- **Login/SignUp social auth**: Google and Facebook buttons now show a spinner and are disabled during auth — prevents double-click.
- **Settings isQC detection**: Now also checks for "QC" abbreviation in addition to "quezon" (city field).
- **Settings bio counter**: Counter text turns amber at 160/200 chars and red at 190/200 chars as a warning.
- **Resources search sync**: Added `useEffect` to sync the search state when the URL `?q=` param changes via navigation (e.g., clicking a popular tag from Home).
- **GiveHelp helpCount pluralization**: Now shows "1 person helped" vs "2 people helped" correctly.
- **GiveHelp avatar fallback**: Request list avatar `src` now has a fallback value in addition to `onError`.
- **Messages chat list avatar**: Added fallback src and `onError` handler to chat list avatars.
- **Messages chat bubble avatar**: Added fallback src and `onError` handler to in-conversation bubble avatars.
- **NotificationBell Escape key**: Pressing Escape now closes the notification dropdown.
- **EmergencyQuickMode Escape key**: Pressing Escape now closes the emergency services modal.
- **CreatePost error handling**: Post submission failures now show an inline error message instead of silently failing.
- **PostCard comment batch write**: `handleComment` and `handleDeleteComment` now use `writeBatch` to atomically update both the comment subcollection and the `commentCount` counter on the post document.
- **PostCard thumbnail URL**: Post feed images now load via `getThumbnailUrl()` (600px Cloudinary optimized) instead of the full original URL.
- **PostCard login prompt**: Unauthenticated users who click Like now see a tooltip ("Sign in to like posts") with a LogIn icon instead of a silent no-op.
- **PostCard report "Other" detail**: When "Other" is selected as a report reason, a textarea appears for freeform detail; the text is saved as `detail` in the `reports` doc.
- **Messages message limit**: Chat messages query now uses `orderBy('timestamp', 'desc')` + `limit(100)` then reverses for display — prevents loading unbounded message history.
- **Messages date separators**: Date divider pills (Today / Yesterday / full date) now appear between message groups when the day changes.
- **Profile member-since date**: User profile cards now display a "Member since Month YYYY" line using `createdAt` from the Firestore user doc.
- **Settings volunteer doc sync**: When a user saves their profile, if they have a volunteer document, `name` and `location` are also updated in `volunteers/{uid}`.
- **NotificationBell Clear All**: Added a "Clear all" button that batch-deletes all notifications (not just marks them read).
- **GiveHelp Help button**: The "Help" button on each open help request now navigates to `/messages?startChat=UID&name=…&avatar=…` to start a direct conversation with the requester.
- **Navbar search placeholder**: Updated from "Search..." to "Search resources..." for clarity.
- **ReportIncident cooldown**: After submitting an incident report, a 60-second localStorage-based cooldown prevents re-opening the form. A countdown badge ("Wait Xs") is shown above the button.
- **GetHelp keyword search**: Added a text search field above the status/category filter pills to filter requests by title or description.
- **SignUp password minimum**: Password minimum raised from 6 to 8 characters; validation message updated accordingly.
- **SignUp terms notice**: Added "By creating an account you agree to our Terms of Service and Privacy Policy" below the submit button.
- **Admin request search**: RequestsTab now has a search field filtering by title, username, or category with live count display.
- **Admin user search**: UsersTab now has a search field filtering active users by name or email with live count display.
- **Admin user join date**: Each user row in UsersTab now shows relative join date (from `createdAt`) next to the email.

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
