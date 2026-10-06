const $ = id => document.getElementById(id);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`); // safely write externally sourced text into HTML
const DATA = window.api || window.SkyData; // desktop: main.js (IPC); browser: data.js directly
const map = L.map('map', { zoomControl: false, worldCopyJump: true, minZoom: 3 }).setView([41, 29], 6);
L.control.zoom({ position: 'bottomright' }).addTo(map);

/* ---------- map style ---------- */
const ESRI = n => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${n}/MapServer/tile/{z}/{y}/{x}`, ESRI_ATTR = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
// Basemaps that need no key: OSM standard; Esri light/dark gray (base + a place-names layer on top)
const TILES = {
  osm: [['https://tile.openstreetmap.org/{z}/{x}/{y}.png', '&copy; OpenStreetMap contributors', 19]],
  light: [[ESRI('World_Light_Gray_Base'), ESRI_ATTR, 16], [ESRI('World_Light_Gray_Reference'), '', 16]],
  dark: [[ESRI('World_Dark_Gray_Base'), ESRI_ATTR, 16], [ESRI('World_Dark_Gray_Reference'), '', 16]]
};
let tiles = [];
function setTiles(k) {
  if (!TILES[k]) k = 'osm'; tiles.forEach(t => t.remove());
  tiles = TILES[k].map(([url, attribution, maxNativeZoom]) => L.tileLayer(url, { attribution, maxNativeZoom, maxZoom: 19 }).addTo(map));
  document.querySelectorAll('#tiles button').forEach(b => b.classList.toggle('on', b.dataset.t === k)); save('sky.tiles', k);
}
$('tiles').onclick = e => e.target.dataset.t && setTiles(e.target.dataset.t);
setTiles(LS('sky.tiles', 'osm'));

const trail = L.polyline([], { color: '#f2c230', weight: 2.5, opacity: .9, interactive: false }).addTo(map);
// Route: a plain line with a dark casing, so it stands out on both light and dark maps
const ROUTE_C = '#2f8cff', routeCase = L.polyline([], { color: '#111', weight: 7, opacity: .5, interactive: false }).addTo(map);
const routeLine = L.polyline([], { color: ROUTE_C, weight: 3.5, opacity: .95, interactive: false }).addTo(map), routeEnds = L.layerGroup().addTo(map);
// Flown part: solid blue; remaining part (current position → destination): dashed blue
const routeRest = L.polyline([], { color: ROUTE_C, weight: 3.5, opacity: .95, dashArray: '9 9', interactive: false }).addTo(map);
const setRoute = (done, rest = []) => { routeCase.setLatLngs(done); routeLine.setLatLngs(done); routeRest.setLatLngs(rest); };
const AP = [
  // Turkey
  ['IST','Istanbul',41.26,28.74],['SAW','Sabiha Gökçen',40.90,29.31],['ESB','Ankara Esenboğa',40.13,32.99],
  ['ADB','Izmir',38.29,27.15],['AYT','Antalya',36.90,30.80],['DLM','Dalaman',36.71,28.79],
  ['BJV','Bodrum',37.25,27.66],['ASR','Kayseri',38.77,35.49],['TZX','Trabzon',40.99,39.79],
  ['GZT','Gaziantep',36.95,37.47],['DIY','Diyarbakir',37.89,40.20],['VAN','Van',38.46,43.33],
  ['ERZ','Erzurum',39.96,41.17],['SZF','Samsun',41.25,36.57],['ADA','Adana',36.98,35.28],
  ['KYA','Konya',37.98,32.56],['EZS','Elazig',38.61,39.29],['HTY','Hatay',36.36,36.28],
  // Europe
  ['LHR','London Heathrow',51.47,-0.45],['CDG','Paris CDG',49.01,2.55],['FRA','Frankfurt',50.03,8.57],
  ['AMS','Amsterdam',52.31,4.76],['MAD','Madrid',40.49,-3.57],['BCN','Barcelona',41.30,2.08],
  ['FCO','Rome',41.80,12.25],['MUC','Munich',48.35,11.79],['ZRH','Zurich',47.46,8.55],
  ['VIE','Vienna',48.11,16.57],['ATH','Athens',37.94,23.94],['SOF','Sofia',42.70,23.41],
  ['OTP','Bucharest',44.57,26.08],['BEG','Belgrade',44.82,20.31],['BUD','Budapest',47.44,19.26],
  ['WAW','Warsaw',52.17,20.97],['CPH','Copenhagen',55.62,12.65],['ARN','Stockholm',59.65,17.93],
  ['HEL','Helsinki',60.32,24.96],['DUB','Dublin',53.42,-6.27],['LIS','Lisbon',38.77,-9.13],
  ['KBP','Kyiv Boryspil',50.35,30.89],['LCA','Larnaca',34.88,33.63],
  // Middle East / Caucasus
  ['TLV','Tel Aviv',32.01,34.89],['DXB','Dubai',25.25,55.36],['DOH','Doha',25.27,51.61],
  ['AUH','Abu Dhabi',24.43,54.65],['RUH','Riyadh',24.96,46.70],['JED','Jeddah',21.68,39.16],
  ['CAI','Cairo',30.12,31.41],['AMM','Amman',31.72,35.99],['BEY','Beirut',33.82,35.49],
  ['BGW','Baghdad',33.26,44.23],['IKA','Tehran Imam Khomeini',35.42,51.15],['EVN','Yerevan',40.15,44.40],
  ['TBS','Tbilisi',41.67,44.95],['GYD','Baku',40.47,50.05],
  // World
  ['JFK','New York JFK',40.64,-73.78],['LAX','Los Angeles',33.94,-118.41],['PEK','Beijing',40.08,116.59],
  ['HND','Tokyo Haneda',35.55,139.78],['SIN','Singapore',1.36,103.99],['DEL','Delhi',28.56,77.10],
  ['BOM','Mumbai',19.09,72.87],['BKK','Bangkok',13.69,100.75]
];
// Demo airlines: ICAO → [name, IATA (for the logo)]
const AIRLINE = { THY: ['Turkish Airlines', 'TK'], PGT: ['Pegasus', 'PC'], AJA: ['AJet', 'VF'], KLM: ['KLM', 'KL'], DLH: ['Lufthansa', 'LH'],
  BAW: ['British Airways', 'BA'], UAE: ['Emirates', 'EK'], AZA: ['ITA Airways', 'AZ'], SXS: ['SunExpress', 'XQ'], WZZ: ['Wizz Air', 'W6'] };
