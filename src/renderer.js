const $ = id => document.getElementById(id);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`); // dış kaynaklı metinleri HTML'e güvenle yaz
const DATA = window.api || window.SkyData; // masaüstünde main.js (IPC), tarayıcıda doğrudan data.js
const map = L.map('map', { zoomControl: false, worldCopyJump: true, minZoom: 3 }).setView([41, 29], 6);
L.control.zoom({ position: 'bottomright' }).addTo(map);

/* ---------- harita stili ---------- */
const ESRI = n => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${n}/MapServer/tile/{z}/{y}/{x}`, ESRI_ATTR = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
// Anahtar gerektirmeyen altlıklar: OSM standart; Esri açık/koyu gri (altlık + üstüne yer adları katmanı)
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
// Rota: koyu kenarlı (casing) düz çizgi, hem açık hem koyu harita zemininde seçilsin
const ROUTE_C = '#e8245f', routeCase = L.polyline([], { color: '#111', weight: 7, opacity: .5, interactive: false }).addTo(map);
const routeLine = L.polyline([], { color: ROUTE_C, weight: 3.5, opacity: .95, interactive: false }).addTo(map), routeEnds = L.layerGroup().addTo(map);
const setRoute = pts => { routeCase.setLatLngs(pts); routeLine.setLatLngs(pts); };
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
// Demo havayolları: ICAO → [ad, IATA (logo için)]
const AIRLINE = { THY: ['Turkish Airlines', 'TK'], PGT: ['Pegasus', 'PC'], AJA: ['AJet', 'VF'], KLM: ['KLM', 'KL'], DLH: ['Lufthansa', 'LH'],
  BAW: ['British Airways', 'BA'], UAE: ['Emirates', 'EK'], AZA: ['ITA Airways', 'AZ'], SXS: ['SunExpress', 'XQ'], WZZ: ['Wizz Air', 'W6'] };
const AIRLINES = Object.keys(AIRLINE), DEMO_TYPES = [['A320', 'Airbus A320'], ['A21N', 'Airbus A321neo'], ['B738', 'Boeing 737-800'], ['B38M', 'Boeing 737 MAX 8'], ['A333', 'Airbus A330-300'], ['B77W', 'Boeing 777-300ER']];
const ZONE_R = 100; // km (varsayılan yarıçap)
const zoneR = () => zone?.r || ZONE_R;
const APO = AP.map(a => ({ code: a[0], name: a[1], lat: a[2], lon: a[3] }));
const { R, brg, km, gc, unwrap, nearLon } = window.SkyGeo;
const flights = new Map(), routeCache = new Map(), acCache = new Map(), fav = new Set(LS('sky.fav', [])), hist = [],
flt = { alt: 0, maxAlt: 45000, spd: 0, fav: false, ground: true, dep: '', arr: '' };
let selected = null, live = false, ts = 30, replay = false, placing = false, zone = LS('sky.zone', null), zoneLayer = null, tick = 0;

/* ---------- görünüm: irtifa rengi + filtre ---------- */
const color = alt => `hsl(${Math.round(40 + Math.min(alt / 12000, 1) * 240)} 90% 58%)`;
const apIs = (a, c) => !!a && (a.code === c || a.icao === c);
const vis = f => { const ft = f.alt * 3.281; return (!f.ground || flt.ground) && ft >= flt.alt && (flt.maxAlt >= 45000 || ft <= flt.maxAlt) && f.spd * 1.944 >= flt.spd && (!flt.fav || fav.has(f.id))
  && (!flt.dep || apIs(f.route?.org, flt.dep)) && (!flt.arr || apIs(f.route?.dst, flt.arr)); };
function toast(msg) {
  const d = document.createElement('div'); d.className = 'tm'; d.textContent = msg; $('toast').appendChild(d); setTimeout(() => d.remove(), 4000);
  try { new Notification('SkyTrack', { body: msg }); } catch {}
}

