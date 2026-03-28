import React from 'react'
import { Heart, Terminal, ExternalLink } from 'lucide-react'

export default function FirebaseSetup() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-7 h-7 text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Firebase Setup Required</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Connect your Firebase project to start using QC Community.
          </p>
        </div>

        <div className="card p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              Step 1 — Create a Firebase project
            </h2>
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              console.firebase.google.com
            </a>
            <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400 list-disc list-inside">
              <li>Enable <strong>Email/Password</strong>, <strong>Google</strong>, and <strong>Facebook</strong> in Authentication</li>
              <li>Create a <strong>Firestore Database</strong> (start in production mode)</li>
              <li>Enable <strong>Storage</strong></li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              Step 2 — Set environment variables
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Run these commands in the Shell, one at a time:
            </p>
            <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-3 space-y-1">
              {[
                'VITE_FIREBASE_API_KEY',
                'VITE_FIREBASE_AUTH_DOMAIN',
                'VITE_FIREBASE_PROJECT_ID',
                'VITE_FIREBASE_STORAGE_BUCKET',
                'VITE_FIREBASE_MESSAGING_SENDER_ID',
                'VITE_FIREBASE_APP_ID',
              ].map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Terminal className="w-3 h-3 text-green-400 shrink-0" />
                  <code className="text-xs text-green-300 font-mono">
                    echo "{key}=your_value_here" &gt;&gt; .env
                  </code>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              Step 3 — Add Firestore Security Rules
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              In Firebase Console → Firestore → Rules, paste these rules:
            </p>
            <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-3 overflow-x-auto">
              <pre className="text-xs text-green-300 font-mono whitespace-pre">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() {
      return request.auth != null;
    }
    function isOwner(uid) {
      return request.auth.uid == uid;
    }

    match /users/{userId} {
      allow read: if isAuth();
      allow write: if isAuth() && isOwner(userId);
    }
    match /posts/{postId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isAuth() &&
        (isOwner(resource.data.uid) ||
         request.resource.data.diff(resource.data)
           .affectedKeys().hasOnly(['likes','commentCount']));
      allow delete: if isAuth() && isOwner(resource.data.uid);
    }
    match /posts/{postId}/comments/{commentId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow delete: if isAuth() && isOwner(resource.data.uid);
    }
    match /helpRequests/{requestId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update: if isAuth() && isOwner(resource.data.uid);
      allow delete: if isAuth() && isOwner(resource.data.uid);
    }
    match /chats/{chatId} {
      allow read, write: if isAuth() &&
        request.auth.uid in resource.data.participants;
      allow create: if isAuth() &&
        request.auth.uid in request.resource.data.participants;
    }
    match /chats/{chatId}/messages/{msgId} {
      allow read, write: if isAuth() &&
        request.auth.uid in
          get(/databases/$(database)/documents/chats/$(chatId))
            .data.participants;
    }
    match /notifications/{notifId} {
      allow read, write: if isAuth() &&
        isOwner(resource.data.recipientUid);
      allow create: if isAuth();
    }
    match /volunteers/{volunteerId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update, delete: if isAuth() && isOwner(resource.data.uid);
    }
    match /communityUpdates/{updateId} {
      allow read: if isAuth();
      allow write: if false;
    }
  }
}`}</pre>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              Step 4 — Restart the app
            </h2>
            <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-green-400 shrink-0" />
                <code className="text-xs text-green-300 font-mono">kill 1</code>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              This restarts the Replit environment so the new env vars are loaded.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
