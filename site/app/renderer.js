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
watch = new Map(LS('sky.watch', [])), flt = { alt: 0, maxAlt: 45000, spd: 0, maxSpd: 600, fav: false, ground: true, dep: '', arr: '', type: '', air: '' };
// Hooks filled in by extras.js (watchlist, today's flights, spotter logbook): they keep this file focused on the map itself
const X = { top: () => '', bottom: () => '', bottom2: () => '', rows: () => {}, sync: () => {}, click: () => false, event: () => {}, arrive: () => {}, sel: () => {} };
const EMG = { 7500: 'Hijacking', 7600: 'Radio failure', 7700: 'General emergency' }; // squawk codes
// A real emergency: squawk 7500 / 7600 / 7700, or the ADS-B emergency status that means the same (unlawful / nordo / general). Other status values
// ("lifeguard", "minfuel", "downed", "reserved") and ordinary squawks such as 1000 (a normal IFR code in Europe) are NOT shown as emergencies.
const EMG_STATUS = { unlawful: 7500, nordo: 7600, general: 7700 };
const emgCode = f => EMG[f.sq] ? +f.sq : EMG_STATUS[f.emg] || 0;
const isEmg = f => !!emgCode(f);
let HSTEP = LS('sky.hstep', 5), TRAIL = LS('sky.trail', 0); // history: seconds per frame (720 frames: 1 h / 3 h / 6 h); trails: 0 off, 1 short, 2 long
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
const vis = f => { const ft = f.alt * 3.281; return (!f.ground || flt.ground) && ft >= flt.alt && (flt.maxAlt >= 45000 || ft <= flt.maxAlt) && f.spd * 1.944 >= flt.spd && (flt.maxSpd >= 600 || f.spd * 1.944 <= flt.maxSpd) && (!flt.fav || fav.has(f.id))
  && (!flt.dep || apIs(f.route?.org, flt.dep)) && (!flt.arr || apIs(f.route?.dst, flt.arr)) && (!flt.type || typeIs(f, flt.type)) && (!flt.air || airIs(f, flt.air)); };
function toast(msg, id) {
  const emg = msg.startsWith('⚠'), d = document.createElement('div'); d.className = 'tm' + (emg ? ' emg' : '') + (id ? ' go' : ''); d.style.setProperty('--d', emg ? '8s' : '4s');
  d.innerHTML = `<i class="ti">${emg ? '⚠' : '✓'}</i><span></span><button class="tx" aria-label="Close"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg></button>`;
  d.querySelector('span').textContent = emg ? msg.slice(1).trim() : msg; $('toast').appendChild(d);
  d.onclick = e => { if (!e.target.closest('.tx') && id && flights.has(id)) select(id); d.remove(); };
  setTimeout(() => d.remove(), emg ? 8000 : 4000);
  if (LS('sky.notif', true)) try { const n = new Notification('SkyTrack', { body: msg }); n.onclick = () => { try { window.api?.show?.(); } catch {} if (id && flights.has(id)) select(id); }; } catch {}
}