/* ---------- uçaklar: tek canvas katmanı ---------- */
// Her uçak için ayrı HTML öğesi yerine hepsi tek bir canvas'a çizilir: binlerce uçakta da akıcı kalır
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
    // Uzaklaştıkça simgeler küçülür: kıta ölçeğinde binlerce uçak birbirine girmesin
    const z = map.getZoom(), k = z <= 4 ? .55 : z <= 5 ? .65 : z <= 6 ? .8 : 1;
    let sel = null; const cLon = map.getCenter().lng;
    flights.forEach(f => {
      f._p = null; if (f.gone || !vis(f)) return;
      const [lat, lon, hdg] = f.rp || [f.lat, f.lon, f.hdg], p = map.latLngToContainerPoint([lat, nearLon(lon, cLon)]); // tarih değişim çizgisinde en yakın dünya kopyası
      if (p.x < -20 || p.y < -20 || p.x > s.x + 20 || p.y > s.y + 20) return;
      f._p = p; f._h = hdg; if (f.id === selected) { sel = f; return; }
      icon(ctx, p, hdg, (f.ground ? 16 : 24) * k, f.ground ? '#9aa0a6' : color(f.alt));
    });
    if (sel) { ctx.shadowColor = '#f2c230'; ctx.shadowBlur = 12; icon(ctx, sel._p, sel._h, 30, '#fff'); ctx.shadowBlur = 0; }
  }
});
function icon(ctx, p, hdg, size, fill) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(hdg * R); ctx.scale(size / 24, size / 24); ctx.translate(-12, -12);
  ctx.fillStyle = fill; ctx.fill(PLANE); ctx.stroke(PLANE); ctx.restore();
}
const planes = new PlaneLayer().addTo(map), redraw = () => planes.redraw();
// Tıklama/üzerine gelme: son çizimdeki ekran konumlarından en yakın uçak (14 px içinde)
function hit(pt) { let best = null, bd = 12 * 12; flights.forEach(f => { if (!f._p) return; const d = (f._p.x - pt.x) ** 2 + (f._p.y - pt.y) ** 2; if (d < bd) { bd = d; best = f; } }); return best; }
map.on('mousemove', e => { const f = hit(e.containerPoint), h = $('hov');
  map.getContainer().style.cursor = f ? 'pointer' : '';
  if (!f) { h.style.display = 'none'; return; }
  h.style.display = 'block'; h.style.left = f._p.x + 16 + 'px'; h.style.top = f._p.y - 10 + 'px';
  h.textContent = `${f.cs}${f.route ? ' · ' + f.route.org.code + '→' + f.route.dst.code : ''} · ${f.ground ? 'yerde' : Math.round(f.alt * 3.281 / 100) * 100 + ' ft'}`; });
map.on('mouseout', () => $('hov').style.display = 'none');

/* ---------- uçuş verisi ---------- */
// Demo uçuşlar gerçek bir rotada uçar: kalkış havalimanından varışa gider, varınca yeni bir rotaya çıkar
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
      tr: path.slice(Math.max(0, k - 20), k + 1) }); // demo: son ~20 noktalık geçmiş iz
  }
}
function upsert(d) {
  let f = flights.get(d.id);
  if (!f) { f = { tr: [], gone: replay }; flights.set(d.id, f); } // replay sırasında gelen yeni uçak o karede yoktu
  Object.assign(f, d); return f;
}
function clearAll() { flights.clear(); hist.length = 0; select(null); redraw(); }

