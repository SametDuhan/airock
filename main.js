const { app, BrowserWindow, ipcMain, shell, session, Tray, Menu, nativeImage, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const data = require('./src/data.js'); // flight, route and aircraft data (shared with the browser build)

// Small settings file in the user data folder (only the tray option for now)
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const settings = (() => { try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { return {}; } })();
const saveSettings = () => { try { fs.writeFileSync(settingsFile(), JSON.stringify(settings)); } catch {} };
// OpenSky API client (optional): stored encrypted with the operating system's keychain when it is available
const osLoad = () => { try { if (settings.os && safeStorage.isEncryptionAvailable()) { const [id, sec] = JSON.parse(safeStorage.decryptString(Buffer.from(settings.os, 'base64'))); return { id, sec }; } } catch {} return null; };
let win = null, tray = null, quitting = false;
const showWin = () => { if (!win) return createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); };
function setupTray() {
  if (tray) return;
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')).resize({ width: 18, height: 18 }));
  tray.setToolTip('SkyTrack');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open SkyTrack', click: showWin }, { type: 'separator' }, { label: 'Quit', click: () => { quitting = true; app.quit(); } }]));
  tray.on('click', showWin);
}
// Updates: Windows / Linux AppImage download in the background and install on restart (electron-updater, GitHub releases).
// macOS builds are not signed, so there we only tell the user a new version exists and open the download page.
// Everything is written to update.log in the user data folder, failed checks are retried (2 min, 10 min, 30 min, then every 6 h), and the
// last state is sent again when the window reloads, so the "update ready" bar cannot be missed.
let updState = null, updFails = 0;
const updLog = m => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'update.log'), new Date().toISOString() + ' ' + m + '\n'); } catch {} };
const sendUpdate = (state, extra = {}) => { updState = { state, ...extra }; try { win?.webContents.send('update', updState); } catch {} };
const newerVer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); return (x[0] - y[0] || x[1] - y[1] || x[2] - y[2]) > 0; };
let checkNow = async () => ({ state: 'none' });
function setupUpdates() {
  ipcMain.handle('checkUpdate', () => checkNow());
  // macOS (unsigned) and builds run from source (npm start) cannot install updates by themselves: they only look for a newer release and link to it
  if (process.platform === 'darwin' || !app.isPackaged) {
    checkNow = async () => { try { const r = await fetch('https://api.github.com/repos/SametDuhan/airock/releases/latest', { headers: { 'User-Agent': 'SkyTrack' } }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(), v = String(j.tag_name || '').replace(/^v/, ''); if (newerVer(v, app.getVersion())) { sendUpdate('manual', { version: v, url: j.html_url }); return { state: 'available', version: v, manual: true }; } return { state: 'none' };
    } catch (e) { updLog('check failed: ' + e.message); return { state: 'error', error: String(e.message).slice(0, 160) }; } };
  } else {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = { info: m => updLog('info ' + m), warn: m => updLog('warn ' + m), error: m => updLog('error ' + m), debug() {} };
    autoUpdater.on('update-available', i => sendUpdate('downloading', { version: i.version }));
    autoUpdater.on('download-progress', p => sendUpdate('progress', { percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', i => sendUpdate('ready', { version: i.version }));
    autoUpdater.on('error', e => updLog('error event: ' + (e && e.message)));
    ipcMain.handle('installUpdate', () => { quitting = true; autoUpdater.quitAndInstall(); });
    checkNow = async () => { try { const r = await autoUpdater.checkForUpdates(); return r && r.isUpdateAvailable ? { state: 'available', version: r.updateInfo.version } : { state: 'none' };
    } catch (e) { updLog('check failed: ' + e.message); return { state: 'error', error: String(e.message).split('\n')[0].slice(0, 160) }; } };
  }
  const loop = async () => { const r = await checkNow(); const wait = r.state === 'error' ? [120e3, 600e3, 1800e3][Math.min(updFails++, 2)] : (updFails = 0, 6 * 3600e3); setTimeout(loop, wait); };
  setTimeout(loop, 8000);
}
if (!app.requestSingleInstanceLock()) app.quit(); else app.on('second-instance', showWin);
function createWindow() {
  const w = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 600,
    backgroundColor: '#141414', title: 'SkyTrack', icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  });
  win = w;
  w.webContents.on('did-finish-load', () => { if (updState && updState.state !== 'progress') try { w.webContents.send('update', updState); } catch {} });
  w.on('close', e => { if (settings.tray && !quitting) { e.preventDefault(); w.hide(); setupTray(); } });
  w.on('closed', () => { win = null; });
  w.removeMenu();
  // Open links from inside the app (e.g. aircraft photos) in the system browser, not in the app window
  w.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  w.webContents.on('will-navigate', e => e.preventDefault());
  w.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// Live data: adsb.lol (primary) and OpenSky (fallback / wide view) — details in src/data.js
ipcMain.handle('flights', (_, b, o) => data.flights(b, o));
// Flight route (by callsign) and aircraft info (by ICAO24 code): adsbdb.com
ipcMain.handle('route', (_, cs) => data.route(cs));
ipcMain.handle('aircraft', (_, hex) => data.aircraft(hex));
// Aircraft photos (planespotters.net)
ipcMain.handle('photos', (_, hex) => data.photos(hex));
// Path flown so far (adsb.lol trace)
ipcMain.handle('trace', (_, hex) => data.trace(hex));

// Airport panel: weather, city/country, photo
ipcMain.handle('version', () => app.getVersion());
ipcMain.handle('openskyGet', () => { const c = osLoad(); return { set: !!c, id: c ? c.id : '' }; });
ipcMain.handle('openskySet', (_, id, sec) => {
  id = String(id || '').trim(); sec = String(sec || '').trim();
  if (!id || !sec) { delete settings.os; saveSettings(); data.setOpenSky('', ''); return { ok: true, set: false }; }
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'encryption unavailable' };
  settings.os = safeStorage.encryptString(JSON.stringify([id, sec])).toString('base64'); saveSettings(); data.setOpenSky(id, sec); return { ok: true, set: true };
});
ipcMain.handle('tray', (_, on) => { settings.tray = !!on; saveSettings(); if (on) setupTray(); else if (tray) { tray.destroy(); tray = null; } });
ipcMain.handle('show', () => showWin());
ipcMain.handle('airport', (_, lat, lon) => data.airport(lat, lon));

// Watchlist, today's flights of an aircraft, METAR/TAF, rain radar
ipcMain.handle('find', (_, q) => data.find(q));
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
  { const c = osLoad(); if (c) data.setOpenSky(c.id, c.sec); }
  createWindow(); setupUpdates();
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow());
});
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