/* ---------- aircraft: single canvas layer ---------- */
// Instead of a separate HTML element per aircraft, all are drawn on one canvas: stays smooth with thousands of aircraft
// Icon shapes (24x24, nose up): b = body, e = engines (outlined separately so each one is visible), r = rotor blades (helicopters, stroke only), d = rotor disc (filled, faint)
const SHAPES = {
  gen: { b: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z', s: 1 },
  air2: { b: 'M12 1.5c1 0 1.6 1.6 1.6 3.5v4l8.9 6v2l-8.9-2.8v5.3l2.4 2v1.3L12 21.8l-4 1v-1.3l2.4-2v-5.3L1.5 17v-2l8.9-6V5c0-1.9.6-3.5 1.6-3.5z',
    e: 'M6.2 11a1 1 0 0 1 2 0v2.8a1 1 0 0 1-2 0zM15.8 11a1 1 0 0 1 2 0v2.8a1 1 0 0 1-2 0z', s: 1 },
  air4: { b: 'M12 1.5c1 0 1.6 1.6 1.6 3.5v4l8.9 6v2l-8.9-2.8v5.3l2.4 2v1.3L12 21.8l-4 1v-1.3l2.4-2v-5.3L1.5 17v-2l8.9-6V5c0-1.9.6-3.5 1.6-3.5z',
    e: 'M6.5 10.6a1 1 0 0 1 2 0v2.8a1 1 0 0 1-2 0zM15.5 10.6a1 1 0 0 1 2 0v2.8a1 1 0 0 1-2 0zM2.8 12.8a1 1 0 0 1 2 0v2.8a1 1 0 0 1-2 0zM19.2 12.8a1 1 0 0 1 2 0v2.8a1 1 0 0 1-2 0z', s: 1.3 },
  jet: { b: 'M12 1c.9 0 1.4 2 1.4 4v5l6.6 5v1.8l-6.6-2v4.2l1.6 1.5v1.3L12 21l-3 .8v-1.3l1.6-1.5v-4.2l-6.6 2V15l6.6-5V5c0-2 .5-4 1.4-4z',
    e: 'M8.6 14.5a.9.9 0 0 1 1.8 0v4a.9.9 0 0 1-1.8 0zM13.6 14.5a.9.9 0 0 1 1.8 0v4a.9.9 0 0 1-1.8 0z', s: .9 },
  heli: { b: 'M12 3.6c2.4 0 3.8 2 3.8 4.6 0 2.2-.8 3.7-1.6 4.6h-4.4c-.8-.9-1.6-2.4-1.6-4.6 0-2.6 1.4-4.6 3.8-4.6zM11.2 12.4h1.6v7.4h-1.6zM9.3 18.6h5.4l-.6 1.7H9.9zM11.35 19.8h1.3v2.4h-1.3z', // cabin, tail boom, stabilizer, tail fin
    e: 'M7.1 6.8h1v6.4h-1zM15.9 6.8h1v6.4h-1z', // skids
    d: 'M22 8.6a10 10 0 1 1-20 0a10 10 0 1 1 20 0z', // faint rotor disc (filled)
    r: 'M5 1.6l14 14M19 1.6L5 15.6', rw: 1.1, ra: .8, s: 1.2 } // two rotor blades (thin strokes)
};
for (const k in SHAPES) { const o = SHAPES[k]; o.B = new Path2D(o.b); if (o.e) o.E = new Path2D(o.e); if (o.r) o.R = new Path2D(o.r); if (o.d) o.D = new Path2D(o.d); }
// Which icon an aircraft gets: helicopter / four-engine airliner / twin airliner / small jet / everything else
const HELI_RE = /^(EC\d\d|AS\d\d|AW\d\d|B06|B407|B412|B427|B429|B505|R22|R44|R66|S76|S92|S61|S64|A109|A119|A139|A149|A169|A189|MD52|MD60|MI\d|KA\d\d|NH90|H47|H53|H60|H64|H500|UH\d\d|CH\d\d|MH\d\d|BK17|EN28|EN48|SCOU|GAZL|LYNX|PUMA|TIGR)/;
const FOUR_ENG = new Set('A342 A343 A345 A346 A388 A124 A225 B741 B742 B743 B744 B74D B74R B74S B748 B703 B701 B720 B52 B1 C17 C5M C5 C135 K35R KC10 IL96 IL76 IL62 IL86 IL18 AN12 AN22 AN70 A400 C130 C30J L100 E3CF E6 DC8 DC85 DC86 DC87 B461 B462 B463 RJ70 RJ85 RJ1H VC10 TU95 TU16'.split(' '));
const JET_RE = /^(C25\w|C5[0-9]\w|C56X|C68A|C680|C700|C750|C510|C525|C550|E5[05]P|E545|E550|LJ\d\d|GLF\d|GL\d\d|GALX|FA\d\w|F2TH|F900|CL3\d|CL60|H25\w|HDJT|PC24|BE40|PRM1|ASTR|G150|G280|SF50|EA50|ECLP|F\d\d[A-Z]?$|EUFI|RFAL|TORN|GRIF|HAWK|T38|L39|A10|SU\d\d|MG\d\d)/;
const TWIN_RE = /^(A2\d\d|A3[0-9]\d|A\d\dN|B7[1-9]\d|B3[7-9]M|B3XM|E1\d\d|E2\d\d|E7\d\w|CRJ|CR\d|AT\d\d|DH8|SF34|B190|F100|F70|MD[89]\d|BCS|SU95|C919|ARJ|J328)/;
const kindOf = f => { const c = acCode(f), cat = f.cat || '';
  if (f._kk === c + cat) return f._k;
  const k = cat === 'A7' || HELI_RE.test(c) ? 'heli' : FOUR_ENG.has(c) ? 'air4' : JET_RE.test(c) || cat === 'A6' ? 'jet' : TWIN_RE.test(c) || /^A[345]$/.test(cat) ? 'air2' : 'gen';
  f._kk = c + cat; return f._k = k; };
map.createPane('planes').style.zIndex = 450;
/* ---------- thinning out crowded areas when zoomed out ---------- */
// Over a busy area at continent scale thousands of overlapping icons are unreadable and slow to draw. Above THIN_FROM visible aircraft we keep one per grid cell (the most
// interesting one) and make the cells just big enough to land near thinTarget(n): 500 aircraft -> ~325, 2000 -> ~775, at most 900. Zooming in leaves fewer aircraft on the
// screen, so they all come back by themselves. Favorites, watched aircraft, emergencies and the selected one are never hidden. Only the drawing is thinned: the data,
// the list, the search and the alerts still see every aircraft.
const THIN_FROM = 250; let thinOn = LS('sky.thin', true), thinCell = 16;
// The farther out, the fewer: at most 900 aircraft from zoom 6 on, about 390 at zoom 4 (continent scale), 225 at the very widest, growing smoothly as you zoom in
const thinCap = () => Math.round(900 * Math.max(.25, Math.min(1, (map.getZoom() - 2.5) / 3.5)));
const thinTarget = n => n <= THIN_FROM ? n : Math.min(thinCap(), Math.round(THIN_FROM + (n - THIN_FROM) * .3));
const hash01 = id => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return (h >>> 0) % 997 / 997; };
const thinScore = f => (f.ground ? 0 : 4) + (/^[A-Z]{3}\d/.test(f.cs) ? 1.5 : 0) + Math.min(1, f.alt / 12000) + ({ air4: 1, air2: .6, heli: .4 }[kindOf(f)] || 0) + (f._kept ? .6 : 0) + (f._h01 ??= hash01(f.id)) * .3; // _kept: a little stickiness, so icons do not flicker
const mustShow = f => fav.has(f.id) || watch.has(f.id) || isEmg(f);
function thinOut(cand) {
  const must = cand.filter(mustShow), rest = cand.filter(f => !mustShow(f)), target = Math.max(0, thinTarget(cand.length) - must.length);
  const cells = c => { const m = new Map(); for (const f of rest) { const k = Math.floor(f._p.x / c) * 4096 + Math.floor(f._p.y / c), sc = thinScore(f), b = m.get(k); if (!b || sc > b.sc) m.set(k, { f, sc }); } return m; };
  let m = cells(thinCell); // start from the last cell size: the view changes little from one frame to the next
  for (let i = 0; i < 8 && m.size > target; i++) m = cells(thinCell *= 1.15);
  for (let i = 0; i < 8 && thinCell > 12; i++) { const s = cells(thinCell / 1.15); if (s.size > target) break; thinCell /= 1.15; m = s; }
  const keep = must.concat([...m.values()].map(b => b.f)); cand.forEach(f => { f._kept = false; }); keep.forEach(f => { f._kept = true; });
  cand.forEach(f => { if (!f._kept) f._p = null; }); // hidden: not drawn and not hoverable
  return keep;
}
const thnEl = document.createElement('div'); thnEl.id = 'thn'; map.getContainer().appendChild(thnEl);
const setThn = (shown, total) => { const txt = shown < total ? t('Showing {0} of {1} aircraft · zoom in for all', shown, total) : ''; if (thnEl._t !== txt) { thnEl._t = txt; thnEl.textContent = txt; thnEl.style.display = txt ? 'block' : 'none'; } };
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
    if (TRAIL && !replay) { // fading-free, batched by color: one stroke per altitude color keeps thousands of trails cheap
      const N = TRAIL === 2 ? 360 : 60, paths = new Map(); let n = 0;
      flights.forEach(f => { if (f.gone || f.ground || !f.tr || f.tr.length < 2 || !vis(f) || n > 1500) return;
        const pts = f.tr.slice(-N), st = Math.max(1, Math.ceil(pts.length / 36)), col = color(f.alt); let p0 = null, path = paths.get(col); if (!path) paths.set(col, path = new Path2D());
        for (let i = 0; i < pts.length; i += st) { const p = map.latLngToContainerPoint([pts[i][0], nearLon(pts[i][1], cLon)]); i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y); p0 = p; }
        const q = map.latLngToContainerPoint([f.lat, nearLon(f.lon, cLon)]); path.lineTo(q.x, q.y); n++; });
      ctx.save(); ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.globalAlpha = .55; paths.forEach((pa, col) => { ctx.strokeStyle = col; ctx.stroke(pa); }); ctx.restore(); ctx.lineWidth = .7; ctx.strokeStyle = '#000'; }
    const cand = [];
    flights.forEach(f => {
      f._p = null; if (f.gone || !vis(f)) return;
      const [lat, lon, hdg] = f.rp || [f.lat, f.lon, f.hdg], p = map.latLngToContainerPoint([lat, nearLon(lon, cLon)]); // nearest world copy at the date line
      if (p.x < -20 || p.y < -20 || p.x > s.x + 20 || p.y > s.y + 20) return;
      f._p = p; f._h = hdg; if (f.id === selected) { sel = f; return; }
      cand.push(f);
    });
    const shown = thinOn && cand.length > THIN_FROM ? thinOut(cand) : cand; setThn(shown.length + (sel ? 1 : 0), cand.length + (sel ? 1 : 0));
    shown.forEach(f => {
      if (f.seen && Date.now() - f.seen > 45000) ctx.globalAlpha = .5; // not reported for a while: shown fainter, still moving
      icon(ctx, f._p, f._h, (f.ground ? 16 : 24) * k, f.ground ? '#9aa0a6' : color(f.alt), kindOf(f));
      ctx.globalAlpha = 1; rings(ctx, f, f._p, (f.ground ? 16 : 24) * k);
    });
    if (sel) { ctx.shadowColor = '#f2c230'; ctx.shadowBlur = 12; icon(ctx, sel._p, sel._h, 30, '#fff', kindOf(sel)); ctx.shadowBlur = 0; rings(ctx, sel, sel._p, 30); }
  }
});
// Emergency (squawk 7500/7600/7700): blinking red ring
function rings(ctx, f, p, size) {
  if (!isEmg(f)) return; ctx.save(); ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 2.5; ctx.globalAlpha = (Date.now() / 700 | 0) % 2 ? .35 : 1;
  ctx.beginPath(); ctx.arc(p.x, p.y, size * .85, 0, 7); ctx.stroke(); ctx.restore();
}
function icon(ctx, p, hdg, size, fill, kind = 'gen') {
  const sh = SHAPES[kind] || SHAPES.gen;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(hdg * R); const sc = size * sh.s / 24; ctx.scale(sc, sc); ctx.translate(-12, -12); ctx.lineWidth = .7 * Math.min(1, size / 24) / sc;
  if (sh.D) { ctx.save(); ctx.fillStyle = fill; ctx.globalAlpha = .16; ctx.fill(sh.D); ctx.restore(); }
  if (sh.R) { ctx.save(); ctx.strokeStyle = fill; ctx.lineCap = 'round'; ctx.globalAlpha = sh.ra || .9; ctx.lineWidth = sh.rw || 1.7; ctx.stroke(sh.R); ctx.restore(); }
  ctx.fillStyle = fill; ctx.fill(sh.B); ctx.stroke(sh.B);
  if (sh.E) { ctx.fill(sh.E); ctx.stroke(sh.E); }
  ctx.restore();
}
const planes = new PlaneLayer().addTo(map), redraw = () => planes.redraw();
// Click/hover: the nearest aircraft from the last drawn screen positions (within 14 px)
function hit(pt) { let best = null, bd = 12 * 12; flights.forEach(f => { if (!f._p) return; const d = (f._p.x - pt.x) ** 2 + (f._p.y - pt.y) ** 2; if (d < bd) { bd = d; best = f; } }); return best; }
map.on('mousemove', e => { const f = hit(e.containerPoint), h = $('hov');
  map.getContainer().style.cursor = f ? 'var(--ptr)' : '';
  if (!f) { h.style.display = 'none'; return; }
  h.style.display = 'block'; h.style.left = f._p.x + 16 + 'px'; h.style.top = f._p.y - 10 + 'px';
  h.textContent = `${f.cs}${f.route ? ' · ' + f.route.org.code + '→' + f.route.dst.code : ''} · ${f.ground ? t('on ground') : fmtAlt(f.alt * 3.281, 100)}`; });
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
  const was = f.ground; Object.assign(f, d); f.seen = d.stale ? Date.now() - 60000 : Date.now();
  if (was === false && f.ground) f.gAt = Date.now(); else if (!f.ground) { f.gAt = 0; f.landedAt = 0; } // gAt: we saw it touch down (used when the trace does not say when)
  X.event(f); return f;
}
function clearAll() { flights.clear(); hist.length = 0; replay = false; $('rpLive').classList.add('on'); $('rpT').textContent = t('history'); $('rpS').max = 0; $('rpS').value = 0; $('rpS').disabled = true; $('rpTip').classList.remove('show'); select(null); redraw(); }