/* ---------- rota (nereden → nereye) ---------- */
// Önbellek: bulunan rota 6 saat, "yok" cevabı 10 dk geçerli. Hata (ağ, 429) önbelleğe girmez; uçak 60 sn sonra yeniden denenir, o sırada tüm istekler 30 sn bekler.
const TTL_OK = 6 * 3600e3, TTL_NONE = 600e3, RETRY_MS = 60e3, BACKOFF_MS = 30e3;
let dbPause = 0;
const fresh = (c, k) => { const e = c.get(k); return e && Date.now() - e.t < (e.v ? TTL_OK : TTL_NONE) ? e : null; };
const canLoad = (f, k) => !f[k] || (f[k] === 'err' && Date.now() - f[k + 'At'] > RETRY_MS);
const failed = (f, k) => { f[k] = 'err'; f[k + 'At'] = Date.now(); dbPause = Date.now() + BACKOFF_MS; };
async function loadRoute(f) {
  if (!canLoad(f, 'rs')) return;
  if (f.cs === f.id.toUpperCase()) { f.rs = 'none'; return showRoute(f); } // çağrı kodu yok (hex'e düşmüş): sorgulayacak bir şey yok
  f.rs = 'loading'; let e = fresh(routeCache, f.cs);
  if (!e) { if (Date.now() < dbPause) { f.rs = 'err'; f.rsAt = Date.now(); return showRoute(f); }
    const res = await DATA.route(f.cs); if (!res.ok) { failed(f, 'rs'); return showRoute(f); } e = { v: res.route, t: Date.now() }; routeCache.set(f.cs, e); }
  f.route = e.v; f.rs = e.v ? 'ok' : 'none'; if (e.v) { addAp(e.v.org); addAp(e.v.dst); } showRoute(f);
}
function showRoute(f) { if (f.id !== selected) return; if (!replay) drawRoute(f); renderCard(true); }
// Kalkış → uçak → varış, büyük daire yayları olarak
const routePts = f => { const { org, dst } = f.route, p = [f.lat, f.lon]; return unwrap([...gc([org.lat, org.lon], p), ...gc(p, [dst.lat, dst.lon]).slice(1)]); };
function drawRoute(f) {
  routeEnds.clearLayers();
  if (!f || !f.route) return setRoute([]);
  setRoute(routePts(f));
  [f.route.org, f.route.dst].forEach(a => L.circleMarker([a.lat, a.lon], { radius: 7, color: '#fff', weight: 2.5, fillColor: ROUTE_C, fillOpacity: 1, interactive: false })
    .bindTooltip(esc(a.code), { permanent: true, direction: 'top', offset: [0, -8], className: 'apl' }).addTo(routeEnds));
}

/* ---------- uçak bilgisi (tip, tescil, fotoğraf) ---------- */
async function loadAircraft(f) {
  if (!canLoad(f, 'as')) return;
  f.as = 'loading'; let e = fresh(acCache, f.id);
  if (!e) { if (Date.now() < dbPause) { f.as = 'err'; f.asAt = Date.now(); return; }
    const res = await DATA.aircraft(f.id); if (!res.ok) return failed(f, 'as'); e = { v: res.aircraft, t: Date.now() }; acCache.set(f.id, e); }
  f.ac = e.v; f.as = e.v ? 'ok' : 'none'; if (f.id === selected) renderCard(true);
}
function nearest(f) { let b = null, m = 1e9; AP.forEach(a => { const d = km(f.lat, f.lon, a[2], a[3]); if (d < m) { m = d; b = a; } }); return `${b[0]} · ${Math.round(m)} km`; }
// İz: uygulamanın bu uçağı gördüğü andan beri 5 sn'de bir kaydedilen konumlar
const drawTrail = f => trail.setLatLngs(f ? unwrap([...f.tr, [f.lat, f.lon]].map(p => [p[0], p[1]])) : []);

/* ---------- ana döngü (1 sn) ---------- */
setInterval(() => {
  tick++;
  flights.forEach(f => {
    if (!live && f.route) { const d = f.route.dst;
      if (km(f.lat, f.lon, d.lat, d.lon) < 15) { f.route = demoRoute(f.cs.slice(0, 3), d, pickDst(d)); f.tr = []; if (f.id === selected) { if (!replay) drawRoute(f); renderCard(true); } }
      f.hdg = brg(f.lat, f.lon, f.route.dst.lat, f.route.dst.lon); }
    const dist = f.spd * ts, h = f.hdg * R;
    f.lat += Math.cos(h) * dist / 111320; f.lon += Math.sin(h) * dist / (111320 * Math.cos(f.lat * R));
    if (f.lon > 180) f.lon -= 360; else if (f.lon < -180) f.lon += 360;
    if (zone) { const inn = km(f.lat, f.lon, zone.lat, zone.lon) < zoneR(); if (inn && (f.in === false || (f.in === undefined && tick > 1))) toast(`${f.cs} uyarı bölgesine girdi`); f.in = inn; }
    if (tick % 5 === 0) { f.tr.push([f.lat, f.lon]); if (f.tr.length > 360) f.tr.shift(); } // her uçağın son ~30 dk izi
  });
  const s = flights.get(selected); if (s && !replay) { drawTrail(s); if (s.route) setRoute(routePts(s)); }
  if (tick % 5 === 0) { // geçmiş kaydı: 5 sn'de bir, en fazla 720 kare. Replay izlenirken de kayıt sürer
    // Kare başına tek Float32Array (lat, lon, hdg üçlüleri) + kimlik listesi: binlerce uçakta küçük dizi yığınından çok daha az bellek
    const ids = [], buf = new Float32Array(flights.size * 3); let i = 0;
    flights.forEach(f => { ids.push(f.id); buf[i++] = f.lat; buf[i++] = f.lon; buf[i++] = f.hdg; });
    hist.push({ t: Date.now(), ids, buf });
    if (hist.length > 720) { hist.shift(); if (replay) $('rpS').value = Math.max(0, +$('rpS').value - 1); } // en eski kare düştü: izlenen kare aynı kalsın
    $('rpS').max = hist.length - 1; if (!replay) $('rpS').value = hist.length - 1;
  }
  redraw(); if (selected) renderCard();
}, 1000);

