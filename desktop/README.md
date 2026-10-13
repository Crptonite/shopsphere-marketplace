# ShopSphere desktop app (Electron)

The desktop app is a window around the deployed ShopSphere website. The web app stays on Vercel, so the database, login and payments run there.

## Run it locally
1. Open a terminal in `desktop/`.
2. `npm install`
3. Set the URL, then start:
   - PowerShell: `$env:SHOPSPHERE_URL="https://YOUR-APP.vercel.app"; npm start`
   - To test against your local dev server: `$env:SHOPSPHERE_URL="http://localhost:3000"; npm start`

## Build a Windows installer
1. In `desktop/`, run `npm run dist`.
2. The installer is written to `desktop/dist/`.

Change the default URL in `main.js` (`APP_URL`) to your Vercel address before building.

## Sign-in
The window loads the same site as the browser, so Google and GitHub sign-in use the existing `https://YOUR-APP.vercel.app/auth/callback` redirect. No extra Supabase setup is needed.
