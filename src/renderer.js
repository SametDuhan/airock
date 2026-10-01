const $ = id => document.getElementById(id);
const map = L.map('map', { zoomControl: false, worldCopyJump: true , minZoom:5 }).setView([41, 29], 6);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);, { attribution: '© OpenStreetMap © CARTO', maxZoom: 12 }).addTo(map);
const trail = L.polyline([], { color: '#f2c230', weight: 2, opacity: .8 }).addTo(map);
const PLANE = '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';

const flights = new Map();      // id -> uçuş verisi + marker
let selected = null, live = false, timeScale = 30;   // demo modunda zaman 30x hızlı akar

/* ---------- DEMO VERİSİ ---------- */
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
function seedDemo() {
  clearAll();
  for (let i = 0; i < 45; i++) {
    const a = AIRPORTS[i % AIRPORTS.length], id = 'd' + i;
    upsert({ id, cs: AIRLINES[i % 10] + (100 + Math.floor(Math.random() * 900)), country: 'Demo',
      lat: a[0] + (Math.random() - .5) * 10, lon: a[1] + (Math.random() - .5) * 16,
      alt: 6000 + Math.random() * 5500, spd: 190 + Math.random() * 70, hdg: Math.random() * 360, vr: 0 });
  }
}

/* ---------- UÇUŞ YÖNETİMİ ---------- */
function upsert(d) {
  let f = flights.get(d.id);
  if (!f) {
    f = { tr: [] };
    f.marker = L.marker([d.lat, d.lon], { icon: L.divIcon({ className: 'pl', html: '<div class="pi">' + PLANE + '</div>', iconSize: [26, 26] }) }).addTo(map);
    f.marker.on('click', () => select(d.id));
    flights.set(d.id, f);
  }
  Object.assign(f, d, { id: d.id });
  f.marker.setLatLng([f.lat, f.lon]);
  const el = f.marker.getElement(); if (el) el.firstChild.style.transform = `rotate(${f.hdg}deg)`;
  return f;
}
function clearAll() { flights.forEach(f => f.marker.remove()); flights.clear(); select(null); }

// her saniye: konumu hız ve yöne göre ilerlet (dead reckoning)
setInterval(() => {
  flights.forEach(f => {
    const dist = f.spd * timeScale, h = f.hdg * Math.PI / 180;
    f.lat += Math.cos(h) * dist / 111320;
    f.lon += Math.sin(h) * dist / (111320 * Math.cos(f.lat * Math.PI / 180));
    if (!live && (f.lat > 60 || f.lat < 20 || f.lon > 60 || f.lon < -10)) f.hdg = (f.hdg + 180) % 360;
    f.marker.setLatLng([f.lat, f.lon]);
    const el = f.marker.getElement(); if (el) el.firstChild.style.transform = `rotate(${f.hdg}deg)`;
    if (f.id === selected) { f.tr.push([f.lat, f.lon]); if (f.tr.length > 80) f.tr.shift(); trail.setLatLngs(f.tr); }
  });
  if (selected) renderCard();
}, 1000);

/* ---------- CANLI VERİ (OpenSky) ---------- */
async function poll() {
  if (!live) return;
  const b = map.getBounds();
  $('st').textContent = 'yükleniyor…';
  const r = await window.api.flights({ s: b.getSouth().toFixed(2), n: b.getNorth().toFixed(2), w: b.getWest().toFixed(2), e: b.getEast().toFixed(2) });
  if (!live) return;
  if (!r.ok) { $('st').textContent = 'hata: ' + r.error; return; }
  const seen = new Set(r.flights.map(d => d.id));
  flights.forEach((f, id) => { if (!seen.has(id)) { f.marker.remove(); flights.delete(id); if (selected === id) select(null); } });
  r.flights.forEach(d => { const old = flights.get(d.id); if (old) d.tr = old.tr; upsert(d); });
  $('st').textContent = 'canlı · ' + new Date().toLocaleTimeString('tr-TR');
}
setInterval(poll, 30000);   // anonim kullanımda günlük kredi sınırı var, README'ye bak

function setMode(l) {
  live = l; timeScale = l ? 1 : 30;
  $('mLive').classList.toggle('on', l); $('mDemo').classList.toggle('on', !l);
  clearAll();
  if (l) poll(); else { seedDemo(); $('st').textContent = 'demo (30x hız)'; }
}
$('mDemo').onclick = () => setMode(false);
$('mLive').onclick = () => setMode(true);

/* ---------- SEÇİM / PANEL / LİSTE ---------- */
function select(id) {
  flights.forEach(f => f.marker.getElement() && f.marker.getElement().classList.toggle('sel', f.id === id));
  selected = id; trail.setLatLngs([]);
  const f = flights.get(id);
  if (f) { f.tr = [[f.lat, f.lon]]; map.panTo([f.lat, f.lon], { animate: true }); }
  $('card').classList.toggle('show', !!f); renderCard(); renderList();
}
function renderCard() {
  const f = flights.get(selected); if (!f) return;
  $('card').innerHTML = `<h2>${f.cs}</h2><small>${f.country}</small><div style="height:10px"></div>
   <div class="kv"><span>İrtifa</span><b>${Math.round(f.alt * 3.281).toLocaleString('tr-TR')} ft</b></div>
   <div class="kv"><span>Hız</span><b>${Math.round(f.spd * 1.944)} kt</b></div>
   <div class="kv"><span>Yön</span><b>${Math.round(f.hdg)}°</b></div>
   <div class="kv"><span>Dikey hız</span><b>${Math.round(f.vr * 196.85)} ft/dk</b></div>
   <div class="kv"><span>Konum</span><b>${f.lat.toFixed(2)}, ${f.lon.toFixed(2)}</b></div>`;
}
function renderList() {
  const q = $('q').value.trim().toLowerCase();
  const arr = [...flights.values()].filter(f => f.cs.toLowerCase().includes(q)).sort((a, b) => a.cs.localeCompare(b.cs)).slice(0, 200);
  $('meta').textContent = `${arr.length} / ${flights.size} UÇUŞ`;
  $('list').innerHTML = arr.map(f => `<div class="row ${f.id === selected ? 'on' : ''}" data-id="${f.id}"><b>${f.cs}</b><span>${Math.round(f.alt * 3.281 / 100) * 100} ft</span></div>`).join('');
}
$('list').onclick = e => { const r = e.target.closest('.row'); if (r) select(r.dataset.id); };
$('q').oninput = renderList;
setInterval(renderList, 2000);
map.on('click', () => select(null));
setMode(false);