/* ---------- route (from → to) ---------- */
// Cache: a found route is valid for 6 hours, a "none" answer for 10 min. Errors (network, 429) aren't cached; the aircraft is retried after 60 s, and all requests wait 30 s in the meantime.
const TTL_OK = 6 * 3600e3, TTL_NONE = 600e3, RETRY_MS = 60e3, BACKOFF_MS = 30e3;
let dbPause = 0;
const fresh = (c, k) => { const e = c.get(k); return e && Date.now() - e.t < (e.v ? TTL_OK : TTL_NONE) ? e : null; };
const canLoad = (f, k) => !f[k] || (f[k] === 'err' && Date.now() - f[k + 'At'] > RETRY_MS);
const failed = (f, k) => { f[k] = 'err'; f[k + 'At'] = Date.now(); dbPause = Date.now() + BACKOFF_MS; };
async function loadRoute(f) {
  if (!canLoad(f, 'rs')) return;
  // no callsign (fell back to hex), or one without a digit (TWR, GND, AOPS: control positions and ground vehicles, not flights): nothing to look up
  if (f.cs === f.id.toUpperCase() || !/\d/.test(f.cs)) { f.rs = 'none'; return showRoute(f); }
  f.rs = 'loading'; let e = fresh(routeCache, f.cs);
  // the pause after errors protects the service from background lookups; the aircraft the user just clicked is asked for anyway
  if (!e) { if (Date.now() < dbPause && f.id !== selected) { f.rs = 'err'; f.rsAt = Date.now(); return showRoute(f); }
    const res = await DATA.route(f.cs); if (!res.ok) { failed(f, 'rs'); return showRoute(f); } e = { v: res.route, t: Date.now() }; routeCache.set(f.cs, e); }
  f.routeDb = e.v; f.route = e.v; f.rs = e.v ? 'ok' : 'none'; if (e.v) { addAp(e.v.org); addAp(e.v.dst); reconcileRoute(f); } showRoute(f);
}
// The route database knows a callsign, not this one flight: airlines reuse callsigns, aircraft get swapped, flights divert, and after landing the crew often sets the callsign of the
// NEXT flight. So the route is checked against what the aircraft really did, from the trace of its flight:
//  - in the air: if the flight took off more than 60 km from the route's origin, the origin is the airport it took off from;
//  - just landed (on the ground, touchdown less than 25 min ago): the flight it has just completed is judged, its origin from the trace, its destination the airport it sits at.
// Aircraft that have been on the ground for longer are about to depart: the database route is the right one then. Anything else stays as the database says.
// Airports are looked up among the ones we know and then in the list of all airports with scheduled service (airports.js). Returns true if the airports changed.
const BIGAP = (window.AIRPORTS || '').split(';').filter(Boolean).map(a => { const [code, icao, name, lat, lon] = a.split('|'); return { code, icao, name, lat: +lat, lon: +lon }; });
function nearAirport(lat, lon, maxKm) {
  let best = null, bd = maxKm; knownAps.forEach(a => { const d = km(lat, lon, a.lat, a.lon); if (d < bd) { bd = d; best = a; } });
  if (best) return best; for (const a of BIGAP) { const d = km(lat, lon, a.lat, a.lon); if (d < bd) { bd = d; best = a; } } return best;
}
function reconcileRoute(f) {
  const r0 = f.routeDb; if (!r0) return false;
  const t0 = f.landedAt ? f.landedAt * 1000 : f.gAt || 0, justLanded = !!(f.ground && f.arr && (!t0 || Date.now() - t0 < 25 * 60e3));
  const st = justLanded ? f.arr.start : !f.ground && f.flown?.length > 1 ? f.flown[0] : null; let org = r0.org, dst = r0.dst;
  if (st && km(st[0], st[1], org.lat, org.lon) > 60) { const a = nearAirport(st[0], st[1], 25); if (a) org = a; }
  if (justLanded && km(st[0], st[1], f.lat, f.lon) > 30) { const a = nearAirport(f.lat, f.lon, 8); if (a && a.code !== org.code) dst = a; }
  const was = f.route; f.route = org === r0.org && dst === r0.dst ? r0 : { ...r0, org, dst, fixed: true };
  return !was || was.org.code !== f.route.org.code || was.dst.code !== f.route.dst.code;
}
function showRoute(f) { if (f.id !== selected) return; if (!replay) drawRoute(f); renderCard(true); }
// Departure → aircraft → arrival, as great-circle arcs
// Flown: the real trace from adsb.lol when available (otherwise a great-circle arc from the departure airport); rest: great circle to the destination
// The day's trace (already cut to the current flight by data.js legOf) may still start a bit before the departure airport: start the drawn path at the last point near it
const flownLeg = f => { const t = f.flown, o = f.route.org; if (!(t?.length > 1)) return null;
  for (let k = t.length - 1; k > 0; k--) if (km(t[k][0], t[k][1], o.lat, o.lon) < 40) return t.slice(k);
  return t; }; // the trace is already cut to the current flight (data.js legOf); a route origin that is nowhere near it is just a wrong/stale route, so don't cut anything
const routePts = f => { const { org, dst } = f.route, p = [f.lat, f.lon], fl = flownLeg(f);
  const done = fl?.length > 1 ? [...fl, p] : gc([org.lat, org.lon], p);
  return { done: unwrap(done), rest: unwrap(gc(p, [dst.lat, dst.lon])) }; };
// Path flown so far (live only); refreshed at most once a minute while the aircraft is selected
async function loadTrace(f) {
  if (!live || f.trAt && Date.now() - f.trAt < 60000) return; f.trAt = Date.now();
  const res = await DATA.trace(f.id); if (!res.ok) return;
  f.arr = res.arrival || null; f.flown = f.ground && f.arr ? f.arr.pts : res.points; // on the ground: draw the flight it just completed, not the taxi points
  f.prof = res.prof; f.landedAt = res.landedAt || 0; const fixed = reconcileRoute(f); if (fixed && f.id === selected) renderCard(true); if (f.id === selected && $('prf')) X.sync(f); if (f.id === selected && !replay && f.route) { const p = routePts(f); setRoute(p.done, p.rest); }
}
function drawRoute(f) {
  routeEnds.clearLayers();
  if (!f || !f.route) return setRoute([]);
  { const p = routePts(f); setRoute(p.done, p.rest); }
  [f.route.org, f.route.dst].forEach(a => L.circleMarker([a.lat, a.lon], { radius: 7, color: '#fff', weight: 2.5, fillColor: ROUTE_C, fillOpacity: 1, interactive: false })
    .bindTooltip(esc(a.code), { permanent: true, direction: 'top', offset: [0, -8], className: 'apl' }).addTo(routeEnds));
}

/* ---------- turbulence ahead (SIGMET / G-AIRMET advisories + pilot reports along the route ahead) ---------- */
const tbCache = new Map();
async function loadTurb(f) {
  if (f.ground || f.tbs === 'loading') return;
  const e = tbCache.get(f.id); if (e && Date.now() - e.t < 300e3) { f.tb = e.v; f.tbs = 'ok'; return; }
  if (f.tbs === 'err' && Date.now() - f.tbsAt < 60e3) return;
  f.tbs = 'loading'; const dest = f.route?.dst ? [f.route.dst.lat, f.route.dst.lon] : null;
  const res = await DATA.turb(SkyGeo.ahead(f.lat, f.lon, f.hdg, dest), f.alt * 3.281);
  if (!res.ok) { f.tbs = 'err'; f.tbsAt = Date.now(); } else { f.tb = res; f.tbs = 'ok'; tbCache.set(f.id, { v: res, t: Date.now() }); }
  if (f.id === selected) renderCard();
}
const fmtMass = kg => kg >= 1000 ? (kg / 1000).toFixed(1) + ' t' : Math.round(kg / 10) * 10 + ' kg';
const windRow = f => { if (f.ground || f.spd * 1.944 < 60) return null;
  const hw = f.ws != null && f.wd != null ? SkyFuel.headwind(f.ws, f.wd, f.hdg) : f.tas != null && f.th != null ? SkyFuel.headwindFromTas(f.tas, f.spd * 1.944, f.th, f.hdg) : null;
  if (hw == null || !Number.isFinite(hw)) return null;
  const a = Math.round(Math.abs(hw)), main = a < 5 ? t('No significant head/tailwind') : hw > 0 ? t('Headwind {0}', fmtSpd(a)) : t('Tailwind {0}', fmtSpd(a));
  return ['Wind', main + (f.ws != null && f.wd != null ? ` (${Math.round(f.wd)}°/${fmtSpd(f.ws)})` : '')]; };
