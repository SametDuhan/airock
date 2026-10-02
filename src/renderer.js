const $ = id => document.getElementById(id);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const map = L.map('map', { zoomControl: false, worldCopyJump: true, minZoom:5 }).setView([41, 29], 6);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map); 
const trail = L.polyline([], { color: '#f2c230', weight: 2, opacity: .8 }).addTo(map);
const routeLine = L.polyline([], { color: '#f2c230', weight: 1.5, opacity: .7, dashArray: '5 7', interactive: false }).addTo(map), routeEnds = L.layerGroup().addTo(map);
const PLANE = '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
const AP = [
  // Türkiye
  ['IST','İstanbul',41.26,28.74],['SAW','Sabiha Gökçen',40.90,29.31],['ESB','Ankara Esenboğa',40.13,32.99],
  ['ADB','İzmir',38.29,27.15],['AYT','Antalya',36.90,30.80],['DLM','Dalaman',36.71,28.79],
  ['BJV','Bodrum',37.25,27.66],['ASR','Kayseri',38.77,35.49],['TZX','Trabzon',40.99,39.79],
  ['GZT','Gaziantep',36.95,37.47],['DIY','Diyarbakır',37.89,40.20],['VAN','Van',38.46,43.33],
  ['ERZ','Erzurum',39.96,41.17],['SZF','Samsun',41.25,36.57],['ADA','Adana',36.98,35.28],
  ['KYA','Konya',37.98,32.56],['EZS','Elazığ',38.61,39.29],['HTY','Hatay',36.36,36.28],
  // Avrupa
  ['LHR','Londra Heathrow',51.47,-0.45],['CDG','Paris CDG',49.01,2.55],['FRA','Frankfurt',50.03,8.57],
  ['AMS','Amsterdam',52.31,4.76],['MAD','Madrid',40.49,-3.57],['BCN','Barselona',41.30,2.08],
  ['FCO','Roma',41.80,12.25],['MUC','Münih',48.35,11.79],['ZRH','Zürih',47.46,8.55],
  ['VIE','Viyana',48.11,16.57],['ATH','Atina',37.94,23.94],['SOF','Sofya',42.70,23.41],
  ['OTP','Bükreş',44.57,26.08],['BEG','Belgrad',44.82,20.31],['BUD','Budapeşte',47.44,19.26],
  ['WAW','Varşova',52.17,20.97],['CPH','Kopenhag',55.62,12.65],['ARN','Stockholm',59.65,17.93],
  ['HEL','Helsinki',60.32,24.96],['DUB','Dublin',53.42,-6.27],['LIS','Lizbon',38.77,-9.13],
  ['KBP','Kiev Boryspil',50.35,30.89],['LCA','Larnaka',34.88,33.63],
  // Orta Doğu / Kafkasya
  ['TLV','Tel Aviv',32.01,34.89],['DXB','Dubai',25.25,55.36],['DOH','Doha',25.27,51.61],
  ['AUH','Abu Dabi',24.43,54.65],['RUH','Riyad',24.96,46.70],['JED','Cidde',21.68,39.16],
  ['CAI','Kahire',30.12,31.41],['AMM','Amman',31.72,35.99],['BEY','Beyrut',33.82,35.49],
  ['BGW','Bağdat',33.26,44.23],['IKA','Tahran İmam Humeyni',35.42,51.15],['EVN','Erivan',40.15,44.40],
  ['TBS','Tiflis',41.67,44.95],['GYD','Bakü',40.47,50.05],
  // Dünya
  ['JFK','New York JFK',40.64,-73.78],['LAX','Los Angeles',33.94,-118.41],['PEK','Pekin',40.08,116.59],
  ['HND','Tokyo Haneda',35.55,139.78],['SIN','Singapur',1.36,103.99],['DEL','Delhi',28.56,77.10],
  ['BOM','Mumbai',19.09,72.87],['BKK','Bangkok',13.69,100.75]
];
const AIRLINES = ['THY','PGT','AJA','KLM','DLH','BAW','UAE','AZA','SXS','WZZ'], ZONE_R = 100; // km
const APO = AP.map(a => ({ code: a[0], name: a[1], lat: a[2], lon: a[3] }));
const brg = (a, b, c, d) => { const r = Math.PI / 180, y = Math.sin((d - b) * r) * Math.cos(c * r), x = Math.cos(a * r) * Math.sin(c * r) - Math.sin(a * r) * Math.cos(c * r) * Math.cos((d - b) * r); return (Math.atan2(y, x) / r + 360) % 360; };
const km = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const flights = new Map(), routeCache = new Map(), fav = new Set(LS('sky.fav', [])), hist = [], 
flt = { alt: 0, maxAlt: 45000, spd: 0, fav: false };
let selected = null, live = false, ts = 30, replay = false, placing = false, zone = LS('sky.zone', null), zoneLayer = null, tick = 0;