/* ---------- canlı veri ---------- */
// Görünen alanın biraz genişini ister; harita bu alanın içinde kaldıkça kaydırma/zoom yeni istek atmaz
const LIVE_MS = 15000;
let fetchedBox = null, fetchedAt = 0, reqId = 0, moveTimer = null, lastReq = 0;
async function poll(force) {
  if (!live) return; const v = map.getBounds();
  if (!force && fetchedBox && fetchedBox.contains(v) && Date.now() - fetchedAt < LIVE_MS) return;
  if (!force && Date.now() - lastReq < 3000) return; lastReq = Date.now(); // hız sınırına takılmamak için kaydırma kaynaklı istekler arasında en az 3 sn
  const b = v.pad(.15), id = ++reqId, cl = (x, m) => Math.max(-m, Math.min(m, x)).toFixed(2);
  fetchedBox = b; fetchedAt = Date.now(); $('st').textContent = 'yükleniyor…';
  const r = await DATA.flights({ s: cl(b.getSouth(), 85), n: cl(b.getNorth(), 85), w: cl(b.getWest(), 180), e: cl(b.getEast(), 180) });
  if (!live || id !== reqId) return; // bu arada harita yine değiştiyse eski cevabı at
  if (!r.ok) { fetchedBox = null; $('st').textContent = 'hata: ' + r.error; return; }
  // Kaynak alanın yalnız bir kısmını kapsadıysa (adsb.lol, geniş görünüm) yalnız kapsanan alanı "alındı" say; yoksa kaydırınca boş kalan kenarlar yüklenmez
  if (r.covered) fetchedBox = L.latLngBounds([r.covered.s, r.covered.w], [r.covered.n, r.covered.e]);
  const seen = new Set(r.flights.map(d => d.id));
  flights.forEach((f, id) => { if (!seen.has(id)) { flights.delete(id); if (selected === id) select(null); } });
  r.flights.forEach(upsert); redraw();
  $('st').textContent = `${r.src} · son güncelleme ${new Date().toLocaleTimeString('tr-TR')}${r.partial ? ' · geniş görünüm: yalnız orta bölge, yakınlaştırın' : ''}`;
  pumpRoutes();
}
setInterval(() => poll(true), LIVE_MS);
map.on('moveend', () => { clearTimeout(moveTimer); moveTimer = setTimeout(() => { poll(); pumpRoutes(); }, 400); }); // zoom/kaydırma bitince hemen yeni bölgeyi iste
function setMode(l) {
  live = l; ts = l ? 1 : 30; exitReplay(); $('mLive').classList.toggle('on', l); $('mDemo').classList.toggle('on', !l); clearAll(); fetchedBox = null;
  if (l) poll(true); else { seedDemo(); $('st').textContent = 'demo (30x hız)'; }
  redraw();
}
$('mDemo').onclick = () => setMode(false); $('mLive').onclick = () => setMode(true);

/* ---------- havalimanları ---------- */
const apLayer = L.layerGroup().addTo(map);
AP.forEach(a => L.circleMarker([a[2], a[3]], { radius: 4, color: '#000', weight: 1, fillColor: '#f2c230', fillOpacity: 1 }).bindTooltip(`${a[0]} · ${a[1]}`)
  .on('click', e => { L.DomEvent.stopPropagation(e); toast(`${a[0]}: ${[...flights.values()].filter(f => km(f.lat, f.lon, a[2], a[3]) < 100).length} uçak 100 km içinde`); }).addTo(apLayer));
$('bAp').onclick = function () { const on = !map.hasLayer(apLayer); on ? apLayer.addTo(map) : apLayer.remove(); this.classList.toggle('on', on); };