// The bar assumes the tank held the whole trip's fuel plus a 45 min reserve (the real fuel load isn't public)
const fuelRow = f => { const dst = f.route?.dst; if (f.ground || !dst) return null; const gs = f.spd * 1.944, icao = f.ac?.icaoType || f.type;
  const left = km(f.lat, f.lon, dst.lat, dst.lon), flown = f.route.org ? km(f.route.org.lat, f.route.org.lon, f.lat, f.lon) : 0, r = SkyFuel.toGo(icao, left, gs); if (!r) return null;
  const rate = SkyFuel.rate(icao), reserve = rate * .75, trip = r.kg * (left + flown) / left, pct = Math.max(0, Math.min(100, (r.kg + reserve) / (trip + reserve) * 100)), col = pct > 40 ? '#4ade80' : pct > 20 ? '#facc15' : '#f87171';
  return ['Fuel to go (est.)', `≈ ${fmtMass(r.kg)}`, '', `<div class="fbar"><i style="width:${pct.toFixed(0)}%;background:${col}"></i></div><div class="fcap">CO₂ ${fmtMass(r.co2)} · ${t('~{0}% of tank left (est., incl. reserve)', Math.round(pct))}</div>`]; };
const turbRow = f => { if (f.ground) return null;
  if (f.tbs === 'ok') { const r = f.tb, k = r.km;
    return [t('Turbulence'), r.level >= 3 ? t('High turbulence risk ahead (~{0})', fmtDist(k)) : r.level === 2 ? t('Moderate turbulence possible ahead (~{0})', fmtDist(k)) : t('No turbulence reported or forecast on the route ahead'), 'tb' + r.level]; }
  return [t('Turbulence'), f.tbs === 'err' ? t('Turbulence info unavailable') : t('Checking route ahead…'), 'tbx']; };

/* ---------- aircraft info (type, registration, photo) ---------- */
async function loadAircraft(f) {
  if (!canLoad(f, 'as')) return;
  f.as = 'loading'; let e = fresh(acCache, f.id);
  if (!e) { if (Date.now() < dbPause && f.id !== selected) { f.as = 'err'; f.asAt = Date.now(); return; }
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
function nearest(f) { let b = null, m = 1e9; AP.forEach(a => { const d = km(f.lat, f.lon, a[2], a[3]); if (d < m) { m = d; b = a; } }); return `${b[0]} · ${fmtDist(m)}`; }
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
  if (tick % HSTEP === 0 || !hist.length) { // history recording: every HSTEP seconds (5 / 15 / 30), at most 720 frames. Recording continues while replaying
    // One Float32Array per frame (lat, lon, hdg triples) + an id list: far less memory than many small arrays with thousands of aircraft
    const ids = [], buf = new Float32Array(flights.size * 3); let i = 0;
    flights.forEach(f => { ids.push(f.id); buf[i++] = f.lat; buf[i++] = f.lon; buf[i++] = f.hdg; });
    hist.push({ t: Date.now(), ids, buf });
    if (hist.length > 720) { hist.shift(); if (replay) $('rpS').value = Math.max(0, +$('rpS').value - 1); } // the oldest frame was dropped: keep the viewed frame the same
    $('rpS').max = hist.length - 1; $('rpS').disabled = hist.length < 2; if (!replay) $('rpS').value = hist.length - 1; else rpTip();
  }
  redraw(); if (selected) renderCard();
}, 1000);

/* ---------- live data ---------- */
// Requests an area slightly larger than the visible one; panning/zooming within that area makes no new request
let osSet = null; // is an OpenSky account saved? (null = unknown / not the desktop app)
if (window.api?.openskyGet) window.api.openskyGet().then(r => { osSet = !!r.set; });
const LIVE_MS = 6000; // two feeds take turns, so each one gets ~5 requests/min for a close view
let fetchedBox = null, fetchedAt = 0, reqId = 0, moveTimer = null, lastReq = 0;
// Last good positions are kept for the next start, so the map is not empty while the first request is on its way (or when the data sources are busy)
const GRACE_MS = 75000; let cacheAt = 0;
function saveCache() { if (Date.now() - cacheAt < 60000) return; cacheAt = Date.now(); const v = map.getBounds();
  const a = [...flights.values()].filter(f => !f.gone && v.contains([f.lat, f.lon])).slice(0, 700).map(f => ({ id: f.id, cs: f.cs, reg: f.reg, type: f.type, country: f.country, lat: +f.lat.toFixed(4), lon: +f.lon.toFixed(4), ground: f.ground, alt: Math.round(f.alt), spd: Math.round(f.spd), hdg: Math.round(f.hdg), vr: f.vr, sq: f.sq, emg: f.emg, cat: f.cat }));
  save('sky.cache', { t: Date.now(), c: [map.getCenter().lat, map.getCenter().lng, map.getZoom()], f: a }); }
