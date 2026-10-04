const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const data = require('./src/data.js'); // flight, route and aircraft data (shared with the browser build)

function createWindow() {
  const w = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 600,
    backgroundColor: '#141414', title: 'SkyTrack', icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  w.removeMenu();
  // Open links from inside the app (e.g. aircraft photos) in the system browser, not in the app window
  w.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  w.webContents.on('will-navigate', e => e.preventDefault());
  w.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// Live data: adsb.lol (primary) and OpenSky (fallback / wide view) — details in src/data.js
ipcMain.handle('flights', (_, b) => data.flights(b));
// Flight route (by callsign) and aircraft info (by ICAO24 code): adsbdb.com
ipcMain.handle('route', (_, cs) => data.route(cs));
ipcMain.handle('aircraft', (_, hex) => data.aircraft(hex));

app.whenReady().then(() => {
  // OpenStreetMap's usage policy requires a Referer; file:// pages don't send one, so add it to tile requests
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['https://tile.openstreetmap.org/*'] }, (d, cb) => {
    d.requestHeaders.Referer = 'https://github.com/SametDuhan/airock'; cb({ requestHeaders: d.requestHeaders });
  });
  // Only allow the notifications permission (alert zone); camera, location etc. are denied
  session.defaultSession.setPermissionRequestHandler((_, perm, cb) => cb(perm === 'notifications'));
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