/* ---------- uyarı bölgesi ---------- */
function drawZone() { zoneLayer && zoneLayer.remove(); zoneLayer = null; $('bZ').classList.toggle('on', !!zone);
  if (zone) zoneLayer = L.circle([zone.lat, zone.lon], { radius: zoneR() * 1000, color: '#ff6b5e', weight: 2, dashArray: '6 6', fillOpacity: .07, interactive: false }).addTo(map); }
$('bZ').onclick = () => { if (zone) { zone = null; save('sky.zone', null); drawZone(); } else { placing = true; toast('Bölge merkezi için haritaya tıkla'); } };
$('zR').value = zoneR();
$('zR').onchange = function () { const r = Math.max(10, Math.min(500, Math.round(+this.value) || ZONE_R)); this.value = r; if (zone) { zone.r = r; save('sky.zone', zone); initIn(); drawZone(); } else zoneRDef = r; };
let zoneRDef = ZONE_R; // bölge yokken seçilen yarıçap, sonraki bölgeye uygulanır
// Bölge değişince uçakların "içeride mi" durumunu sessizce yeniden hesapla (bildirim yağmuru olmasın)
const initIn = () => flights.forEach(f => { if (zone) f.in = km(f.lat, f.lon, zone.lat, zone.lon) < zoneR(); else delete f.in; });
drawZone();

/* ---------- geçmişi oynat ---------- */
function exitReplay() { if (!replay) return; replay = false; $('rpLive').classList.add('on'); $('rpT').textContent = 'geçmiş kaydı';
  flights.forEach(f => { f.gone = false; f.rp = null; }); $('rpS').value = $('rpS').max; const s = flights.get(selected); drawRoute(s); drawTrail(s); redraw(); }
$('rpS').oninput = function () { const s = hist[+this.value]; if (!s) return; replay = true; $('rpLive').classList.remove('on');
  const m = new Map(s.ids.map((id, i) => [id, i * 3])); trail.setLatLngs([]); drawRoute(null);
  flights.forEach(f => { const o = m.get(f.id); f.gone = o === undefined; f.rp = o === undefined ? null : [s.buf[o], s.buf[o + 1], s.buf[o + 2]]; }); redraw();
  $('rpT').textContent = new Date(s.t).toLocaleTimeString('tr-TR'); };
$('rpLive').onclick = exitReplay;