function loadCache() { const c = LS('sky.cache', null); if (!c || Date.now() - c.t > 1800e3) return; (c.f || []).forEach(d => { if (!flights.has(d.id)) upsert({ ...d, stale: true }); }); redraw(); }
// The free feeds answer one circle (250 nm at most) per request and allow about one request a second each. A Europe-sized view needs dozens of circles, so the normal
// refresh (6 circles every few seconds) would take a minute to fill it. So SkyTrack remembers which circles answered lately (`got`) and, whenever the visible map is not
// covered by them (a zoom out, a far jump, a long drag), fills the gap batch after batch, nearest the center first, skipping circles that are still fresh, and draws every
// answer at once (fillView). A new view cancels the old one, including its queued requests (see slot() in data.js).
const got = [], quiet = [], COVER_MS = 120000, FRESH_MS = 25000; // got: [lat, lon, radius km, time] of circles that answered; quiet: [s, n, w, e, until] areas that came back empty
const noteCov = cov => { const now = Date.now(); (cov || []).forEach(c => got.push([c[0], c[1], c[2], now])); while (got.length && (now - got[0][3] > COVER_MS || got.length > 220)) got.shift(); };
// How many of 25 sample points over the view are in no circle that answered within COVER_MS (and not in an area that just came back empty)
function uncovered(v) {
  const now = Date.now(), cs = got.filter(c => now - c[3] < COVER_MS), qs = quiet.filter(q => q[4] > now); let n = 0;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { const la = v.getSouth() + (v.getNorth() - v.getSouth()) * i / 4, lo = v.getWest() + (v.getEast() - v.getWest()) * j / 4;
    if (!cs.some(c => km(la, lo, c[0], c[1]) <= c[2]) && !qs.some(q => la >= q[0] && la <= q[1] && lo >= q[2] && lo <= q[3])) n++; }
  return n;
}
// Where the community has few receivers (the Gulf, Africa, oceans) a complete answer still has few aircraft: say so instead of leaving people wondering
// (about 20 per million km² in the Gulf, ~900 over Europe; the limit is 60)
function thin() {
  if (map.getZoom() > 7) return ''; const v = map.getBounds(), n = [...flights.values()].filter(f => !f.gone && !f.ground && v.contains([f.lat, f.lon])).length;
  const area = (v.getEast() - v.getWest()) * 111.2 * Math.cos(map.getCenter().lat * Math.PI / 180) * (v.getNorth() - v.getSouth()) * 111.2 / 1e6;
  return area > .5 && n / area < 60 ? ' · ' + t('Thin ADS-B coverage here: some aircraft may be missing') : '';
}
const FILL_MAX = 48; let filling = 0, fillBox = null, lastSrc = ''; // filling: reqId of the fill that is running (0 = none), fillBox: the area it is filling
async function fillView(bb, id) {
  const now = Date.now(), fresh = got.filter(c => now - c[3] < FRESH_MS).map(c => c.slice(0, 3)); // fixed for the whole fill, so the batch numbers stay valid
  let from = 0, total = 99, n = 0, dry = 0; const src = new Set(), ids = new Set(), res = () => ({ n, src: [...src].join(' + ') || lastSrc });
  while (from < Math.min(total, FILL_MAX)) {
    const k = from === 0 ? 1 : from < 3 ? 2 : 4, rf = await DATA.flights(bb, { from, count: k, fresh }); // 1 circle first (the first aircraft appear after ~1 s), then 2, then 4 at a time
    if (!live || id !== reqId) return { ...res(), done: false };
    if (!rf.ok) break; // rate limited or offline: what we have stays; the next refresh asks again for whatever is still uncovered
    total = rf.total ?? total; n++; String(rf.src || '').split(' + ').forEach(x => x && src.add(x)); rf.flights.forEach(upsert); noteCov(rf.cov); redraw(); from += k;
    // Where the community has few receivers (the Gulf, Africa, oceans) the outer circles come back empty: two batches in a row with (almost) nothing new end the fill early,
    // and that area is left alone for a while instead of being asked again at every refresh
    const before = ids.size; rf.flights.forEach(a => ids.add(a.id)); dry = from > 2 && ids.size - before < 3 ? dry + 1 : 0;
    if (total === 0) { quiet.push([+bb.s, +bb.n, +bb.w, +bb.e, Date.now() + 30000]); return { ...res(), done: true }; } // every circle here is fresh already: nothing to ask for
    if (dry >= 2) { quiet.push([+bb.s, +bb.n, +bb.w, +bb.e, Date.now() + 90000]); if (quiet.length > 8) quiet.shift(); return { ...res(), done: true }; }
    $('st').textContent = t('loading…') + ` ${Math.min(from, total)}/${Math.min(total, FILL_MAX)}`;
  }
  return { ...res(), done: from >= Math.min(total, FILL_MAX) && total <= FILL_MAX };
}
async function poll(force) {
  if (!live) return; const v = map.getBounds(), need = uncovered(v) >= 3; // need: part of the visible map has no fresh answer (a search, a far jump, a long drag, a zoom out)
  if (!force && !need && Date.now() - fetchedAt < LIVE_MS) return;
  { const gap = Date.now() - lastReq; if (!force && gap < 1200) { clearTimeout(moveTimer); moveTimer = setTimeout(() => poll(), 1250 - gap); return; } } lastReq = Date.now(); // at least 1.2 s between pan-triggered requests (the data layer spreads the load over several servers)
  // Zoomed far in while a wide fill is still running: that fill is now about an area the user left, so cancel it (the new view gets its own fill, or a regular refresh)
  const area = x => (x.getNorth() - x.getSouth()) * (x.getEast() - x.getWest());
  if (filling && fillBox && area(v) < .4 * area(fillBox)) { filling = 0; fillBox = null; reqId++; }
  if (filling && (!need || (fillBox && fillBox.contains(v)))) return; // a fill is running for this view: starting another one (or a regular refresh) would cancel it
  const b = v.pad(.25), id = ++reqId, cl = (x, m) => Math.max(-m, Math.min(m, x)).toFixed(2), bb = { s: cl(b.getSouth(), 85), n: cl(b.getNorth(), 85), w: cl(b.getWest(), 180), e: cl(b.getEast(), 180) };
  fetchedAt = Date.now(); $('st').textContent = t('loading…');
  // Fill the uncovered view circle by circle instead of waiting for one big answer (see fillView): the aircraft show up as they arrive
  if (need) { filling = id; const vb = v.pad(.08); fillBox = vb; // only just beyond the screen: no circles wasted off-screen
    const fv = await fillView({ s: cl(vb.getSouth(), 85), n: cl(vb.getNorth(), 85), w: cl(vb.getWest(), 180), e: cl(vb.getEast(), 180) }, id).finally(() => { if (filling === id) { filling = 0; fillBox = null; } });
    if (!live || id !== reqId) return;
    // not done = the view is bigger than one fill: the next fill continues with the gaps, but not back to back
    if (fv.n) { pollMs = fv.done ? LIVE_MS : 15000; $('st').title = ''; lastSrc = fv.src;
      $('st').textContent = `${fv.src} · ${t('last updated')} ${new Date().toLocaleTimeString(LOC(), TF())}${fv.done ? thin() : ' · ' + t('Wide view: filling in, zoom in for all')}`; saveCache(); pumpRoutes(); return; } }
  const r = await DATA.flights(bb);
  if (!live) return;
  if (id !== reqId) { if (r.ok) { r.flights.forEach(upsert); redraw(); } return; } // the map moved again meanwhile: the aircraft are still valid, so keep them, but do not touch the "fetched" area
  if (!r.ok) { pollMs = 25000; const busy = /429|rate|paused|credit|limit/i.test(r.error || '');
    $('st').textContent = t(busy ? 'Data sources are busy, retrying shortly. Showing the last known positions.' : 'No connection to the data sources. Showing the last known positions.') + (flights.size ? '' : ' ' + t('You can also try Demo mode.')); $('st').title = r.error || ''; return; }
  $('st').title = '';
  // Remember which circles answered (a fill skips them while they are fresh, and the view counts as covered where they are). OpenSky answers cover the whole requested area.
  if (r.cov) noteCov(r.cov); if ((r.src || '').includes('OpenSky') && !r.partial) { const c = b.getCenter(); noteCov([[c.lat, c.lng, km(b.getSouth(), b.getWest(), b.getNorth(), b.getEast()) / 2]]); }
  lastSrc = r.src || lastSrc;
  const seen = new Set(r.flights.map(d => d.id));
  // An aircraft that one answer does not mention is NOT removed at once: free feeds skip aircraft now and then, and partial answers miss everything outside
  // the covered area. It keeps flying (dead reckoning) and is dropped only after GRACE_MS without a sighting, and only if the area it is in was really covered.
  { const now = Date.now(), inCov = f => r.cov ? r.cov.some(c => km(f.lat, f.lon, c[0], c[1]) <= c[2]) : b.contains([f.lat, f.lon]); // only where an answer really came from
    flights.forEach((f, id) => { if (seen.has(id) || watch.has(id)) return; const age = now - (f.seen || 0);
      if ((age > GRACE_MS && inCov(f)) || age > 600000) { flights.delete(id); if (selected === id) select(null); } }); }
  r.flights.forEach(upsert); redraw(); saveCache();
  pollMs = r.partial || (r.src || '').includes('+ OpenSky') ? 12000 : LIVE_MS;
  $('st').textContent = `${r.src} · ${t('last updated')} ${new Date().toLocaleTimeString(LOC(), TF())}${r.partial ? ' · ' + t('wide view: center only, zoom in') : thin()}${r.partial && osSet === false ? ' · ' + t('Tip: add a free OpenSky account in Settings to fill the wide view') : ''}`;
  pumpRoutes();
}
// Self-scheduling refresh: 6 s normally, slower for wide views (more requests) and after errors, so the free feeds are not pushed into their rate limits
let pollMs = LIVE_MS;
(function loop() { setTimeout(async () => { try { await poll(true); } catch {} loop(); }, pollMs); })();
// The aircraft you follow is asked for on its own every 5 s (one tiny request): it never drops out of the big area answers, and its data is fresher
let trackBusy = false;
async function trackSelected() { const f = flights.get(selected); if (!live || replay || trackBusy || !f || !/^[0-9a-f]{6}$/i.test(f.id)) return; trackBusy = true;
  try { const r = await DATA.watch([f.id]); if (r.ok && live && selected === f.id) { r.flights.forEach(upsert); redraw(); } } finally { trackBusy = false; } }