/* ---------- görünüm: irtifa rengi + filtre ---------- */
const color = alt => `hsl(${Math.round(40 + Math.min(alt / 12000, 1) * 240)} 90% 58%)`;
const vis = f => { const ft = f.alt * 3.281; return ft >= flt.alt && (flt.maxAlt >= 45000 || ft <= flt.maxAlt) && f.spd * 1.944 >= flt.spd && (!flt.fav || fav.has(f.id)); };
function paint(f, hdg) {
  const el = f.marker.getElement(); if (!el) return;
  el.style.display = vis(f) && !f.gone ? '' : 'none';
  const i = el.firstChild; i.style.transform = `rotate(${hdg ?? f.hdg}deg)`; i.style.setProperty('--c', color(f.alt));
}
function toast(msg) {
  const d = document.createElement('div'); d.className = 'tm'; d.textContent = msg; $('toast').appendChild(d); setTimeout(() => d.remove(), 4000);
  try { new Notification('SkyTrack', { body: msg }); } catch {}
}

/* ---------- uçuş verisi ---------- */
// Demo uçuşlar gerçek bir rotada uçar: kalkış havalimanından varışa gider, varınca yeni bir rotaya çıkar
const pickDst = o => { let d; do d = APO[Math.floor(Math.random() * APO.length)]; while (d === o || km(o.lat, o.lon, d.lat, d.lon) < 300); return d; };
function seedDemo() {
  for (let i = 0; i < 45; i++) { const o = APO[i % APO.length], d = pickDst(o), t = .05 + Math.random() * .85;
    const lat = o.lat + (d.lat - o.lat) * t, lon = o.lon + (d.lon - o.lon) * t;
    upsert({ id: 'd' + i, cs: AIRLINES[i % 10] + (100 + Math.floor(Math.random() * 900)), country: 'Demo', lat, lon,
      alt: 6000 + Math.random() * 5500, spd: 190 + Math.random() * 70, hdg: brg(lat, lon, d.lat, d.lon), vr: 0, route: { org: o, dst: d }, rs: 'ok' }); }
}
function upsert(d) {
  let f = flights.get(d.id);
  if (!f) { f = { tr: [] };
    f.marker = L.marker([d.lat, d.lon], { icon: L.divIcon({ className: 'pl', html: '<div class="pi">' + PLANE + '</div>', iconSize: [26, 26] }) }).addTo(map);
    f.marker.on('click', e => { L.DomEvent.stopPropagation(e); select(d.id); }); flights.set(d.id, f); }
  Object.assign(f, d); f.marker.setLatLng([f.lat, f.lon]); paint(f); return f;
}
function clearAll() { flights.forEach(f => f.marker.remove()); flights.clear(); hist.length = 0; select(null); }

