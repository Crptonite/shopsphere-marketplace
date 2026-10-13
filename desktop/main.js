const { app, BrowserWindow, shell } = require('electron');

// The web app runs on Vercel (server-rendered, with database and payments), so the desktop app
// loads it in a window. Set SHOPSPHERE_URL to point at a different deployment or localhost.
const APP_URL = process.env.SHOPSPHERE_URL || 'https://shopsphere-marketplace-ashy.vercel.app/';
const APP_ORIGIN = new URL(APP_URL).origin;

// Sign-in providers and Supabase must stay inside the window so the session cookie is kept.
const IN_APP_HOSTS = ['accounts.google.com', 'github.com', 'supabase.co'];

function isInApp(url) {
  try {
    const u = new URL(url);
    return u.origin === APP_ORIGIN || IN_APP_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'ShopSphere',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(APP_URL);

  // Links to other sites open in the default browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInApp(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isInApp(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