setInterval(trackSelected, 5000);
map.on('moveend', () => { clearTimeout(moveTimer); moveTimer = setTimeout(() => { poll(); pumpRoutes(); }, 250); }); // when zooming/panning ends, request the new area right away
function setMode(l) {
  live = l; save('sky.live', l); ts = l ? 1 : 30; exitReplay(); $('mLive').classList.toggle('on', l); $('mDemo').classList.toggle('on', !l); clearAll(); fetchedBox = null; got.length = 0; quiet.length = 0;
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
    const ft_ = f.alt * 3.281, eta_ = !f.ground && f.spd > 30 ? '~' + eta(d / (f.spd * 3.6)) : '';
    const [st, cl] = f.ground ? [arr && d < 25 ? 'landed' : 'on ground', 'g'] : arr ? (d < 40 && ft_ < 5000 ? ['Landing', 'ok'] : d < 150 ? ['Approaching', 'am'] : ['En route', 'mu']) : (d < 60 && ft_ < 12000 ? ['Departed', 'ok'] : ['En route', 'mu']);
    return `<div class="row ar" data-id="${esc(f.id)}"><div class="rm"><b>${esc(f.cs)}</b><small>${esc(f.route[o].code)}${acCode(f) ? ' · ' + esc(acCode(f)) : ''}</small></div><div class="rs"><i class="sp ${cl}">${t(st)}</i><small>${fmtDist(d)}${eta_ ? ' · ' + eta_ : ''}</small></div></div>`; }).join('');
}
function renderAp() {
  const s = apSel; if (!s) return; const i = s.info, w = i?.weather, p = i?.place, x = w && (WX[w.code] || ['—', '']);
  const place = p ? [p.city, p.country].filter(Boolean).join(', ') : t(s.err ? 'Couldn\'t load airport info' : 'Loading…');
  const ph = i?.photo ? `<div class="ph"><a href="${esc(i.photo.link || i.photo.src)}" target="_blank" title="${t('Open on Wikipedia')}"><img src="${esc(i.photo.src)}" alt="" onerror="this.parentNode.parentNode.remove()"></a><span class="by">Wikipedia</span></div>` : '';
  const wx = w ? `<div class="wx"><span class="i">${x[1]}</span><div class="d">${t(x[0])}<br><small>${t('Feels like')} ${fmtTemp(w.feels)}</small></div><span class="t">${fmtTemp(w.temp)}</span></div>`
    + `<div class="wg"><div><span>${t('Wind')}</span><b>${fmtSpd(w.wind)} ${Math.round(w.dir)}°</b></div><div><span>${t('Gusts')}</span><b>${fmtSpd(w.gust)}</b></div>`
    + `<div><span>${t('Humidity')}</span><b>${Math.round(w.hum)}%</b></div><div><span>${t('Pressure')}</span><b>${Math.round(w.pres)} hPa</b></div>`
    + `<div><span>${t('Visibility')}</span><b>${w.vis == null ? '—' : fmtDist(w.vis / 1000, w.vis >= 10000 ? 0 : 1)}</b></div></div>`
    : `<div class="rtx" style="margin-top:12px">${t(s.err ? 'Weather unavailable' : 'Loading weather…')}</div>`;
  const mt = i?.metar?.metar, metar = mt ? `<div class="mt"><span class="fc ${esc(mt.cat)}">${esc(mt.cat || 'METAR')}</span>${esc(mt.icao)}${mt.dist > 15 ? ' · ' + fmtDist(mt.dist) : ''}<code>${esc(mt.raw)}</code>`
    + (i.metar.taf ? `<details><summary>TAF</summary><code>${esc(i.metar.taf)}</code></details>` : '') + `</div>` : '';
  $('apc').innerHTML = `<div class="ch"><div class="cn"><h2>${esc(s.code)}</h2><small>${esc(s.name)}</small><br><small>${esc(place)}</small></div><button id="ax" class="ib" title="${t('Close')}">✕</button></div>`
    + `${ph}${wx}${metar}<div class="tabs"><button data-t="arr" class="${s.tab === 'arr' ? 'on' : ''}">${t('Arrivals')} <em>${apFlights(s, 'dst').length}</em></button><button data-t="dep" class="${s.tab === 'dep' ? 'on' : ''}">${t('Departures')} <em>${apFlights(s, 'org').length}</em></button></div><div id="apr">${apRows(s)}</div>`;
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
setInterval(() => { if (apSel) { pumpAp(); if ($('apr')) { $('apr').innerHTML = apRows(apSel); const em = document.querySelectorAll('#apc .tabs em'); if (em.length === 2) { em[0].textContent = apFlights(apSel, 'dst').length; em[1].textContent = apFlights(apSel, 'org').length; } } } }, 2000);

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
  flights.forEach(f => { f.gone = false; f.rp = null; }); $('rpS').value = $('rpS').max; $('rpTip').classList.remove('show'); const s = flights.get(selected); drawRoute(s); drawTrail(s); redraw(); }
// Yellow/black label above the slider thumb: the time of the frame being viewed
function rpTip() {
  const tip = $('rpTip'), sl = $('rpS'), s = hist[Math.min(+sl.value, hist.length - 1)]; if (!s || !(replay || dragging)) return tip.classList.remove('show');
  const max = +sl.max || 1, th = 16, x = sl.offsetLeft + th / 2 + (+sl.value / max) * (sl.offsetWidth - th), ago = Math.round((Date.now() - s.t) / 1000);
  tip.textContent = new Date(s.t).toLocaleTimeString(LOC(), TF({ hour: '2-digit', minute: '2-digit', second: '2-digit' })) + ' · ' + (ago < 60 ? t('{0} s ago', ago) : t('{0} min ago', Math.round(ago / 60)));
  tip.style.left = Math.max(tip.offsetWidth / 2, Math.min($('rp').clientWidth - tip.offsetWidth / 2, x)) + 'px'; tip.classList.add('show');
}
let dragging = false;
$('rpS').onpointerdown = () => { dragging = true; }; addEventListener('pointerup', () => { if (dragging) { dragging = false; rpTip(); } });
$('rpS').oninput = function () { const s = hist[Math.min(+this.value, hist.length - 1)]; if (!s) return; replay = true; $('rpLive').classList.remove('on');
  const m = new Map(s.ids.map((id, i) => [id, i * 3])); trail.setLatLngs([]); drawRoute(null);
  flights.forEach(f => { const o = m.get(f.id); f.gone = o === undefined; f.rp = o === undefined ? null : [s.buf[o], s.buf[o + 1], s.buf[o + 2]]; }); redraw();
  $('rpT').textContent = new Date(s.t).toLocaleTimeString(LOC(), TF()); rpTip(); };
$('rpLive').onclick = exitReplay;

