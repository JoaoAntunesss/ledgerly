# Ledgerly on your phone

Ledgerly is a Progressive Web App: no store needed.

## Install (2 taps)
- **Android / Chrome:** open the hosted address → menu ⋮ → *Install app* (or the **📲 Install app** button in *More*).
- **iPhone / Safari:** Share → *Add to Home Screen*.

It then opens full screen, with its own icon, and works offline.

## Hosting (needs https)
Push the folder to GitHub and enable **Pages** (Settings → Pages → branch `main`, root). Your address will be `https://<user>.github.io/ledgerly/`.

## Same data on phone and computer
Settings → **Sign in with Google**. One-time Firebase setup (free Spark plan):
1. Create a project at console.firebase.google.com, add a *Web app*.
2. Authentication → Sign-in method → enable **Google**; Authorized domains → add `<user>.github.io`.
3. Realtime Database → create → Rules:
   ```
   { "rules": { "users": { "$uid": { ".read": "auth.uid === $uid", ".write": "auth.uid === $uid" } },
                "households": { "$hid": { ".read": "auth != null", ".write": "auth != null" } } } }
   ```
4. Paste the Web API key, project ID, database URL and a password of your choice into Settings. Use the same password on every device. Data is encrypted before upload.

## Hosting on Firebase instead of GitHub Pages (recommended with Google sign-in)
Everything lives in one project and the domain is authorised automatically.
1. `npm i -g firebase-tools`, then `firebase login`.
2. In this folder: `firebase use --add` and pick your project (or `firebase init hosting` and keep the existing files).
3. `firebase deploy` — publishes the site (`https://<project>.web.app`) and the database rules from `database.rules.json`.
4. Open the site → Settings → *Sign in with Google*: the Firebase config is filled in for you, just choose the encryption password.

## Real store app (optional)
Wrap the hosted PWA: **PWABuilder.com** (Android package / Microsoft Store), or Bubblewrap / Capacitor for Play Store and App Store.