const AIRLINES = Object.keys(AIRLINE), DEMO_TYPES = [['A320', 'Airbus A320'], ['A21N', 'Airbus A321neo'], ['B738', 'Boeing 737-800'], ['B38M', 'Boeing 737 MAX 8'], ['A333', 'Airbus A330-300'], ['B77W', 'Boeing 777-300ER']];
const ZONE_R = 100; // km (default radius)
const zoneR = () => zone?.r || ZONE_R;
const APO = AP.map(a => ({ code: a[0], name: a[1], lat: a[2], lon: a[3] }));
const { R, brg, km, gc, unwrap, nearLon } = window.SkyGeo;
const flights = new Map(), routeCache = new Map(), acCache = new Map(), picCache = new Map(), fav = new Set(LS('sky.fav', [])), hist = [],
watch = new Map(LS('sky.watch', [])), flt = { alt: 0, maxAlt: 45000, spd: 0, fav: false, ground: true, dep: '', arr: '', type: '', air: '' };
// Hooks filled in by extras.js (watchlist, today's flights, spotter logbook): they keep this file focused on the map itself
const X = { top: () => '', bottom: () => '', bottom2: () => '', rows: () => {}, sync: () => {}, click: () => false, event: () => {}, arrive: () => {}, sel: () => {} };
const EMG = { 7500: 'Hijacking', 7600: 'Radio failure', 7700: 'General emergency' }; // squawk codes
const isEmg = f => !!f.emg || f.sq in EMG;
let selected = null, live = false, ts = 30, replay = false, placing = false, zone = LS('sky.zone', null), zoneLayer = null, tick = 0;

/* ---------- appearance: altitude color + filter ---------- */
// Three altitude bands (amber < 5,000 ft, green < 16,000 ft, violet above) so neighbouring planes don't turn into a rainbow
const ALT_COLORS = ['hsl(45 90% 58%)', 'hsl(145 70% 50%)', 'hsl(265 80% 62%)'];
const color = alt => ALT_COLORS[alt < 1500 ? 0 : alt < 4900 ? 1 : 2];
const apIs = (a, c) => !!a && (a.code === c || a.icao === c);
// Aircraft type filter: matches the ICAO type code ("B738") or part of the type name ("boeing 737")
const acCode = f => (f.ac?.icaoType || f.type || '').toUpperCase();
const typeIs = (f, t) => { const c = acCode(f); return c === t || c.startsWith(t) || (f.ac?.type || '').toUpperCase().includes(t); };
// Airline filter: callsign prefix is the ICAO airline code ("THY123" → THY); also matches the name ("turkish") or IATA code ("TK")
const airCode = f => /^[A-Z]{3}(?=\d)/.exec(f.cs.toUpperCase())?.[0] || '';
const airIs = (f, a) => { const c = airCode(f), n = (f.route?.airline || AIRLINE[c]?.[0] || '').toUpperCase();
  return c === a || (f.route?.airlineIata || '').toUpperCase() === a || (a.length > 2 && n.includes(a)); };
const vis = f => { const ft = f.alt * 3.281; return (!f.ground || flt.ground) && ft >= flt.alt && (flt.maxAlt >= 45000 || ft <= flt.maxAlt) && f.spd * 1.944 >= flt.spd && (!flt.fav || fav.has(f.id))
  && (!flt.dep || apIs(f.route?.org, flt.dep)) && (!flt.arr || apIs(f.route?.dst, flt.arr)) && (!flt.type || typeIs(f, flt.type)) && (!flt.air || airIs(f, flt.air)); };
function toast(msg) {
  const d = document.createElement('div'); d.className = 'tm'; d.textContent = msg; $('toast').appendChild(d); setTimeout(() => d.remove(), 4000);
  try { new Notification('SkyTrack', { body: msg }); } catch {}
}

/* ---------- aircraft: single canvas layer ---------- */
// Instead of a separate HTML element per aircraft, all are drawn on one canvas: stays smooth with thousands of aircraft
const PLANE = new Path2D('M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z');
map.createPane('planes').style.zIndex = 450;
const PlaneLayer = L.Layer.extend({
  onAdd(m) {
    this._c = L.DomUtil.create('canvas', 'planes leaflet-zoom-hide', m.getPane('planes')); this._ctx = this._c.getContext('2d');
    m.on('move zoomend resize viewreset', this.redraw, this); this.redraw();
  },
  onRemove(m) { m.off('move zoomend resize viewreset', this.redraw, this); cancelAnimationFrame(this._raf); this._raf = 0; L.DomUtil.remove(this._c); },
  redraw() { if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = 0; this._draw(); }); },
  _draw() {
    const s = map.getSize(), dpr = window.devicePixelRatio || 1, c = this._c, ctx = this._ctx;
    if (c.width !== s.x * dpr || c.height !== s.y * dpr) { c.width = s.x * dpr; c.height = s.y * dpr; c.style.width = s.x + 'px'; c.style.height = s.y + 'px'; }
    L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, s.x, s.y); ctx.lineWidth = .7; ctx.strokeStyle = '#000';
    // Icons shrink as you zoom out so thousands of aircraft don't pile up at continent scale
    const z = map.getZoom(), k = z <= 4 ? .55 : z <= 5 ? .65 : z <= 6 ? .8 : 1;
    let sel = null; const cLon = map.getCenter().lng;
    flights.forEach(f => {
      f._p = null; if (f.gone || !vis(f)) return;
      const [lat, lon, hdg] = f.rp || [f.lat, f.lon, f.hdg], p = map.latLngToContainerPoint([lat, nearLon(lon, cLon)]); // nearest world copy at the date line
      if (p.x < -20 || p.y < -20 || p.x > s.x + 20 || p.y > s.y + 20) return;
      f._p = p; f._h = hdg; if (f.id === selected) { sel = f; return; }
      icon(ctx, p, hdg, (f.ground ? 16 : 24) * k, f.ground ? '#9aa0a6' : color(f.alt)); rings(ctx, f, p, (f.ground ? 16 : 24) * k);
    });
    if (sel) { ctx.shadowColor = '#f2c230'; ctx.shadowBlur = 12; icon(ctx, sel._p, sel._h, 30, '#fff'); ctx.shadowBlur = 0; rings(ctx, sel, sel._p, 30); }
  }
});
// Emergency (squawk 7500/7600/7700): blinking red ring
function rings(ctx, f, p, size) {
  if (!isEmg(f)) return; ctx.save(); ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 2.5; ctx.globalAlpha = (Date.now() / 700 | 0) % 2 ? .35 : 1;
  ctx.beginPath(); ctx.arc(p.x, p.y, size * .85, 0, 7); ctx.stroke(); ctx.restore();
}
function icon(ctx, p, hdg, size, fill) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(hdg * R); ctx.scale(size / 24, size / 24); ctx.translate(-12, -12);
  ctx.fillStyle = fill; ctx.fill(PLANE); ctx.stroke(PLANE); ctx.restore();
}
const planes = new PlaneLayer().addTo(map), redraw = () => planes.redraw();
// Click/hover: the nearest aircraft from the last drawn screen positions (within 14 px)
function hit(pt) { let best = null, bd = 12 * 12; flights.forEach(f => { if (!f._p) return; const d = (f._p.x - pt.x) ** 2 + (f._p.y - pt.y) ** 2; if (d < bd) { bd = d; best = f; } }); return best; }
map.on('mousemove', e => { const f = hit(e.containerPoint), h = $('hov');
  map.getContainer().style.cursor = f ? 'var(--ptr)' : '';
  if (!f) { h.style.display = 'none'; return; }
  h.style.display = 'block'; h.style.left = f._p.x + 16 + 'px'; h.style.top = f._p.y - 10 + 'px';
  h.textContent = `${f.cs}${f.route ? ' · ' + f.route.org.code + '→' + f.route.dst.code : ''} · ${f.ground ? t('on ground') : Math.round(f.alt * 3.281 / 100) * 100 + ' ft'}`; });
