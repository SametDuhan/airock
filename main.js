const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const data = require('./src/data.js'); // uçuş, rota ve uçak verisi (tarayıcı sürümüyle ortak kod)

function createWindow() {
  const w = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 600,
    backgroundColor: '#141414', title: 'SkyTrack',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  w.removeMenu();
  // Uygulama içindeki bağlantılar (ör. uçak fotoğrafı) uygulama penceresinde değil, sistem tarayıcısında açılsın
  w.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  w.webContents.on('will-navigate', e => e.preventDefault());
  w.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// Canlı veri: adsb.lol (birincil) ve OpenSky (yedek / geniş görünüm) — ayrıntılar src/data.js içinde
ipcMain.handle('flights', (_, b) => data.flights(b));
// Uçuş rotası (çağrı koduna göre) ve uçak bilgisi (ICAO24 koduna göre): adsbdb.com
ipcMain.handle('route', (_, cs) => data.route(cs));
ipcMain.handle('aircraft', (_, hex) => data.aircraft(hex));

app.whenReady().then(() => {
  // OpenStreetMap, kullanım politikası gereği Referer ister; file:// sayfaları göndermediği için karo isteklerine ekle
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['https://tile.openstreetmap.org/*'] }, (d, cb) => {
    d.requestHeaders.Referer = 'https://github.com/SametDuhan/airock'; cb({ requestHeaders: d.requestHeaders });
  });
  // Yalnızca bildirim iznine (uyarı bölgesi) izin ver; kamera, konum vb. reddedilir
  session.defaultSession.setPermissionRequestHandler((_, perm, cb) => cb(perm === 'notifications'));
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