/* ---------- selection, favorites, panel, list ---------- */
function select(id) {
  closeAp(); X.sel(); selected = id; const f = flights.get(id);
  if (f) { map.panTo(f.rp ? [f.rp[0], f.rp[1]] : [f.lat, f.lon]); if (live) { loadRoute(f); loadAircraft(f); loadTrace(f); loadTurb(f); trackSelected(); } else if (window.SKY_WEB) loadTurb(f); } // web demo: simulated turbulence advisories (see webdemo.js)
  if (replay) { drawRoute(null); trail.setLatLngs([]); } else { drawRoute(f); drawTrail(f); } redraw(); // don't mix a trail/route drawn for the live position into replay
  $('card').classList.toggle('show', !!f); if (f) renderCard(true); renderList();
}
const ft = m => fmtAlt(m * 3.281);
// Flag of the country the aircraft is registered in (from the registration prefix); hidden if unknown or offline
function flagHtml(reg) {
  const c = SkyGeo.regCountry(reg); if (!c) return '';
  return `<img class="flag" src="https://flagcdn.com/w40/${c.toLowerCase()}.png" alt="${c}" title="${c}" onerror="this.remove()">`;
}
// Short labels for the three big tiles in the card (the full words do not fit in every language)
const TILE_L = { en: ['Altitude', 'Speed', 'Vert. speed'], tr: ['İrtifa', 'Hız', 'Dikey hız'], es: ['Altitud', 'Veloc.', 'Vel. vert.'], de: ['Höhe', 'Tempo', 'Steigrate'], fr: ['Altitude', 'Vitesse', 'Vit. vert.'] };
function renderCard(full) {
  const f = flights.get(selected); if (!f) return;
  const ac = f.ac || {};
  if (full) {
    const iata = f.route?.airlineIata, sub = f.route?.airline || ac.owner || ac.country || f.country || '';
    const photo = photoHtml(f);
    $('card').innerHTML = `<div class="ch">${iata ? `<img class="logo" src="https://images.kiwi.com/airlines/64/${esc(iata)}.png" alt="" onerror="this.remove()">` : ''}`
      + `<div class="cn"><h2>${esc(f.cs)}</h2><small>${esc(sub)}</small></div>${flagHtml(ac.reg || f.reg)}<button id="cx" class="ib" title="${t('Close')}">✕</button></div>${X.top(f)}${photo}${routeHtml(f)}<div id="kvs"></div>${X.bottom(f)}<div class="bt"><button id="fv"></button><button id="wt"></button></div>${X.bottom2(f)}`;
  }
  if (full) { const h = $('card').querySelector('h2'); if (h) for (let px = 26; px > 14 && h.scrollWidth > h.clientWidth; px--) h.style.fontSize = px + 'px'; } // long callsigns: shrink the font until the whole name fits
  if (f.route && $('pgb')) { const { org, dst } = f.route, a = km(org.lat, org.lon, f.lat, f.lon), b = km(f.lat, f.lon, dst.lat, dst.lon);
    const landed = f.ground && b < 25;
    $('pgb').style.width = Math.min(100, a / (a + b) * 100).toFixed(1) + '%';
    $('pgt').textContent = t('{0} flown · {1} to go', fmtDist(a), fmtDist(b)) + (f.spd > 30 ? ' · ~' + eta(b / (f.spd * 3.6)) + ' · ' + t('arrives {0}', new Date(Date.now() + b / (f.spd * 3.6) * 3600e3).toLocaleTimeString(LOC(), { hour: '2-digit', minute: '2-digit' })) : '')
      + (landed ? ' · ' + landedText(f) : f.ground ? ' · ' + t('on ground') : ''); // on the ground within 25 km of its destination: landed, and how long ago
    // on the ground the scene takes the place of the flying plane on the dashed line
    const fl = $('fl'); if (fl) { fl.classList.toggle('g', f.ground); gsMotion(f, fl, f.ground ? f.spd * 1.944 : 0); }
  }
  const rows = [
    ['Aircraft type', ac.type || f.type || (f.as === 'loading' ? '…' : '—')], ['Registration', ac.reg || f.reg || '—'],
    ['Altitude', f.ground ? t('on ground') : ft(f.alt)], ['Speed', fmtSpd(f.spd * 1.944)], ['Heading', Math.round(f.hdg) + '°'],
    ['Vertical speed', fmtVs(f.vr * 196.85)], ['Nearest airport', nearest(f)], ['Position', f.lat.toFixed(2) + ', ' + f.lon.toFixed(2)]];
  if (ac.owner && ac.owner !== f.route?.airline) rows.splice(2, 0, ['Owner', ac.owner]);
  { const w = windRow(f); if (w) rows.splice(rows.findIndex(r => r[0] === 'Vertical speed') + 1, 0, w); }
  X.rows(f, rows);
  { const fr = fuelRow(f); if (fr) rows.push(fr); }
  { const tr = (live || window.SKY_WEB) && turbRow(f); if (tr) rows.push(tr); } // last row, below Position
  const TL = TILE_L[LANG] || TILE_L.en, vsn = Math.round(f.vr * 196.85), sg = f.ground || !vsn ? '' : vsn > 0 ? '+' : '−', tiles = [
    [TL[0], f.ground ? '0' : nf(uAlt(f.alt * 3.281)[0]), uAlt(0)[1]], [TL[1], Math.round(uSpd(f.spd * 1.944)[0]), uSpd(0)[1]], [TL[2], sg + (U.alt === 'm' ? Math.abs(uVs(vsn)[0]).toFixed(1) : nf(Math.abs(vsn))), uVs(0)[1]]];
  const tl = `<div class="st3">${tiles.map(x => `<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b><small>${x[2]}</small></div>`).join('')}</div>`;
  for (const n of ['Altitude', 'Speed', 'Vertical speed']) { const k = rows.findIndex(r => r[0] === n); if (k >= 0) rows.splice(k, 1); }
  $('kvs').innerHTML = tl + rows.map(r => r[2] ? `<div class="kv tbr ${r[2]}"><b>${esc(r[1])}</b></div>` : `<div class="kv${r[3] ? ' xr' : ''}"><span>${t(r[0])}</span><b>${esc(r[1])}</b>${r[3] || ''}</div>`).join('');
  $('fv').textContent = fav.has(f.id) ? t('★ Favorited') : t('☆ Favorite'); X.sync(f);
}
// "landed 12 min ago": from the trace when it has the touchdown time, else from when we saw it touch down; otherwise just "landed"
function landedText(f) {
  const t0 = f.landedAt ? f.landedAt * 1000 : f.gAt || 0; if (!t0) return t('landed');
  const min = (Date.now() - t0) / 60000; return min < 1 ? t('just landed') : t('landed {0} ago', eta(min / 60));
}
const eta = h => h < 1 ? Math.round(h * 60) + t(' min') : Math.floor(h) + t(' h ') + Math.round(h % 1 * 60) + t(' min');
// Planes on the ground get a scene in the slot of the flying plane (between the two airport codes): a side view of the plane (nose to the right) in front of an airport that scrolls from
// right to left, at a speed that follows the plane's ground speed (see gsMotion); it plays as long as the plane is on the ground
const GS_WIN = (x0, n, step, y, w, h, op) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * step}" y="${y}" width="${w}" height="${h}" fill="#f2c230" opacity="${op}"/>`).join('');
const GS_FAR = `<g><rect x="57" y="14" width="6" height="30" fill="#34445a"/><path d="M49 14 L71 14 L66 5 L54 5Z" fill="#41546d"/><rect x="53" y="7.5" width="14" height="3" fill="#f2c230" opacity=".9"/><rect x="59.2" y="-1" width="1.6" height="7" fill="#4a5d78"/><circle cx="60" cy="0" r="1.5" fill="#ff5a4f"/>`
  + `<rect x="147" y="30" width="6" height="14" fill="#34445a"/><circle cx="150" cy="29" r="6.5" fill="#41546d"/><rect x="141" y="27.5" width="18" height="1.6" fill="#55708f"/>`
  + `<rect x="203" y="24" width="2" height="20" fill="#34445a"/><rect x="198" y="22" width="12" height="3" fill="#f2c230" opacity=".75"/><rect x="273" y="24" width="2" height="20" fill="#34445a"/><rect x="268" y="22" width="12" height="3" fill="#f2c230" opacity=".75"/></g>`;
const GS_MID = `<g><rect x="14" y="6" width="136" height="20" fill="#202b3a"/>${GS_WIN(21, 12, 11, 12, 6, 4, .6)}<path d="M150 14 h22 v5 h-22z" fill="#2c3a4f"/><rect x="170" y="10" width="3" height="16" fill="#2c3a4f"/>`
  + `<path d="M205 26 V13 Q235 -4 265 13 V26Z" fill="#1c2633"/><rect x="226" y="15" width="18" height="11" fill="#141c26"/><rect x="288" y="16" width="14" height="10" fill="#202b3a"/></g>`;
const gsLayer = (cls, w, h, g) => `<svg class="gl ${cls}" width="${w * 2}" height="${h}" viewBox="0 0 ${w * 2} ${h}" aria-hidden="true">${g}<g transform="translate(${w})">${g}</g></svg>`;
// The plane from the side (an A320-like airliner, nose to the right): gradient fuselage with a yellow cheat line and tail, cockpit and cabin windows, doors, wing, engine with its fan, landing gear
const GS_PLANE = `<svg class="plane" viewBox="0 0 120 44" aria-hidden="true"><defs><linearGradient id="gsB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e4e8ed"/><stop offset="1" stop-color="#a9b2bd"/></linearGradient>`
  + `<linearGradient id="gsE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe4ea"/><stop offset="1" stop-color="#7f8a96"/></linearGradient></defs>`
  + `<path d="M14 21 L8 3 L21 3 L38 21Z" fill="#f2c230"/><path d="M8 3 L11 3 L16 21 L14 21Z" fill="#c99a12"/>`
  + `<path d="M15 25 L2 28.5 L5.5 31 L26 28Z" fill="#b4bcc6"/>`
  + `<path d="M8 19 C14 20.4 22 21 31 21 L90 21 C101 21 109 24 114 28.5 C110.5 32.2 103 33.5 95 33.5 L32 33.5 C21 33.5 12 27 8 19Z" fill="url(#gsB)"/>`
  + `<path d="M20 30.2 C45 30.8 85 30.8 111 29.6" stroke="#f2c230" stroke-width="1.7" fill="none"/>`
  + `<path d="M98 23 L106 23.2 L109.5 25.6 L100.5 25.4Z" fill="#22344a"/><path d="M98 23 L100.5 25.4" stroke="#e4e8ed" stroke-width=".7"/>`
  + Array.from({ length: 15 }, (_, i) => `<rect x="${27 + i * 4.3}" y="23.2" width="2.2" height="2.7" rx="1" fill="#2a3b52"/>`).join('')
  + `<rect x="38" y="22.8" width="4.6" height="8.2" rx="1" fill="none" stroke="#b3bbc5" stroke-width=".6"/><rect x="88" y="22.8" width="4.6" height="8.2" rx="1" fill="none" stroke="#b3bbc5" stroke-width=".6"/>`
  + `<path d="M50 32 L84 32 L69 39 L55 39Z" fill="#c3cad3"/><path d="M50 32 L84 32" stroke="#8d97a3" stroke-width=".7"/>`
  + `<rect x="66" y="35" width="7" height="3" fill="#9aa4af"/><ellipse cx="70" cy="40" rx="10" ry="4.4" fill="url(#gsE)"/><ellipse cx="78.2" cy="40" rx="2" ry="3.8" fill="#1d2228"/><ellipse cx="78.2" cy="40" rx=".9" ry="1.6" fill="#6f7a86"/>`
  + `<path d="M58 33.5 V38.6 M100 33.5 V38.6" stroke="#8b95a1" stroke-width="1.7"/>`
  + `<g class="wheel"><circle cx="58" cy="40.6" r="3.4" fill="#1e2125"/><circle cx="58" cy="40.6" r="1.3" fill="#a3acb6"/><path d="M58 37.3 V43.9 M54.7 40.6 H61.3" stroke="#a3acb6" stroke-width=".6"/></g>`
  + `<g class="wheel"><circle cx="100" cy="40.6" r="3" fill="#1e2125"/><circle cx="100" cy="40.6" r="1.1" fill="#a3acb6"/><path d="M100 37.6 V43.6 M97 40.6 H103" stroke="#a3acb6" stroke-width=".6"/></g></svg>`;