/* ---------- rota (nereden → nereye) ---------- */
async function getRoute(cs) {
  if (window.api) return window.api.route(cs);
  try {
    const r = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(cs)}`);
    if (r.status === 404) return { ok: true, route: null };
    const fr = (await r.json()).response?.flightroute; if (!fr) return { ok: true, route: null };
    const ap = a => ({ code: a.iata_code || a.icao_code, name: a.municipality || a.name, lat: a.latitude, lon: a.longitude });
    return { ok: true, route: { org: ap(fr.origin), dst: ap(fr.destination), airline: fr.airline?.name || '' } };
  } catch (e) { return { ok: false, error: e.message }; }
}
async function loadRoute(f) {
  if (f.rs) return; f.rs = 'loading';
  let r = routeCache.get(f.cs);
  if (r === undefined) { const res = await getRoute(f.cs); if (!res.ok) { f.rs = 'err'; return showRoute(f); } r = res.route; routeCache.set(f.cs, r); }
  f.route = r; f.rs = r ? 'ok' : 'none'; showRoute(f);
}
function showRoute(f) { if (f.id !== selected) return; drawRoute(f); renderCard(true); }
function drawRoute(f) {
  routeEnds.clearLayers();
  if (!f || !f.route) return routeLine.setLatLngs([]);
  const { org, dst } = f.route;
  routeLine.setLatLngs([[org.lat, org.lon], [f.lat, f.lon], [dst.lat, dst.lon]]);
  [org, dst].forEach(a => L.circleMarker([a.lat, a.lon], { radius: 6, color: '#f2c230', weight: 2, fillColor: '#141414', fillOpacity: 1, interactive: false })
    .bindTooltip(a.code, { permanent: true, direction: 'top', offset: [0, -6], className: 'apl' }).addTo(routeEnds));
}
function nearest(f) { let b = null, m = 1e9; AP.forEach(a => { const d = km(f.lat, f.lon, a[2], a[3]); if (d < m) { m = d; b = a; } }); return `${b[0]} · ${Math.round(m)} km`; }

/* ---------- ana döngü (1 sn) ---------- */
setInterval(() => {
  if (replay) return;
  tick++;
  flights.forEach(f => {
    if (!live && f.route) { const d = f.route.dst;
      if (km(f.lat, f.lon, d.lat, d.lon) < 15) { f.route = { org: d, dst: pickDst(d) }; if (f.id === selected) { f.tr = []; drawRoute(f); renderCard(true); } }
      f.hdg = brg(f.lat, f.lon, f.route.dst.lat, f.route.dst.lon); }
    const dist = f.spd * ts, h = f.hdg * Math.PI / 180;
    f.lat += Math.cos(h) * dist / 111320; f.lon += Math.sin(h) * dist / (111320 * Math.cos(f.lat * Math.PI / 180));
    if (!live && !f.route && (f.lat > 60 || f.lat < 20 || f.lon > 60 || f.lon < -10)) f.hdg = (f.hdg + 180) % 360;
    f.marker.setLatLng([f.lat, f.lon]); paint(f);
    if (zone) { const inn = km(f.lat, f.lon, zone.lat, zone.lon) < ZONE_R; if (inn && f.in === false) toast(`${f.cs} uyarı bölgesine girdi`); f.in = inn; }
    if (f.id === selected) { f.tr.push([f.lat, f.lon]); if (f.tr.length > 80) f.tr.shift(); trail.setLatLngs(f.tr); if (f.route) routeLine.setLatLngs([[f.route.org.lat, f.route.org.lon], [f.lat, f.lon], [f.route.dst.lat, f.route.dst.lon]]); }
  });
  if (tick % 5 === 0) { // geçmiş kaydı: 5 sn'de bir, en fazla 720 kare
    hist.push({ t: Date.now(), d: [...flights.values()].map(f => [f.id, f.lat, f.lon, f.hdg]) }); if (hist.length > 720) hist.shift();
    $('rpS').max = hist.length - 1; $('rpS').value = hist.length - 1;
  }
  if (selected) renderCard();
}, 1000);

/* ---------- canlı veri ---------- */
// Masaüstü uygulamada main.js üzerinden, tarayıcıda doğrudan OpenSky'a istek atar
async function getFlights(b) {
  if (window.api) return window.api.flights(b);
  try {
    const j = await (await fetch(`https://opensky-network.org/api/states/all?lamin=${b.s}&lomin=${b.w}&lamax=${b.n}&lomax=${b.e}`)).json();
    return { ok: true, flights: (j.states || []).filter(s => s[5] != null && s[6] != null && !s[8]).map(s => ({ id: s[0], cs: (s[1] || '').trim() || s[0], country: s[2], lon: s[5], lat: s[6], alt: s[7] || 0, spd: s[9] || 0, hdg: s[10] || 0, vr: s[11] || 0 })) };
  } catch (e) { return { ok: false, error: e.message }; }
}
// Görünen alanın biraz genişini ister; harita bu alanın içinde kaldıkça kaydırma/zoom yeni istek atmaz (OpenSky kredisi korunur)
let fetchedBox = null, fetchedAt = 0, reqId = 0, moveTimer = null;
async function poll(force) {
  if (!live) return; const v = map.getBounds();
  if (!force && fetchedBox && fetchedBox.contains(v) && Date.now() - fetchedAt < 30000) return;
  const b = v.pad(.25), id = ++reqId, cl = (x, m) => Math.max(-m, Math.min(m, x)).toFixed(2);
  fetchedBox = b; fetchedAt = Date.now(); $('st').textContent = 'yükleniyor…';
  const r = await getFlights({ s: cl(b.getSouth(), 90), n: cl(b.getNorth(), 90), w: cl(b.getWest(), 180), e: cl(b.getEast(), 180) });
  if (!live || id !== reqId) return; // bu arada harita yine değiştiyse eski cevabı at
  if (!r.ok) { fetchedBox = null; $('st').textContent = 'hata: ' + r.error; return; }
  const seen = new Set(r.flights.map(d => d.id));
  flights.forEach((f, id) => { if (!seen.has(id)) { f.marker.remove(); flights.delete(id); if (selected === id) select(null); } });
  r.flights.forEach(d => { const o = flights.get(d.id); if (o) d.tr = o.tr; upsert(d); }); $('st').textContent = 'son güncelleme · ' + new Date().toLocaleTimeString('tr-TR');
}
setInterval(() => poll(true), 30000);
map.on('moveend', () => { clearTimeout(moveTimer); moveTimer = setTimeout(poll, 400); }); // zoom/kaydırma bitince hemen yeni bölgeyi iste
function setMode(l) {
  live = l; ts = l ? 1 : 30; exitReplay(); $('mLive').classList.toggle('on', l); $('mDemo').classList.toggle('on', !l); clearAll();
  if (l) poll(true); else { seedDemo(); $('st').textContent = 'demo (30x hız)'; }
}
$('mDemo').onclick = () => setMode(false); $('mLive').onclick = () => setMode(true);