map.on('mouseout', () => $('hov').style.display = 'none');

/* ---------- flight data ---------- */
// Demo flights fly a real route: from the departure airport to the arrival, then start a new route on arrival
const pickDst = o => { let d; do d = APO[Math.floor(Math.random() * APO.length)]; while (d === o || km(o.lat, o.lon, d.lat, d.lon) < 300); return d; };
const demoRoute = (al, o, d) => ({ org: o, dst: d, airline: AIRLINE[al][0], airlineIata: AIRLINE[al][1] });
function seedDemo() {
  const L3 = () => String.fromCharCode(65 + Math.random() * 26 | 0);
  for (let i = 0; i < 45; i++) {
    const al = AIRLINES[i % AIRLINES.length], o = APO[i % APO.length], d = pickDst(o), path = gc([o.lat, o.lon], [d.lat, d.lon], 60);
    const k = 3 + Math.floor(Math.random() * 52), [lat, lon] = path[k], ty = DEMO_TYPES[i % DEMO_TYPES.length];
    upsert({ id: 'd' + i, cs: al + (100 + Math.floor(Math.random() * 900)), country: 'Demo', lat, lon, ground: false,
      alt: 6000 + Math.random() * 5500, spd: 190 + Math.random() * 70, hdg: brg(lat, lon, d.lat, d.lon), vr: 0,
      route: demoRoute(al, o, d), rs: 'ok', as: 'ok', ac: { type: ty[1], icaoType: ty[0], reg: 'TC-' + L3() + L3() + L3(), owner: AIRLINE[al][0], country: '' },
      tr: path.slice(Math.max(0, k - 20), k + 1) }); // demo: trail of the last ~20 points
  }
  // so the emergency marker can be seen in demo mode too
  const e = flights.get('d4'); if (e) { e.sq = '7700'; e.emg = 'general'; }
}
function upsert(d) {
  let f = flights.get(d.id);
  if (!f) { f = { tr: [], gone: replay }; flights.set(d.id, f); } // an aircraft that arrives during replay wasn't in that frame
  Object.assign(f, d); X.event(f); return f;
}
function clearAll() { flights.clear(); hist.length = 0; select(null); redraw(); }

/* ---------- route (from → to) ---------- */
// Cache: a found route is valid for 6 hours, a "none" answer for 10 min. Errors (network, 429) aren't cached; the aircraft is retried after 60 s, and all requests wait 30 s in the meantime.
const TTL_OK = 6 * 3600e3, TTL_NONE = 600e3, RETRY_MS = 60e3, BACKOFF_MS = 30e3;
let dbPause = 0;
const fresh = (c, k) => { const e = c.get(k); return e && Date.now() - e.t < (e.v ? TTL_OK : TTL_NONE) ? e : null; };
const canLoad = (f, k) => !f[k] || (f[k] === 'err' && Date.now() - f[k + 'At'] > RETRY_MS);
const failed = (f, k) => { f[k] = 'err'; f[k + 'At'] = Date.now(); dbPause = Date.now() + BACKOFF_MS; };
async function loadRoute(f) {
  if (!canLoad(f, 'rs')) return;
  if (f.cs === f.id.toUpperCase()) { f.rs = 'none'; return showRoute(f); } // no callsign (fell back to hex): nothing to look up
  f.rs = 'loading'; let e = fresh(routeCache, f.cs);
  if (!e) { if (Date.now() < dbPause) { f.rs = 'err'; f.rsAt = Date.now(); return showRoute(f); }
    const res = await DATA.route(f.cs); if (!res.ok) { failed(f, 'rs'); return showRoute(f); } e = { v: res.route, t: Date.now() }; routeCache.set(f.cs, e); }
  f.route = e.v; f.rs = e.v ? 'ok' : 'none'; if (e.v) { addAp(e.v.org); addAp(e.v.dst); } showRoute(f);
}
function showRoute(f) { if (f.id !== selected) return; if (!replay) drawRoute(f); renderCard(true); }
// Departure → aircraft → arrival, as great-circle arcs
// Flown: the real trace from adsb.lol when available (otherwise a great-circle arc from the departure airport); rest: great circle to the destination
// The day's trace can still contain the previous leg (e.g. the aircraft landed here earlier and turned around quickly without ground reports):
// start the drawn path at the last point near the departure airport, so it never reaches back into an earlier flight
// If the departure was never seen (no coverage there, so the previous landing wasn't seen either), the earlier leg flew towards the departure
// airport, i.e. away from the destination: the current leg starts at the trace point farthest from the destination.
const flownLeg = f => { const t = f.flown, o = f.route.org, d = f.route.dst; if (!(t?.length > 1)) return null;
  for (let k = t.length - 1; k > 0; k--) if (km(t[k][0], t[k][1], o.lat, o.lon) < 40) return t.slice(k);
  let m = 0, far = -1; t.forEach((q, k) => { const x = km(q[0], q[1], d.lat, d.lon); if (x >= far) { far = x; m = k; } });
  return t.slice(m); };
