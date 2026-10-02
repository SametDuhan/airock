const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const w = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 600,
    backgroundColor: '#141414', title: 'SkyTrack',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  w.removeMenu();
  w.loadFile('src/index.html');
}

// Canlı veri: OpenSky Network (ücretsiz, anonim kullanımda günlük kredi sınırı var)
ipcMain.handle('flights', async (_, b) => {
  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${b.s}&lomin=${b.w}&lamax=${b.n}&lomax=${b.e}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const flights = (j.states || [])
      .filter(s => s[5] != null && s[6] != null && !s[8])
      .map(s => ({ id: s[0], cs: (s[1] || '').trim() || s[0], country: s[2], lon: s[5], lat: s[6],
                   alt: s[7] || 0, spd: s[9] || 0, hdg: s[10] || 0, vr: s[11] || 0 })).slice(0,2000);
    return { ok: true, flights };
  } catch (e) { return { ok: false, error: e.message }; }
});

// Uçuş rotası (kalkış → varış): adsbdb.com (ücretsiz, anahtarsız), çağrı koduna göre
ipcMain.handle('route', async (_, cs) => {
  try {
    const r = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(cs)}`, { signal: AbortSignal.timeout(10000) });
    if (r.status === 404) return { ok: true, route: null };
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const fr = (await r.json()).response?.flightroute;
    if (!fr) return { ok: true, route: null };
    const ap = a => ({ code: a.iata_code || a.icao_code, name: a.municipality || a.name, lat: a.latitude, lon: a.longitude });
    return { ok: true, route: { org: ap(fr.origin), dst: ap(fr.destination), airline: fr.airline?.name || '' } };
  } catch (e) { return { ok: false, error: e.message }; }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length || createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