/* ---------- havalimanları ---------- */
const apLayer = L.layerGroup().addTo(map);
AP.forEach(a => L.circleMarker([a[2], a[3]], { radius: 4, color: '#000', weight: 1, fillColor: '#f2c230', fillOpacity: 1 }).bindTooltip(`${a[0]} · ${a[1]}`)
  .on('click', e => { L.DomEvent.stopPropagation(e); toast(`${a[0]}: ${[...flights.values()].filter(f => km(f.lat, f.lon, a[2], a[3]) < 100).length} uçak 100 km içinde`); }).addTo(apLayer));
$('bAp').onclick = function () { const on = !map.hasLayer(apLayer); on ? apLayer.addTo(map) : apLayer.remove(); this.classList.toggle('on', on); };

/* ---------- uyarı bölgesi ---------- */
function drawZone() { zoneLayer && zoneLayer.remove(); zoneLayer = null; $('bZ').classList.toggle('on', !!zone);
  if (zone) zoneLayer = L.circle([zone.lat, zone.lon], { radius: ZONE_R * 1000, color: '#ff6b5e', weight: 2, dashArray: '6 6', fillOpacity: .07, interactive: false }).addTo(map); }
$('bZ').onclick = () => { if (zone) { zone = null; save('sky.zone', null); drawZone(); } else { placing = true; toast('Bölge merkezi için haritaya tıkla'); } };
drawZone();

/* ---------- geçmişi oynat ---------- */
function exitReplay() { if (!replay) return; replay = false; $('rpLive').classList.add('on'); $('rpT').textContent = 'geçmiş kaydı';
  flights.forEach(f => { f.gone = false; f.marker.setLatLng([f.lat, f.lon]); paint(f); }); drawRoute(flights.get(selected)); }
$('rpS').oninput = function () { const s = hist[+this.value]; if (!s) return; replay = true; $('rpLive').classList.remove('on');
  const m = new Map(s.d.map(x => [x[0], x])); trail.setLatLngs([]); drawRoute(null);
  flights.forEach(f => { const x = m.get(f.id); f.gone = !x; if (x) f.marker.setLatLng([x[1], x[2]]); paint(f, x && x[3]); });
  $('rpT').textContent = new Date(s.t).toLocaleTimeString('tr-TR'); };
$('rpLive').onclick = exitReplay;

