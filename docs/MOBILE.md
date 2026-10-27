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

## Real store app (optional)
Wrap the hosted PWA: **PWABuilder.com** (Android package / Microsoft Store), or Bubblewrap / Capacitor for Play Store and App Store.
