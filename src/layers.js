// Extra map layers: day/night, turbulence advisories (SIGMET / G-AIRMET), wind arrows at a flight level.
/* ---------- day / night ---------- */
let nightLayer = null, nightT = 0;
function setNight(on) {
  $('bNt').classList.toggle('on', on); clearInterval(nightT);
  if (!on) { nightLayer && nightLayer.remove(); nightLayer = null; return; }
  const draw = () => { const p = SkyGeo.night(); if (nightLayer) nightLayer.setLatLngs(p); else nightLayer = L.polygon(p, { stroke: false, fillColor: '#000', fillOpacity: .32, interactive: false, noClip: true }).addTo(map); };
  draw(); nightT = setInterval(draw, 60e3);
}
$('bNt').onclick = () => setNight(!nightLayer);

/* ---------- turbulence advisories ---------- */
let tbLayer = null, tbT = 0;
async function setTurbMap(on) {
  $('bTb').classList.toggle('on', on); clearInterval(tbT);
  if (!on) { tbLayer && tbLayer.remove(); tbLayer = null; return; }
  const r = await DATA.turbMap(); if (!$('bTb').classList.contains('on')) return;
  if (!r.ok) { toast(t('Turbulence data unavailable')); $('bTb').classList.remove('on'); return; }
  tbLayer && tbLayer.remove(); tbLayer = L.layerGroup().addTo(map);
  for (const a of r.adv) { const col = a.sev >= 3 ? '#f87171' : '#facc15', label = `${t(a.sev >= 3 ? 'Severe turbulence' : 'Moderate turbulence')} · ${a.lv}${a.name ? '<br><small>' + esc(a.name) + '</small>' : ''}`;
    for (const k of [-360, 0, 360]) L.polygon(a.poly.map(([la, lo]) => [la, lo + k]), { color: col, weight: 1.5, fillColor: col, fillOpacity: .22 }).bindTooltip(label, { sticky: true }).addTo(tbLayer); }
  if (!r.adv.length) toast(t('No turbulence advisories right now'));
  tbT = setInterval(() => setTurbMap(true), 600e3);
}
$('bTb').onclick = () => setTurbMap(!tbLayer);

/* ---------- wind arrows ---------- */
// The button switches the layer on/off; the selector under the Map buttons picks the flight level. Pressure level -> approximate flight level.
const WIND = [[850, 'FL050'], [700, 'FL100'], [500, 'FL180'], [300, 'FL300'], [250, 'FL340'], [200, 'FL390']];
let windLayer = null, windI = -1, windLast = 4, windT = 0, windReq = 0; const windCache = new Map();
const windColor = kt => kt >= 100 ? '#f87171' : kt >= 60 ? '#facc15' : kt >= 30 ? '#4ade80' : '#7dd3fc';
async function drawWind() {
  if (windI < 0) return; const my = ++windReq, b = map.getBounds().pad(.1), hpa = WIND[windI][0];
  const key = [hpa, ...[b.getSouth(), b.getNorth(), b.getWest(), b.getEast()].map(v => Math.round(v))].join(',');
  let e = windCache.get(key); if (!e || Date.now() - e.t > 900e3) { const r = await DATA.wind({ s: b.getSouth(), n: b.getNorth(), w: b.getWest(), e: b.getEast() }, hpa);
    if (my !== windReq) return; if (!r.ok) { toast(t('Wind data unavailable')); return; } e = { v: r.pts, t: Date.now() }; windCache.set(key, e); if (windCache.size > 20) windCache.delete(windCache.keys().next().value); }
  if (my !== windReq) return; windLayer && windLayer.remove(); windLayer = L.layerGroup().addTo(map);
  for (const p of e.v) { const c = windColor(p.kt), rot = (p.dir + 180) % 360; // the wind comes FROM dir, so the arrow points the opposite way
    L.marker([p.lat, p.lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'wd', iconSize: [34, 34], iconAnchor: [17, 17],
      html: `<svg width="34" height="34" viewBox="-17 -17 34 34" style="transform:rotate(${rot}deg)"><path d="M0-13V12M0-13L-5-6M0-13L5-6" stroke="#111" stroke-width="4.5" stroke-linecap="round" fill="none"/><path d="M0-13V12M0-13L-5-6M0-13L5-6" stroke="${c}" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg><b style="color:${c}">${Math.round(p.kt)}</b>` }) }).addTo(windLayer); }
}
function setWind(i) {
  windI = i; clearInterval(windT); windReq++; $('bWd').classList.toggle('on', i >= 0); $('wdLv').style.display = i >= 0 ? '' : 'none';
  if (i < 0) { windLayer && windLayer.remove(); windLayer = null; return; }
  windLast = i; $('wdLv').value = i; drawWind(); windT = setInterval(drawWind, 900e3);
}
$('bWd').onclick = () => setWind(windI >= 0 ? -1 : windLast);
$('wdLv').onchange = () => setWind(+$('wdLv').value);
{ let tm; map.on('moveend', () => { clearTimeout(tm); tm = setTimeout(drawWind, 800); }); }