/* ---------- seçim, favori, panel, liste ---------- */
function select(id) {
  flights.forEach(f => f.marker.getElement() && f.marker.getElement().classList.toggle('sel', f.id === id));
  selected = id; trail.setLatLngs([]); const f = flights.get(id);
  if (f) { f.tr = [[f.lat, f.lon]]; map.panTo([f.lat, f.lon]); }
  drawRoute(f); if (f && live) loadRoute(f);
  $('card').classList.toggle('show', !!f); if (f) renderCard(true); renderList();
}
function renderCard(full) {
  const f = flights.get(selected); if (!f) return;
  if (full) $('card').innerHTML = `<h2>${f.cs}</h2><small>${f.route?.airline || f.country}</small>${routeHtml(f)}<div id="kvs"></div><button id="fv"></button>`;
  if (f.route) { const { org, dst } = f.route, a = km(org.lat, org.lon, f.lat, f.lon), b = km(f.lat, f.lon, dst.lat, dst.lon);
    $('pgb').style.width = Math.min(100, a / (a + b) * 100).toFixed(1) + '%';
    $('pgt').textContent = `${Math.round(a)} km uçtu · ${Math.round(b)} km kaldı${f.spd > 30 ? ' · ~' + eta(b / (f.spd * 3.6)) : ''}`; }
  $('kvs').innerHTML = [['İrtifa', Math.round(f.alt * 3.281).toLocaleString('tr-TR') + ' ft'], ['Hız', Math.round(f.spd * 1.944) + ' kt'], ['Yön', Math.round(f.hdg) + '°'],
    ['Dikey hız', Math.round(f.vr * 196.85) + ' ft/dk'], ['En yakın havalimanı', nearest(f)], ['Konum', f.lat.toFixed(2) + ', ' + f.lon.toFixed(2)]].map(r => `<div class="kv"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  $('fv').textContent = fav.has(f.id) ? '★ Favoride' : '☆ Favorile';
}
const eta = h => h < 1 ? Math.round(h * 60) + ' dk' : Math.floor(h) + ' sa ' + Math.round(h % 1 * 60) + ' dk';
function routeHtml(f) {
  if (!f.route) return `<div class="rtx" style="margin-top:12px">${{ loading: 'Rota bilgisi yükleniyor…', none: 'Rota bilgisi bulunamadı', err: 'Rota bilgisi alınamadı' }[f.rs] || ''}</div>`;
  const { org, dst } = f.route, esc = t => String(t).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  return `<div class="rt"><div><b>${esc(org.code)}</b><small title="${esc(org.name)}">${esc(org.name)}</small></div><span>✈</span>`
    + `<div><b>${esc(dst.code)}</b><small title="${esc(dst.name)}">${esc(dst.name)}</small></div></div><div class="pg"><i id="pgb"></i></div><div class="rtx" id="pgt"></div>`;
}
$('card').onclick = e => { if (e.target.id !== 'fv') return; fav.has(selected) ? fav.delete(selected) : fav.add(selected); save('sky.fav', [...fav]); renderCard(); renderList(); flights.forEach(f => paint(f)); };
function renderList() {
  const q = $('q').value.trim().toLowerCase();
  const arr = [...flights.values()].filter(f => vis(f) && f.cs.toLowerCase().includes(q)).sort((a, b) => a.cs.localeCompare(b.cs)).slice(0, 200);
  $('meta').textContent = `${arr.length} / ${flights.size} UÇUŞ`;
  $('list').innerHTML = arr.map(f => `<div class="row ${f.id === selected ? 'on' : ''}" data-id="${f.id}"><b>${fav.has(f.id) ? '★ ' : ''}${f.cs}</b><span>${f.route ? f.route.org.code + '→' + f.route.dst.code + ' · ' : ''}${Math.round(f.alt * 3.281 / 100) * 100} ft</span></div>`).join('');
}
$('list').onpointerdown = e => { const r = e.target.closest('.row'); if (r) select(r.dataset.id); };
$('q').oninput = renderList; setInterval(renderList, 2000);
const applyF = e => {
  // tek çubukta iki tutamaç: sol = en az, sağ = en çok irtifa; birbirinin üstünden geçemezler
  const a = $('fA'), m = $('fM');
  if (+a.value > +m.value) { if (e && e.target === m) m.value = a.value; else a.value = m.value; }
  flt.alt = +a.value; flt.maxAlt = +m.value; flt.spd = +$('fS').value; flt.fav = $('fF').checked;
  a.style.zIndex = flt.alt > 22500 ? 3 : 1; // üst üste gelince sağ uçta da "en az" tutulabilsin
  $('dr').style.setProperty('--a', flt.alt / 450 + '%'); $('dr').style.setProperty('--b', flt.maxAlt / 450 + '%');
  $('vA').textContent = flt.alt.toLocaleString('tr-TR'); $('vM').textContent = flt.maxAlt >= 45000 ? '45.000+' : flt.maxAlt.toLocaleString('tr-TR'); $('vS').textContent = flt.spd;
  flights.forEach(f => paint(f)); renderList();
};
['fA', 'fM', 'fS', 'fF'].forEach(i => $(i).oninput = applyF);

/* ---------- açılır/kapanır menü + saat ---------- */
const setMenu = open => { $('side').classList.toggle('hide', !open); document.body.classList.toggle('closed', !open); save('sky.menu', open); };
$('close').onclick = () => setMenu(false); $('open').onclick = () => setMenu(true);
$('side').addEventListener('transitionend', () => map.invalidateSize());
setMenu(LS('sky.menu', true)); map.invalidateSize();
const clock = () => $('clock').textContent = new Date().toLocaleTimeString('tr-TR'); clock(); setInterval(clock, 1000);
map.on('click', e => { if (placing) { placing = false; zone = { lat: e.latlng.lat, lon: e.latlng.lng }; save('sky.zone', zone); flights.forEach(f => delete f.in); drawZone(); toast('Uyarı bölgesi ayarlandı (100 km)'); } else select(null); });
setMode(false);