const routePts = f => { const { org, dst } = f.route, p = [f.lat, f.lon], fl = flownLeg(f);
  const done = fl?.length > 1 ? [...fl, p] : gc([org.lat, org.lon], p);
  return { done: unwrap(done), rest: unwrap(gc(p, [dst.lat, dst.lon])) }; };
// Path flown so far (live only); refreshed at most once a minute while the aircraft is selected
async function loadTrace(f) {
  if (!live || f.trAt && Date.now() - f.trAt < 60000) return; f.trAt = Date.now();
  const res = await DATA.trace(f.id); if (!res.ok) return;
  f.flown = res.points; if (f.id === selected && !replay && f.route) { const p = routePts(f); setRoute(p.done, p.rest); }
}
function drawRoute(f) {
  routeEnds.clearLayers();
  if (!f || !f.route) return setRoute([]);
  { const p = routePts(f); setRoute(p.done, p.rest); }
  [f.route.org, f.route.dst].forEach(a => L.circleMarker([a.lat, a.lon], { radius: 7, color: '#fff', weight: 2.5, fillColor: ROUTE_C, fillOpacity: 1, interactive: false })
    .bindTooltip(esc(a.code), { permanent: true, direction: 'top', offset: [0, -8], className: 'apl' }).addTo(routeEnds));
}

/* ---------- aircraft info (type, registration, photo) ---------- */
async function loadAircraft(f) {
  if (!canLoad(f, 'as')) return;
  f.as = 'loading'; let e = fresh(acCache, f.id);
  if (!e) { if (Date.now() < dbPause) { f.as = 'err'; f.asAt = Date.now(); return; }
    const res = await DATA.aircraft(f.id); if (!res.ok) return failed(f, 'as'); e = { v: res.aircraft, t: Date.now() }; acCache.set(f.id, e); }
  f.ac = e.v; f.as = e.v ? 'ok' : 'none'; if (f.id === selected) renderCard(true);
  loadPhotos(f);
}
// Photos: planespotters (448 px, possibly several) first, then the full-size adsbdb photo (or its thumbnail as a last resort)
async function loadPhotos(f) {
  if (f.pics) return; let e = fresh(picCache, f.id);
  if (!e) { const res = await DATA.photos(f.id); e = { v: res.ok ? res.photos : [], t: Date.now() }; if (res.ok) picCache.set(f.id, e); }
  const ac = f.ac || {}, extra = ac.photo || ac.thumb;
  f.pics = [...e.v, ...(extra && !e.v.length ? [{ src: extra, link: ac.photo || extra, by: '' }] : [])]; f.pi = 0;
  if (f.id === selected) renderCard(true);
}
const photoHtml = f => { const ac = f.ac || {}, pics = f.pics || (ac.thumb ? [{ src: ac.thumb, link: ac.photo || ac.thumb, by: '' }] : []); if (!pics.length) return '';
  const i = (f.pi || 0) % pics.length, p = pics[i], nav = pics.length > 1;
  return `<div class="ph"><a href="${esc(p.link || p.src)}" target="_blank" title="${t('Open photo')}"><img src="${esc(p.src)}" alt="" onerror="this.parentNode.parentNode.remove()"></a>`
    + (nav ? `<button class="pa l" id="pp" title="${t('Previous photo')}">‹</button><button class="pa r" id="pn" title="${t('Next photo')}">›</button><span class="pc">${i + 1} / ${pics.length}</span>` : '')
    + (p.by ? `<span class="by" title="${t('Photo')}: ${esc(p.by)}">© ${esc(p.by)}</span>` : '') + `</div>`; };
function nearest(f) { let b = null, m = 1e9; AP.forEach(a => { const d = km(f.lat, f.lon, a[2], a[3]); if (d < m) { m = d; b = a; } }); return `${b[0]} · ${Math.round(m)} km`; }
// Trail: positions recorded every 5 s since the app first saw this aircraft
const drawTrail = f => trail.setLatLngs(f && !f.route ? unwrap([...f.tr, [f.lat, f.lon]].map(p => [p[0], p[1]])) : []); // the blue route replaces the trail once the route is known

/* ---------- main loop (1 s) ---------- */
setInterval(() => {
  tick++;
  flights.forEach(f => {
    if (!live && f.route) { const d = f.route.dst;
      if (km(f.lat, f.lon, d.lat, d.lon) < 15) { X.arrive(f); f.route = demoRoute(f.cs.slice(0, 3), d, pickDst(d)); f.tr = []; if (f.id === selected) { if (!replay) drawRoute(f); renderCard(true); } }
      f.hdg = brg(f.lat, f.lon, f.route.dst.lat, f.route.dst.lon); }
    const dist = f.spd * ts, h = f.hdg * R;
    f.lat += Math.cos(h) * dist / 111320; f.lon += Math.sin(h) * dist / (111320 * Math.cos(f.lat * R));
    if (f.lon > 180) f.lon -= 360; else if (f.lon < -180) f.lon += 360;
    if (zone) { const inn = km(f.lat, f.lon, zone.lat, zone.lon) < zoneR(); if (inn && (f.in === false || (f.in === undefined && tick > 1))) toast(t('{0} entered the alert zone', f.cs)); f.in = inn; }
    if (tick % 5 === 0) { f.tr.push([f.lat, f.lon]); if (f.tr.length > 360) f.tr.shift(); } // each aircraft's last ~30 min trail
  });
  const s = flights.get(selected); if (s && !replay) { drawTrail(s); if (s.route) { const p = routePts(s); setRoute(p.done, p.rest); } if (tick % 30 === 0) loadTrace(s); }
  if (tick % 5 === 0) { // history recording: every 5 s, at most 720 frames. Recording continues while replaying
    // One Float32Array per frame (lat, lon, hdg triples) + an id list: far less memory than many small arrays with thousands of aircraft
    const ids = [], buf = new Float32Array(flights.size * 3); let i = 0;
    flights.forEach(f => { ids.push(f.id); buf[i++] = f.lat; buf[i++] = f.lon; buf[i++] = f.hdg; });
    hist.push({ t: Date.now(), ids, buf });
    if (hist.length > 720) { hist.shift(); if (replay) $('rpS').value = Math.max(0, +$('rpS').value - 1); } // the oldest frame was dropped: keep the viewed frame the same
    $('rpS').max = hist.length - 1; if (!replay) $('rpS').value = hist.length - 1;
  }
  redraw(); if (selected) renderCard();
}, 1000);