/* ---------- seçim, favori, panel, liste ---------- */
function select(id) {
  selected = id; const f = flights.get(id);
  if (f) { map.panTo(f.rp ? [f.rp[0], f.rp[1]] : [f.lat, f.lon]); if (live) { loadRoute(f); loadAircraft(f); } }
  if (replay) { drawRoute(null); trail.setLatLngs([]); } else { drawRoute(f); drawTrail(f); } redraw(); // replay'de canlı konuma göre çizilmiş iz/rota karışmasın
  $('card').classList.toggle('show', !!f); if (f) renderCard(true); renderList();
}
const ft = m => Math.round(m * 3.281).toLocaleString('tr-TR') + ' ft';
function renderCard(full) {
  const f = flights.get(selected); if (!f) return;
  const ac = f.ac || {};
  if (full) {
    const iata = f.route?.airlineIata, sub = f.route?.airline || ac.owner || ac.country || f.country || '';
    const photo = ac.thumb ? `<a class="ph" href="${esc(ac.photo || ac.thumb)}" target="_blank" title="Fotoğrafı büyüt"><img src="${esc(ac.thumb)}" alt="" onerror="this.parentNode.remove()"></a>` : '';
    $('card').innerHTML = `<div class="ch">${iata ? `<img class="logo" src="https://images.kiwi.com/airlines/64/${esc(iata)}.png" alt="" onerror="this.remove()">` : ''}`
      + `<div class="cn"><h2>${esc(f.cs)}</h2><small>${esc(sub)}</small></div><button id="cx" class="ib" title="Kapat">✕</button></div>${photo}${routeHtml(f)}<div id="kvs"></div><button id="fv"></button>`;
  }
  if (f.route && $('pgb')) { const { org, dst } = f.route, a = km(org.lat, org.lon, f.lat, f.lon), b = km(f.lat, f.lon, dst.lat, dst.lon);
    $('pgb').style.width = Math.min(100, a / (a + b) * 100).toFixed(1) + '%';
    $('pgt').textContent = `${Math.round(a)} km uçtu · ${Math.round(b)} km kaldı${f.spd > 30 ? ' · ~' + eta(b / (f.spd * 3.6)) : ''}`; }
  const rows = [
    ['Uçak tipi', ac.type || f.type || (f.as === 'loading' ? '…' : '—')], ['Tescil', ac.reg || f.reg || '—'],
    ['İrtifa', f.ground ? 'yerde' : ft(f.alt)], ['Hız', Math.round(f.spd * 1.944) + ' kt'], ['Yön', Math.round(f.hdg) + '°'],
    ['Dikey hız', Math.round(f.vr * 196.85) + ' ft/dk'], ['En yakın havalimanı', nearest(f)], ['Konum', f.lat.toFixed(2) + ', ' + f.lon.toFixed(2)]];
  if (ac.owner && ac.owner !== f.route?.airline) rows.splice(2, 0, ['Sahibi', ac.owner]);
  $('kvs').innerHTML = rows.map(r => `<div class="kv"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('');
  $('fv').textContent = fav.has(f.id) ? '★ Favoride' : '☆ Favorile';
}
const eta = h => h < 1 ? Math.round(h * 60) + ' dk' : Math.floor(h) + ' sa ' + Math.round(h % 1 * 60) + ' dk';
function routeHtml(f) {
  if (!f.route) return `<div class="rtx" style="margin-top:12px">${{ loading: 'Rota bilgisi yükleniyor…', none: 'Rota bilgisi bulunamadı', err: 'Rota bilgisi alınamadı' }[f.rs] || ''}</div>`;
  const { org, dst } = f.route;
  return `<div class="rt"><div><b>${esc(org.code)}</b><small title="${esc(org.name)}">${esc(org.name)}</small></div><span>✈</span>`
    + `<div><b>${esc(dst.code)}</b><small title="${esc(dst.name)}">${esc(dst.name)}</small></div></div><div class="pg"><i id="pgb"></i></div><div class="rtx" id="pgt"></div>`;
}
$('card').onclick = e => {
  if (e.target.id === 'cx') return select(null);
  if (e.target.id !== 'fv') return;
  fav.has(selected) ? fav.delete(selected) : fav.add(selected); save('sky.fav', [...fav]); renderCard(); renderList(); redraw();
};
function renderList() {
  const q = $('q').value.trim().toLowerCase();
  const arr = [...flights.values()].filter(f => vis(f) && (f.cs.toLowerCase().includes(q) || (f.reg || '').toLowerCase().includes(q))).sort((a, b) => (a.ground - b.ground) || (/^[A-Z]{2,3}\d/.test(b.cs) - /^[A-Z]{2,3}\d/.test(a.cs)) || a.cs.localeCompare(b.cs)).slice(0, 200); // önce havadaki, çağrı kodlu uçuşlar
  $('meta').textContent = `${arr.length} / ${flights.size} UÇUŞ`;
  let st = '';
  if (live && (flt.dep || flt.arr)) { const v = map.getBounds(), inV = [...flights.values()].filter(f => !f.ground && v.contains([f.lat, f.lon]));
    const done = inV.filter(f => f.rs && f.rs !== 'loading').length; if (done < inV.length) st = `rota bilgisi yükleniyor · ${done} / ${inV.length} uçak`; }
  $('apSt').textContent = st;
  $('list').innerHTML = arr.map(f => `<div class="row ${f.id === selected ? 'on' : ''}" data-id="${esc(f.id)}"><b>${fav.has(f.id) ? '★ ' : ''}${esc(f.cs)}</b>`
    + `<span>${f.route ? esc(f.route.org.code + '→' + f.route.dst.code) + ' · ' : ''}${f.ground ? 'yerde' : Math.round(f.alt * 3.281 / 100) * 100 + ' ft'}</span></div>`).join('');
}
$('list').onpointerdown = e => { const r = e.target.closest('.row'); if (r) select(r.dataset.id); };
$('q').oninput = renderList; setInterval(renderList, 2000);
const applyF = e => {
  // tek çubukta iki tutamaç: sol = en az, sağ = en çok irtifa; birbirinin üstünden geçemezler
  const a = $('fA'), m = $('fM');
  if (+a.value > +m.value) { if (e && e.target === m) m.value = a.value; else a.value = m.value; }
  flt.alt = +a.value; flt.maxAlt = +m.value; flt.spd = +$('fS').value; flt.fav = $('fF').checked; flt.ground = $('fG').checked;
  flt.dep = apCode($('fDep').value); flt.arr = apCode($('fArr').value);
  $('fDep').classList.toggle('set', !!flt.dep); $('fArr').classList.toggle('set', !!flt.arr); pumpRoutes();
  save('sky.flt', { a: a.value, m: m.value, s: $('fS').value, f: flt.fav, g: flt.ground, dep: $('fDep').value, arr: $('fArr').value });
  a.style.zIndex = flt.alt > 22500 ? 3 : 1; // üst üste gelince sağ uçta da "en az" tutulabilsin
  $('dr').style.setProperty('--a', flt.alt / 450 + '%'); $('dr').style.setProperty('--b', flt.maxAlt / 450 + '%');
  $('vA').textContent = flt.alt.toLocaleString('tr-TR'); $('vM').textContent = flt.maxAlt >= 45000 ? '45.000+' : flt.maxAlt.toLocaleString('tr-TR'); $('vS').textContent = flt.spd;
  redraw(); renderList();
};
['fA', 'fM', 'fS', 'fF', 'fG', 'fDep', 'fArr'].forEach(i => $(i).oninput = applyF);
{ const v = LS('sky.flt', null); // son oturumdaki filtreleri geri yükle
  if (v) { $('fA').value = v.a; $('fM').value = v.m; $('fS').value = v.s; $('fF').checked = !!v.f; $('fG').checked = v.g !== false; $('fDep').value = v.dep || ''; $('fArr').value = v.arr || ''; } }
$('fSw').onclick = () => { const d = $('fDep').value; $('fDep').value = $('fArr').value; $('fArr').value = d; applyF(); };

/* ---------- havalimanı filtresi (kalkış / varış) ---------- */
// Bilinen havalimanları (öneri listesi): sabit liste + canlı modda öğrenilen rota havalimanları
const knownAps = new Map();
function addAp(a) { if (!a || !a.code || knownAps.has(a.code)) return; knownAps.set(a.code, a);
  const o = document.createElement('option'); o.value = a.code; o.label = a.name; $('apList').appendChild(o); }
APO.forEach(addAp);
// "IST", "ltfm" veya "istanbul" → havalimanı kodu
function apCode(v) {
  const u = v.trim().toLocaleUpperCase('tr'); if (!u) return '';
  if (knownAps.has(u)) return u;
  for (const a of knownAps.values()) if (a.icao === u || (u.length > 2 && a.name.toLocaleUpperCase('tr').includes(u))) return a.code;
  return u;
}
// Canlı modda rota bilgisi yalnızca uçağa tıklanınca gelir; filtre açıkken ekrandaki uçakların rotalarını arka planda (aynı anda en fazla 3) yükle
let routeJobs = 0, pumpT = null;
function pumpRoutes() {
  if (!live || (!flt.dep && !flt.arr)) return; const v = map.getBounds();
  if (Date.now() < dbPause) { clearTimeout(pumpT); pumpT = setTimeout(pumpRoutes, dbPause - Date.now() + 100); return; } // 429/hata sonrası bekle
  for (const f of flights.values()) {
    if (routeJobs >= 3) return;
    if (!canLoad(f, 'rs') || f.ground || !v.contains([f.lat, f.lon])) continue;
    routeJobs++; loadRoute(f).finally(() => { routeJobs--; redraw(); pumpRoutes(); });
  }
}

/* ---------- açılır/kapanır menü + saat ---------- */
const setMenu = open => { $('side').classList.toggle('hide', !open); document.body.classList.toggle('closed', !open); save('sky.menu', open); };
$('close').onclick = () => setMenu(false); $('open').onclick = () => setMenu(true);
$('side').addEventListener('transitionend', () => { map.invalidateSize(); redraw(); });
setMenu(LS('sky.menu', true)); map.invalidateSize();
const clock = () => $('clock').textContent = new Date().toLocaleTimeString('tr-TR'); clock(); setInterval(clock, 1000);
map.on('click', e => {
  if (placing) { placing = false; zone = { lat: e.latlng.lat, lon: e.latlng.lng, r: zoneRDef }; save('sky.zone', zone); initIn(); drawZone(); toast(`Uyarı bölgesi ayarlandı (${zoneR()} km)`); return; }
  const f = hit(e.containerPoint); select(f ? f.id : null);
});
applyF(); setMode(false);
