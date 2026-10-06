const { app, BrowserWindow, ipcMain, shell, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const data = require('./src/data.js'); // flight, route and aircraft data (shared with the browser build)

// Small settings file in the user data folder (only the tray option for now)
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const settings = (() => { try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { return {}; } })();
const saveSettings = () => { try { fs.writeFileSync(settingsFile(), JSON.stringify(settings)); } catch {} };
let win = null, tray = null, quitting = false;
const showWin = () => { if (!win) return createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); };
function setupTray() {
  if (tray) return;
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')).resize({ width: 18, height: 18 }));
  tray.setToolTip('SkyTrack');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open SkyTrack', click: showWin }, { type: 'separator' }, { label: 'Quit', click: () => { quitting = true; app.quit(); } }]));
  tray.on('click', showWin);
}
if (!app.requestSingleInstanceLock()) app.quit(); else app.on('second-instance', showWin);
function createWindow() {
  const w = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 600,
    backgroundColor: '#141414', title: 'SkyTrack', icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  });
  win = w;
  w.on('close', e => { if (settings.tray && !quitting) { e.preventDefault(); w.hide(); setupTray(); } });
  w.on('closed', () => { win = null; });
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
// Aircraft photos (planespotters.net)
ipcMain.handle('photos', (_, hex) => data.photos(hex));
// Path flown so far (adsb.lol trace)
ipcMain.handle('trace', (_, hex) => data.trace(hex));

// Airport panel: weather, city/country, photo
ipcMain.handle('version', () => app.getVersion());
ipcMain.handle('tray', (_, on) => { settings.tray = !!on; saveSettings(); if (on) setupTray(); else if (tray) { tray.destroy(); tray = null; } });
ipcMain.handle('show', () => showWin());
ipcMain.handle('airport', (_, lat, lon) => data.airport(lat, lon));

// Watchlist, today's flights of an aircraft, METAR/TAF, rain radar
ipcMain.handle('watch', (_, hexes) => data.watch(hexes));
ipcMain.handle('legs', (_, hex) => data.legs(hex));
ipcMain.handle('metar', (_, lat, lon) => data.metar(lat, lon));
ipcMain.handle('radar', () => data.radar());
ipcMain.handle('turbMap', () => data.turbMap());
ipcMain.handle('wind', (_, b, hpa) => data.wind(b, hpa));
ipcMain.handle('turb', (_, pts, altFt) => data.turb(pts, altFt));

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
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