/* ---------- live data ---------- */
// Requests an area slightly larger than the visible one; panning/zooming within that area makes no new request
const LIVE_MS = 15000;
let fetchedBox = null, fetchedAt = 0, reqId = 0, moveTimer = null, lastReq = 0;
async function poll(force) {
  if (!live) return; const v = map.getBounds();
  if (!force && fetchedBox && fetchedBox.contains(v) && Date.now() - fetchedAt < LIVE_MS) return;
  if (!force && Date.now() - lastReq < 3000) return; lastReq = Date.now(); // at least 3 s between pan-triggered requests to stay under the rate limit
  const b = v.pad(.15), id = ++reqId, cl = (x, m) => Math.max(-m, Math.min(m, x)).toFixed(2);
  fetchedBox = b; fetchedAt = Date.now(); $('st').textContent = t('loading…');
  const r = await DATA.flights({ s: cl(b.getSouth(), 85), n: cl(b.getNorth(), 85), w: cl(b.getWest(), 180), e: cl(b.getEast(), 180) });
  if (!live || id !== reqId) return; // the map changed again in the meantime: discard the stale response
  if (!r.ok) { fetchedBox = null; $('st').textContent = t('error') + ': ' + r.error; return; }
  // If the source covered only part of the area (adsb.lol, wide view), count only the covered area as "fetched"; otherwise edges left empty won't load when panning
  if (r.covered) fetchedBox = L.latLngBounds([r.covered.s, r.covered.w], [r.covered.n, r.covered.e]);
  const seen = new Set(r.flights.map(d => d.id));
  flights.forEach((f, id) => { if (!seen.has(id) && !watch.has(id)) { flights.delete(id); if (selected === id) select(null); } });
  r.flights.forEach(upsert); redraw();
  $('st').textContent = `${r.src} · ${t('last updated')} ${new Date().toLocaleTimeString(LOC())}${r.partial ? ' · ' + t('wide view: center only, zoom in') : ''}`;
  pumpRoutes();
}
setInterval(() => poll(true), LIVE_MS);
map.on('moveend', () => { clearTimeout(moveTimer); moveTimer = setTimeout(() => { poll(); pumpRoutes(); }, 400); }); // when zooming/panning ends, request the new area right away
function setMode(l) {
  live = l; ts = l ? 1 : 30; exitReplay(); $('mLive').classList.toggle('on', l); $('mDemo').classList.toggle('on', !l); clearAll(); fetchedBox = null;
  if (l) poll(true); else { seedDemo(); $('st').textContent = t('demo (30x speed)'); }
  redraw();
}
$('mDemo').onclick = () => setMode(false); $('mLive').onclick = () => setMode(true);

/* ---------- airports ---------- */
const apLayer = L.layerGroup().addTo(map);
APO.forEach(a => L.circleMarker([a.lat, a.lon], { radius: 6, color: '#000', weight: 1, fillColor: '#f2c230', fillOpacity: 1 }).bindTooltip(`${a.code} · ${a.name}`)
  .on('click', e => { L.DomEvent.stopPropagation(e); openAp(a); }).addTo(apLayer));
$('bAp').onclick = function () { const on = !map.hasLayer(apLayer); on ? apLayer.addTo(map) : apLayer.remove(); this.classList.toggle('on', on); };

/* ---------- airport panel: photo, weather, arrivals / departures ---------- */
// Arrivals / departures come from the aircraft we already see: those within AP_R km whose route (adsbdb / demo) ends or starts at this airport
const AP_R = 600, WX = { 0: ['Clear sky', '☀️'], 1: ['Mostly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'], 45: ['Fog', '🌫️'], 48: ['Freezing fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'], 56: ['Freezing drizzle', '🌧️'], 57: ['Freezing drizzle', '🌧️'], 61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'], 66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'], 71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'],
  80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Violent showers', '⛈️'], 85: ['Snow showers', '🌨️'], 86: ['Snow showers', '🌨️'], 95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm, hail', '⛈️'], 99: ['Thunderstorm, hail', '⛈️'] };