const GS_HTML = `<div class="gsi">${gsLayer('far', 320, 44, GS_FAR)}${gsLayer('mid', 320, 26, GS_MID)}<div class="near"><b class="nl"></b></div>${GS_PLANE}</div>`;
// The scene never stops looping while the plane is on the ground, only its speed changes: slow like a taxiing plane (15 knots = one pass of the nearest layer in 2 s), faster while rolling out after
// touchdown, and at the slowest speed when the plane stands still. Playback rate changes keep the position, and the position is kept on the flight when the card is rebuilt.
const NO_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
function gsMotion(f, el, kt) {
  if (!el._an) {
    el._an = NO_MOTION ? [] : [['.far', 320, 128000], ['.mid', 320, 53000], ['.nl', 28, 2000]].map(([sel, px, ms]) => { const a = el.querySelector(sel).animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-px}px)` }], { duration: ms, iterations: Infinity }); a.currentTime = f._gsT || 0; a.pause(); return a; });
    el._wh = NO_MOTION ? [] : [...el.querySelectorAll('.wheel')].map(w => { const a = w.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }], { duration: 650, iterations: Infinity }); a.pause(); return a; });
  }
  const k = Math.max(.35, Math.min(5, kt / 15)), on = f.ground; // always playing while on the ground: a plane that stands still moves at the slowest speed
  for (const a of [...el._an, ...el._wh]) { a.updatePlaybackRate(k); if (on) a.play(); else a.pause(); }
  if (el._an[0]) f._gsT = el._an[0].currentTime;
}
function routeHtml(f) {
  if (!f.route) return `<div class="rtx" style="margin-top:12px">${t({ loading: 'Loading route info…', none: 'Route info not found', err: 'Couldn\'t load route info' }[f.rs] || '')}</div>`;
  const { org, dst } = f.route;
  return `<div class="rt"><div><b>${esc(org.code)}</b><small title="${esc(org.name)}">${esc(org.name)}</small></div><span class="fl" id="fl"><i>✈</i>${GS_HTML}</span>`
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
  $('list').innerHTML = (window.searchExtra ? searchExtra($('q').value, arr) : '') + (arr.length || !$('q').value.trim() ? '' : `<div class="none" style="padding:12px 16px;color:var(--mut);font-size:12px">${t('Nothing matches')}</div>`) + arr.map(f => { const k = kindOf(f), sh = SHAPES[k] || SHAPES.gen, col = f.ground ? '#9aa0a6' : color(f.alt), rot = k === 'heli' ? '' : '';
    return `<div class="row ${f.id === selected ? 'on' : ''}" data-id="${esc(f.id)}"><svg class="ri" viewBox="0 0 24 24" fill="${col}" stroke="#000" stroke-width=".6"><path d="${sh.b}"/>${sh.e ? `<path d="${sh.e}"/>` : ''}${sh.d ? `<path d="${sh.d}" stroke="none" opacity=".16"/>` : ''}${sh.r ? `<path d="${sh.r}" fill="none" stroke="${col}" stroke-width="${sh.rw || 1.2}" stroke-linecap="round" opacity="${sh.ra || .6}"/>` : ''}</svg>`
    + `<div class="rm"><b>${isEmg(f) ? '<em>⚠</em>' : ''}${fav.has(f.id) ? '<u>★</u>' : ''}${esc(f.cs)}</b><small>${f.route ? esc(f.route.org.code + ' → ' + f.route.dst.code) : esc(acCode(f) || f.reg || '')}</small></div>`
    + `<span>${f.ground ? t('on ground') : fmtAlt(f.alt * 3.281, 100)}</span></div>`; }).join('');
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
  const sa = $('fS'), sm = $('fSM'); // same two-handle bar for speed
  if (+sa.value > +sm.value) { if (e && e.target === sm) sm.value = sa.value; else sa.value = sm.value; }
  flt.alt = +a.value; flt.maxAlt = +m.value; flt.spd = +$('fS').value; flt.maxSpd = +$('fSM').value; flt.fav = $('fF').checked; flt.ground = $('fG').checked;
  flt.dep = apCode($('fDep').value); flt.arr = apCode($('fArr').value); flt.type = $('fTp').value.trim().toUpperCase(); $('fTp').classList.toggle('set', !!flt.type); flt.air = $('fAl').value.trim().toUpperCase(); $('fAl').classList.toggle('set', !!flt.air);
  $('fDep').classList.toggle('set', !!flt.dep); $('fArr').classList.toggle('set', !!flt.arr); pumpRoutes();
  save('sky.flt', { a: a.value, m: m.value, s: $('fS').value, sm: $('fSM').value, f: flt.fav, g: flt.ground, dep: $('fDep').value, arr: $('fArr').value, t: $('fTp').value, al: $('fAl').value });
  a.style.zIndex = flt.alt > 22500 ? 3 : 1; // so "min" can still be grabbed at the right end when the handles overlap
  $('dr').style.setProperty('--a', flt.alt / 450 + '%'); $('dr').style.setProperty('--b', flt.maxAlt / 450 + '%');
  $('vA').textContent = nf(uAlt(flt.alt)[0]); $('vM').textContent = nf(uAlt(flt.maxAlt)[0]) + (flt.maxAlt >= 45000 ? '+' : ''); $('vS').textContent = nf(uSpd(flt.spd)[0]); $('vSM').textContent = nf(uSpd(flt.maxSpd)[0]) + (flt.maxSpd >= 600 ? '+' : ''); $('uA').textContent = uAlt(0)[1]; $('uS').textContent = uSpd(0)[1];
  sa.style.zIndex = flt.spd > 300 ? 3 : 1; $('dr2').style.setProperty('--a', flt.spd / 6 + '%'); $('dr2').style.setProperty('--b', flt.maxSpd / 6 + '%');
  redraw(); renderList();
};
['fA', 'fM', 'fS', 'fSM', 'fF', 'fG', 'fDep', 'fArr', 'fTp', 'fAl'].forEach(i => $(i).oninput = applyF);
{ const v = LS('sky.flt', null); // restore the filters from the last session
  if (v) { $('fA').value = v.a; $('fM').value = v.m; $('fS').value = v.s; $('fSM').value = v.sm ?? 600; $('fF').checked = !!v.f; $('fG').checked = v.g !== false; $('fDep').value = v.dep || ''; $('fArr').value = v.arr || ''; $('fTp').value = v.t || ''; $('fAl').value = v.al || ''; } }
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
const setMenu = open => { $('side').classList.toggle('hide', !open); document.body.classList.toggle('closed', !open); save('sky.menu', open); const o = $('open'); o.dataset.otitle = open ? 'Close menu' : 'Open menu'; o.title = t(o.dataset.otitle); };
$('open').onclick = () => setMenu(document.body.classList.contains('closed'));
$('side').addEventListener('transitionend', () => { map.invalidateSize(); redraw(); });
setMenu(LS('sky.menu', true)); map.invalidateSize();
const clock = () => { const d = new Date(), o = TF({ hour: '2-digit', minute: '2-digit' });
  $('clock').innerHTML = d.toLocaleTimeString(LOC(), o) + '<i>:' + String(d.getSeconds()).padStart(2, '0') + '</i>';
  $('cdate').textContent = d.toLocaleDateString(LOC(), { weekday: 'short', day: 'numeric', month: 'short' }); }; clock(); setInterval(clock, 1000);
// version in the sidebar footer
{ const v = $('ver'); try { window.api?.version?.().then(x => { v.textContent = 'SkyTrack v' + x; }); } catch {} }
map.on('click', e => {
  if (placing) { placing = false; zone = { lat: e.latlng.lat, lon: e.latlng.lng, r: zoneRDef }; save('sky.zone', zone); initIn(); drawZone(); toast(t('Alert zone set ({0})', fmtDist(zoneR()))); return; }
  const f = hit(e.containerPoint); select(f ? f.id : null);
});
applyF(); setMode(LS('sky.live', true) && navigator.onLine !== false); if (live) { const c = LS('sky.cache', null); if (c?.c) map.setView([c.c[0], c.c[1]], c.c[2], { animate: false }); loadCache(); }