const apCache = new Map(); let apSel = null;
function openAp(a) {
  select(null); apSel = { ...a, tab: 'arr' }; $('apc').classList.add('show'); renderAp(); loadAp(apSel); pumpAp();
}
function closeAp() { apSel = null; $('apc').classList.remove('show'); }
async function loadAp(s) {
  let e = apCache.get(s.code);
  if (!e || Date.now() - e.t > 600e3) { const [r, m] = await Promise.all([DATA.airport(s.lat, s.lon), DATA.metar(s.lat, s.lon)]);
    e = r.ok ? { v: { ...r, metar: m.ok ? m : null }, t: Date.now() } : null; if (e) apCache.set(s.code, e); }
  if (apSel !== s) return; s.info = e?.v; s.err = !e; renderAp();
}
function apFlights(s, k) { // k: 'dst' (arrivals) | 'org' (departures)
  return [...flights.values()].filter(f => !f.gone && apIs(f.route?.[k], s.code)).map(f => ({ f, d: km(f.lat, f.lon, s.lat, s.lon) })).filter(x => x.d < AP_R).sort((a, b) => a.d - b.d);
}
function apRows(s) {
  const arr = s.tab === 'arr', k = arr ? 'dst' : 'org', o = arr ? 'org' : 'dst', list = apFlights(s, k);
  if (!list.length) return `<div class="none">${live && !flights.size ? t('No aircraft loaded yet') : t(arr ? 'No arrivals found nearby' : 'No departures found nearby')}</div>`;
  return list.slice(0, 40).map(({ f, d }) => {
    const st = f.ground ? (arr && d < 25 ? t('landed') : t('on ground')) : `${Math.round(d)} km${arr && f.spd > 30 ? ' · ~' + eta(d / (f.spd * 3.6)) : ''}`;
    return `<div class="row" data-id="${esc(f.id)}"><b>${esc(f.cs)}</b><span>${esc(f.route[o].code)} · ${st}</span></div>`; }).join('');
}
function renderAp() {
  const s = apSel; if (!s) return; const i = s.info, w = i?.weather, p = i?.place, x = w && (WX[w.code] || ['—', '']);
  const place = p ? [p.city, p.country].filter(Boolean).join(', ') : t(s.err ? 'Couldn\'t load airport info' : 'Loading…');
  const ph = i?.photo ? `<div class="ph"><a href="${esc(i.photo.link || i.photo.src)}" target="_blank" title="${t('Open on Wikipedia')}"><img src="${esc(i.photo.src)}" alt="" onerror="this.parentNode.parentNode.remove()"></a><span class="by">Wikipedia</span></div>` : '';
  const wx = w ? `<div class="wx"><span class="i">${x[1]}</span><div class="d">${t(x[0])}<br><small>${t('Feels like')} ${Math.round(w.feels)}°C</small></div><span class="t">${Math.round(w.temp)}°C</span></div>`
    + `<div class="wg"><div><span>${t('Wind')}</span><b>${Math.round(w.wind)} kt ${Math.round(w.dir)}°</b></div><div><span>${t('Gusts')}</span><b>${Math.round(w.gust)} kt</b></div>`
    + `<div><span>${t('Humidity')}</span><b>${Math.round(w.hum)}%</b></div><div><span>${t('Pressure')}</span><b>${Math.round(w.pres)} hPa</b></div>`
    + `<div><span>${t('Visibility')}</span><b>${w.vis == null ? '—' : w.vis >= 10000 ? (w.vis / 1000).toFixed(0) + ' km' : (w.vis / 1000).toFixed(1) + ' km'}</b></div></div>`
    : `<div class="rtx" style="margin-top:12px">${t(s.err ? 'Weather unavailable' : 'Loading weather…')}</div>`;
  const mt = i?.metar?.metar, metar = mt ? `<div class="mt"><span class="fc ${esc(mt.cat)}">${esc(mt.cat || 'METAR')}</span>${esc(mt.icao)}${mt.dist > 15 ? ' · ' + mt.dist + ' km' : ''}<code>${esc(mt.raw)}</code>`
    + (i.metar.taf ? `<details><summary>TAF</summary><code>${esc(i.metar.taf)}</code></details>` : '') + `</div>` : '';
  $('apc').innerHTML = `<div class="ch"><div class="cn"><h2>${esc(s.code)}</h2><small>${esc(s.name)}</small><br><small>${esc(place)}</small></div><button id="ax" class="ib" title="${t('Close')}">✕</button></div>`
    + `${ph}${wx}${metar}<div class="tabs"><button data-t="arr" class="${s.tab === 'arr' ? 'on' : ''}">${t('Arrivals')}</button><button data-t="dep" class="${s.tab === 'dep' ? 'on' : ''}">${t('Departures')}</button></div><div id="apr">${apRows(s)}</div>`;
}
$('apc').onclick = e => {
  if (e.target.id === 'ax') return closeAp();
  const t = e.target.closest('.tabs button'); if (t && apSel) { apSel.tab = t.dataset.t; return renderAp(); }
  const r = e.target.closest('.row'); if (r) select(r.dataset.id);
};
// Live mode: route info only arrives per aircraft, so load the routes of aircraft near the open airport in the background (at most 3 at a time)
let apJobs = 0;
function pumpAp() {
  if (!live || !apSel) return; const s = apSel;
  if (Date.now() < dbPause) { setTimeout(pumpAp, dbPause - Date.now() + 100); return; }
  const near = [...flights.values()].filter(f => !f.gone && canLoad(f, 'rs') && km(f.lat, f.lon, s.lat, s.lon) < 300).sort((a, b) => km(a.lat, a.lon, s.lat, s.lon) - km(b.lat, b.lon, s.lat, s.lon));
  for (const f of near) { if (apJobs >= 3) return; apJobs++; loadRoute(f).finally(() => { apJobs--; pumpAp(); }); }
}
setInterval(() => { if (apSel) { pumpAp(); if ($('apr')) $('apr').innerHTML = apRows(apSel); } }, 2000);

/* ---------- alert zone ---------- */
function drawZone() { zoneLayer && zoneLayer.remove(); zoneLayer = null; $('bZ').classList.toggle('on', !!zone);
  if (zone) zoneLayer = L.circle([zone.lat, zone.lon], { radius: zoneR() * 1000, color: '#ff6b5e', weight: 2, dashArray: '6 6', fillOpacity: .07, interactive: false }).addTo(map); }
$('bZ').onclick = () => { if (zone) { zone = null; save('sky.zone', null); drawZone(); } else { placing = true; toast(t('Click the map to set the zone center')); } };
$('zR').value = zoneR();
$('zR').onchange = function () { const r = Math.max(3, Math.min(500, Math.round(+this.value) || ZONE_R)); this.value = r; if (zone) { zone.r = r; save('sky.zone', zone); initIn(); drawZone(); } else zoneRDef = r; };
let zoneRDef = ZONE_R; // radius chosen while there's no zone; applied to the next zone
// When the zone changes, silently recompute whether each aircraft is "inside" (to avoid a flood of notifications)
const initIn = () => flights.forEach(f => { if (zone) f.in = km(f.lat, f.lon, zone.lat, zone.lon) < zoneR(); else delete f.in; });
drawZone();

/* ---------- replay history ---------- */
function exitReplay() { if (!replay) return; replay = false; $('rpLive').classList.add('on'); $('rpT').textContent = t('history');
  flights.forEach(f => { f.gone = false; f.rp = null; }); $('rpS').value = $('rpS').max; const s = flights.get(selected); drawRoute(s); drawTrail(s); redraw(); }
$('rpS').oninput = function () { const s = hist[+this.value]; if (!s) return; replay = true; $('rpLive').classList.remove('on');
  const m = new Map(s.ids.map((id, i) => [id, i * 3])); trail.setLatLngs([]); drawRoute(null);
  flights.forEach(f => { const o = m.get(f.id); f.gone = o === undefined; f.rp = o === undefined ? null : [s.buf[o], s.buf[o + 1], s.buf[o + 2]]; }); redraw();
  $('rpT').textContent = new Date(s.t).toLocaleTimeString(LOC()); };
$('rpLive').onclick = exitReplay;

/* ---------- selection, favorites, panel, list ---------- */
function select(id) {
  closeAp(); X.sel(); selected = id; const f = flights.get(id);
  if (f) { map.panTo(f.rp ? [f.rp[0], f.rp[1]] : [f.lat, f.lon]); if (live) { loadRoute(f); loadAircraft(f); loadTrace(f); } }
  if (replay) { drawRoute(null); trail.setLatLngs([]); } else { drawRoute(f); drawTrail(f); } redraw(); // don't mix a trail/route drawn for the live position into replay
  $('card').classList.toggle('show', !!f); if (f) renderCard(true); renderList();
}
const ft = m => Math.round(m * 3.281).toLocaleString(LOC()) + ' ft';
function renderCard(full) {
  const f = flights.get(selected); if (!f) return;
  const ac = f.ac || {};
  if (full) {
    const iata = f.route?.airlineIata, sub = f.route?.airline || ac.owner || ac.country || f.country || '';
    const photo = photoHtml(f);
    $('card').innerHTML = `<div class="ch">${iata ? `<img class="logo" src="https://images.kiwi.com/airlines/64/${esc(iata)}.png" alt="" onerror="this.remove()">` : ''}`
      + `<div class="cn"><h2>${esc(f.cs)}</h2><small>${esc(sub)}</small></div><button id="cx" class="ib" title="${t('Close')}">✕</button></div>${X.top(f)}${photo}${routeHtml(f)}<div id="kvs"></div>${X.bottom(f)}<div class="bt"><button id="fv"></button><button id="wt"></button></div>${X.bottom2(f)}`;
  }
  if (f.route && $('pgb')) { const { org, dst } = f.route, a = km(org.lat, org.lon, f.lat, f.lon), b = km(f.lat, f.lon, dst.lat, dst.lon);
    $('pgb').style.width = Math.min(100, a / (a + b) * 100).toFixed(1) + '%';
    $('pgt').textContent = t('{0} km flown · {1} km to go', Math.round(a), Math.round(b)) + (f.spd > 30 ? ' · ~' + eta(b / (f.spd * 3.6)) : ''); }
  const rows = [
    ['Aircraft type', ac.type || f.type || (f.as === 'loading' ? '…' : '—')], ['Registration', ac.reg || f.reg || '—'],
    ['Altitude', f.ground ? t('on ground') : ft(f.alt)], ['Speed', Math.round(f.spd * 1.944) + ' kt'], ['Heading', Math.round(f.hdg) + '°'],
    ['Vertical speed', Math.round(f.vr * 196.85) + ' ft/min'], ['Nearest airport', nearest(f)], ['Position', f.lat.toFixed(2) + ', ' + f.lon.toFixed(2)]];
  if (ac.owner && ac.owner !== f.route?.airline) rows.splice(2, 0, ['Owner', ac.owner]);
  X.rows(f, rows);
  $('kvs').innerHTML = rows.map(r => `<div class="kv"><span>${t(r[0])}</span><b>${esc(r[1])}</b></div>`).join('');
  $('fv').textContent = fav.has(f.id) ? t('★ Favorited') : t('☆ Favorite'); X.sync(f);
}
const eta = h => h < 1 ? Math.round(h * 60) + t(' min') : Math.floor(h) + t(' h ') + Math.round(h % 1 * 60) + t(' min');
function routeHtml(f) {
  if (!f.route) return `<div class="rtx" style="margin-top:12px">${t({ loading: 'Loading route info…', none: 'Route info not found', err: 'Couldn\'t load route info' }[f.rs] || '')}</div>`;
  const { org, dst } = f.route;
  return `<div class="rt"><div><b>${esc(org.code)}</b><small title="${esc(org.name)}">${esc(org.name)}</small></div><span>✈</span>`
    + `<div><b>${esc(dst.code)}</b><small title="${esc(dst.name)}">${esc(dst.name)}</small></div></div><div class="pg"><i id="pgb"></i></div><div class="rtx" id="pgt"></div>`;
}
$('card').onclick = e => {
  if (e.target.id === 'cx') return select(null);
  if (X.click(e)) return;
  if (e.target.id === 'pp' || e.target.id === 'pn') { const f = flights.get(selected), n = f?.pics?.length; if (!n) return;
    f.pi = ((f.pi || 0) + (e.target.id === 'pn' ? 1 : n - 1)) % n; return renderCard(true); }
  if (e.target.id !== 'fv') return;
  fav.has(selected) ? fav.delete(selected) : fav.add(selected); save('sky.fav', [...fav]); renderCard(); renderList(); redraw();
};
function renderList() {
  const q = $('q').value.trim().toLowerCase();
  const arr = [...flights.values()].filter(f => vis(f) && (f.cs.toLowerCase().includes(q) || (f.reg || '').toLowerCase().includes(q))).sort((a, b) => (a.ground - b.ground) || (/^[A-Z]{2,3}\d/.test(b.cs) - /^[A-Z]{2,3}\d/.test(a.cs)) || a.cs.localeCompare(b.cs)).slice(0, 200); // airborne flights with callsigns first
  for (const f of flights.values()) { const c = acCode(f); if (c && !knownTypes.has(c)) { knownTypes.add(c); const o = document.createElement('option'); o.value = c; if (f.ac?.type) o.label = f.ac.type; $('tpList').appendChild(o); } }
  for (const f of flights.values()) { const c = airCode(f); if (c) addAir(c, f.route?.airline); }
  const emgN = [...flights.values()].filter(f => !f.gone && isEmg(f)).length;
  $('meta').textContent = `${arr.length} / ${flights.size} ${t('FLIGHTS')}` + (emgN ? ` · ⚠ ${emgN}` : '');
  let st = '';
  if (live && (flt.dep || flt.arr)) { const v = map.getBounds(), inV = [...flights.values()].filter(f => !f.ground && v.contains([f.lat, f.lon]));
    const done = inV.filter(f => f.rs && f.rs !== 'loading').length; if (done < inV.length) st = t('loading route info · {0} / {1} aircraft', done, inV.length); }
  $('apSt').textContent = st;
  $('list').innerHTML = arr.map(f => `<div class="row ${f.id === selected ? 'on' : ''}" data-id="${esc(f.id)}"><b>${isEmg(f) ? '⚠ ' : ''}${fav.has(f.id) ? '★ ' : ''}${esc(f.cs)}</b>`
    + `<span>${f.route ? esc(f.route.org.code + '→' + f.route.dst.code) + ' · ' : ''}${f.ground ? t('on ground') : Math.round(f.alt * 3.281 / 100) * 100 + ' ft'}</span></div>`).join('');
}
$('list').onpointerdown = e => { const r = e.target.closest('.row'); if (r) select(r.dataset.id); };
$('q').oninput = renderList; setInterval(renderList, 2000);
const knownTypes = new Set(), knownAir = new Set();
const addAir = (c, n) => { if (knownAir.has(c)) return; knownAir.add(c); const o = document.createElement('option'); o.value = c; if (n) o.label = n; $('alList').appendChild(o); };
Object.entries(AIRLINE).forEach(([c, a]) => addAir(c, a[0]));
const applyF = e => {
  // two handles on one bar: left = min, right = max altitude; they can't cross each other
  const a = $('fA'), m = $('fM');
  if (+a.value > +m.value) { if (e && e.target === m) m.value = a.value; else a.value = m.value; }
  flt.alt = +a.value; flt.maxAlt = +m.value; flt.spd = +$('fS').value; flt.fav = $('fF').checked; flt.ground = $('fG').checked;
  flt.dep = apCode($('fDep').value); flt.arr = apCode($('fArr').value); flt.type = $('fTp').value.trim().toUpperCase(); $('fTp').classList.toggle('set', !!flt.type); flt.air = $('fAl').value.trim().toUpperCase(); $('fAl').classList.toggle('set', !!flt.air);
  $('fDep').classList.toggle('set', !!flt.dep); $('fArr').classList.toggle('set', !!flt.arr); pumpRoutes();
  save('sky.flt', { a: a.value, m: m.value, s: $('fS').value, f: flt.fav, g: flt.ground, dep: $('fDep').value, arr: $('fArr').value, t: $('fTp').value, al: $('fAl').value });
  a.style.zIndex = flt.alt > 22500 ? 3 : 1; // so "min" can still be grabbed at the right end when the handles overlap
  $('dr').style.setProperty('--a', flt.alt / 450 + '%'); $('dr').style.setProperty('--b', flt.maxAlt / 450 + '%');
  $('vA').textContent = flt.alt.toLocaleString(LOC()); $('vM').textContent = flt.maxAlt >= 45000 ? (45000).toLocaleString(LOC()) + '+' : flt.maxAlt.toLocaleString(LOC()); $('vS').textContent = flt.spd;
  redraw(); renderList();
};
['fA', 'fM', 'fS', 'fF', 'fG', 'fDep', 'fArr', 'fTp', 'fAl'].forEach(i => $(i).oninput = applyF);
{ const v = LS('sky.flt', null); // restore the filters from the last session
  if (v) { $('fA').value = v.a; $('fM').value = v.m; $('fS').value = v.s; $('fF').checked = !!v.f; $('fG').checked = v.g !== false; $('fDep').value = v.dep || ''; $('fArr').value = v.arr || ''; $('fTp').value = v.t || ''; $('fAl').value = v.al || ''; } }
$('fSw').onclick = () => { const d = $('fDep').value; $('fDep').value = $('fArr').value; $('fArr').value = d; applyF(); };

/* ---------- airport filter (departure / arrival) ---------- */
// Known airports (suggestion list): the fixed list + route airports learned in live mode
const knownAps = new Map();
function addAp(a) { if (!a || !a.code || knownAps.has(a.code)) return; knownAps.set(a.code, a);
  const o = document.createElement('option'); o.value = a.code; o.label = a.name; $('apList').appendChild(o); }
APO.forEach(addAp);
// "IST", "ltfm" or "istanbul" → airport code
function apCode(v) {
  const u = v.trim().toUpperCase(); if (!u) return '';
  if (knownAps.has(u)) return u;
  for (const a of knownAps.values()) if (a.icao === u || (u.length > 2 && a.name.toUpperCase().includes(u))) return a.code;
  return u;
}
// In live mode route info only arrives when an aircraft is clicked; while a filter is active, load the routes of on-screen aircraft in the background (at most 3 at a time)
let routeJobs = 0, pumpT = null;
function pumpRoutes() {
  if (!live || (!flt.dep && !flt.arr)) return; const v = map.getBounds();
  if (Date.now() < dbPause) { clearTimeout(pumpT); pumpT = setTimeout(pumpRoutes, dbPause - Date.now() + 100); return; } // wait after 429/error
  for (const f of flights.values()) {
    if (routeJobs >= 3) return;
    if (!canLoad(f, 'rs') || f.ground || !v.contains([f.lat, f.lon])) continue;
    routeJobs++; loadRoute(f).finally(() => { routeJobs--; redraw(); pumpRoutes(); });
  }
}

/* ---------- collapsible menu + clock ---------- */
const setMenu = open => { $('side').classList.toggle('hide', !open); document.body.classList.toggle('closed', !open); save('sky.menu', open); };
$('close').onclick = () => setMenu(false); $('open').onclick = () => setMenu(true);
$('side').addEventListener('transitionend', () => { map.invalidateSize(); redraw(); });
setMenu(LS('sky.menu', true)); map.invalidateSize();
const clock = () => $('clock').textContent = new Date().toLocaleTimeString(LOC()); clock(); setInterval(clock, 1000);
map.on('click', e => {
  if (placing) { placing = false; zone = { lat: e.latlng.lat, lon: e.latlng.lng, r: zoneRDef }; save('sky.zone', zone); initIn(); drawZone(); toast(t('Alert zone set ({0} km)', zoneR())); return; }
  const f = hit(e.containerPoint); select(f ? f.id : null);
});
applyF(); setMode(false);
