// UI language: English (default) and Turkish. t('English text', ...args) returns the Turkish text when Turkish is selected;
// "{0}", "{1}" in the text are replaced by the extra arguments. Static HTML is translated by applyLang(); dynamic parts call t() while rendering.
const TR = {
  // menu
  'Close menu': 'Menüyü kapat', 'Open menu': 'Menüyü aç', 'Mode': 'Mod', 'Normal': 'Normal', 'Plane spotter': 'Uçak gözlemci', 'Data': 'Veri', 'Demo': 'Demo', 'Live': 'Canlı',
  'Map': 'Harita', 'Airports': 'Havalimanları', 'Alert zone': 'Uyarı bölgesi', 'Radar': 'Radar', 'Rain radar': 'Yağış radarı', 'Zone radius': 'Bölge yarıçapı',
  'High turbulence risk ahead (~{0} km)': 'Önünde yüksek türbülans ihtimali var (~{0} km)', 'Moderate turbulence possible ahead (~{0} km)': 'Önünde orta düzey türbülans ihtimali var (~{0} km)',
  'No turbulence reported or forecast on the route ahead': 'Önündeki yolda türbülans bildirimi veya tahmini yok', 'Turbulence info unavailable': 'Türbülans bilgisi alınamadı', 'Checking route ahead…': 'Önündeki yol kontrol ediliyor…',
  'Wind': 'Rüzgar', 'Headwind {0} kt': 'Karşı rüzgar {0} kt', 'Tailwind {0} kt': 'Arka rüzgar {0} kt', 'No significant head/tailwind': 'Belirgin karşı/arka rüzgar yok', '~{0}% of tank left (est., incl. reserve)': 'depoda ~%{0} yakıt kaldı (tahmini, yedek dahil)', 'Fuel to go (est.)': 'Kalan yakıt (tahmini)', 'arrives {0}': 'varış {0}',
  'Turbulence': 'Türbülans', 'Turbulence advisories (SIGMET / G-AIRMET)': 'Türbülans uyarıları (SIGMET / G-AIRMET)', 'Wind arrows': 'Rüzgar okları', 'Wind: FL050': 'Rüzgar: FL050', 'Wind: FL100': 'Rüzgar: FL100', 'Wind: FL180': 'Rüzgar: FL180', 'Wind: FL300': 'Rüzgar: FL300', 'Wind: FL340': 'Rüzgar: FL340', 'Wind: FL390': 'Rüzgar: FL390', 'Night': 'Gece', 'Day / night': 'Gündüz / gece',
  'Wind at {0}': '{0} irtifasında rüzgar', 'Wind data unavailable': 'Rüzgar verisi alınamadı', 'Turbulence data unavailable': 'Türbülans verisi alınamadı', 'Moderate turbulence': 'Orta türbülans', 'Severe turbulence': 'Şiddetli türbülans', 'No turbulence advisories right now': 'Şu an türbülans uyarısı yok',
  'Aircraft': 'Uçaklar',
  'Standard': 'Standart', 'Light': 'Açık', 'Dark': 'Koyu', 'Filters': 'Filtreler', 'Altitude': 'İrtifa', 'Min speed': 'En düşük hız', 'Airport': 'Havalimanı',
  'Departure': 'Kalkış', 'Arrival': 'Varış', 'Departure ↔ arrival': 'Kalkış ↔ varış', 'Airline': 'Havayolu', 'e.g. THY, Pegasus, Lufthansa': 'ör. THY, Pegasus, Lufthansa',
  'Aircraft type': 'Uçak tipi', 'e.g. B738, A320, boeing 777': 'ör. B738, A320, boeing 777', 'Show aircraft on the ground': 'Yerdeki uçakları göster',
  'Favorites only ★': 'Sadece favoriler ★', 'Search callsign or registration…': 'Çağrı kodu ya da tescil ara…',
  '● Live': '● Canlı', 'history': 'geçmiş', 'min': 'en az', 'max': 'en çok', ' min': ' dk', ' h ': ' sa ',
  // status, list, card
  'on ground': 'yerde', 'landed': 'indi', 'Close': 'Kapat', 'Open photo': 'Fotoğrafı aç', 'Previous photo': 'Önceki fotoğraf', 'Next photo': 'Sonraki fotoğraf', 'Photo': 'Fotoğraf',
  '{0} entered the alert zone': '{0} uyarı bölgesine girdi', 'loading…': 'yükleniyor…', 'error': 'hata', 'last updated': 'son güncelleme',
  'wide view: center only, zoom in': 'geniş görünüm: sadece merkez, yakınlaştır', 'demo (30x speed)': 'demo (30 kat hız)', 'FLIGHTS': 'UÇUŞ',
  'loading route info · {0} / {1} aircraft': 'rota bilgisi yükleniyor · {0} / {1} uçak', 'Click the map to set the zone center': 'Bölge merkezini belirlemek için haritaya tıkla',
  'Alert zone set ({0} km)': 'Uyarı bölgesi ayarlandı ({0} km)', '{0} km flown · {1} km to go': '{0} km uçuldu · {1} km kaldı',
  'Registration': 'Tescil', 'Speed': 'Hız', 'Heading': 'Yön', 'Vertical speed': 'Dikey hız', 'Nearest airport': 'En yakın havalimanı', 'Position': 'Konum', 'Owner': 'Sahibi',
  '★ Favorited': '★ Favoride', '☆ Favorite': '☆ Favori', 'Loading route info…': 'Rota bilgisi yükleniyor…', 'Route info not found': 'Rota bilgisi bulunamadı',
  "Couldn't load route info": 'Rota bilgisi yüklenemedi', 'ICAO24': 'ICAO24', 'Squawk': 'Squawk', 'Category': 'Kategori', 'Country': 'Ülke',
  // airport panel
  "Couldn't load airport info": 'Havalimanı bilgisi yüklenemedi', 'Loading…': 'Yükleniyor…', 'Open on Wikipedia': "Wikipedia'da aç", 'Feels like': 'Hissedilen', 'Wind': 'Rüzgâr', 'Gusts': 'Hamle',
  'Humidity': 'Nem', 'Pressure': 'Basınç', 'Visibility': 'Görüş', 'Arrivals': 'Varışlar', 'Departures': 'Kalkışlar', 'Weather unavailable': 'Hava durumu alınamadı',
  'Loading weather…': 'Hava durumu yükleniyor…', 'No aircraft loaded yet': 'Henüz uçak yüklenmedi', 'No arrivals found nearby': 'Yakında varış bulunamadı', 'No departures found nearby': 'Yakında kalkış bulunamadı',
  'Clear sky': 'Açık', 'Mostly clear': 'Çoğunlukla açık', 'Partly cloudy': 'Parçalı bulutlu', 'Overcast': 'Kapalı', 'Fog': 'Sis', 'Freezing fog': 'Buzlu sis', 'Light drizzle': 'Hafif çisenti',
  'Drizzle': 'Çisenti', 'Heavy drizzle': 'Yoğun çisenti', 'Freezing drizzle': 'Donan çisenti', 'Light rain': 'Hafif yağmur', 'Rain': 'Yağmur', 'Heavy rain': 'Şiddetli yağmur',
  'Freezing rain': 'Donan yağmur', 'Light snow': 'Hafif kar', 'Snow': 'Kar', 'Heavy snow': 'Yoğun kar', 'Snow grains': 'Kar taneleri', 'Rain showers': 'Sağanak', 'Violent showers': 'Şiddetli sağanak',
  'Snow showers': 'Kar sağanağı', 'Thunderstorm': 'Gök gürültülü fırtına', 'Thunderstorm, hail': 'Dolu ve fırtına',
  // emergencies, watchlist, today's flights, radar
  'Hijacking': 'Kaçırma', 'Radio failure': 'Telsiz arızası', 'General emergency': 'Genel acil durum', 'Emergency': 'Acil durum',
  '{0} landed': '{0} indi', '{0} took off': '{0} kalktı', 'Watching {0}: you will be notified when it takes off or lands': '{0} takipte: kalkış ve inişte bildirim alacaksın',
  'Watchlist': 'Takip listesi', 'last seen {0} min ago': '{0} dk önce görüldü', 'not seen yet': 'henüz görülmedi', 'Remove': 'Kaldır', 'Not on the map right now': 'Şu an haritada yok',
  '🔔 Watching': '🔔 Takipte', '🔔 Watch': '🔔 Takip et', "Today's flights": 'Bugünkü uçuşlar', "Couldn't load today's flights": 'Bugünkü uçuşlar yüklenemedi',
  'No flights recorded today': 'Bugün kayıtlı uçuş yok', 'in flight': 'havada', 'now': 'şimdi', 'Radar unavailable': 'Radar kullanılamıyor',
  // spotter
  'Already logged': 'Zaten kaydedildi', 'new aircraft': 'yeni uçak', 'new type': 'yeni tip', 'Logged {0}': '{0} kaydedildi', 'Logbook': 'Uçuş defteri', 'aircraft': 'uçak', 'types': 'tip',
  'airlines': 'havayolu', 'Open logbook': 'Defteri aç', 'Export CSV': 'CSV dışa aktar', 'The logbook is empty': 'Defter boş', 'Search the logbook…': 'Defterde ara…',
  'Nothing matches': 'Eşleşen yok', 'The logbook is empty. Open a flight and press “Log sighting”.': 'Defter boş. Bir uçuş aç ve “Gözlemi kaydet”e bas.',
  'NEW AIRCRAFT': 'YENİ UÇAK', 'NEW TYPE': 'YENİ TİP', '✓ Logged': '✓ Kaydedildi', '📓 Log sighting': '📓 Gözlemi kaydet'
};
let LANG = (() => { try { const v = JSON.parse(localStorage.getItem('sky.lang')); if (v === 'tr' || v === 'en') return v; } catch {} return (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en'; })();
const t = (s, ...a) => (LANG === 'tr' && TR[s] || s).replace(/\{(\d)\}/g, (_, i) => a[i]);
const LOC = () => LANG === 'tr' ? 'tr-TR' : 'en-US';
// Translates the static page text (menu, placeholders, tooltips). The originals are kept on the nodes so switching back and forth is lossless.
function applyLang() {
  const skip = '#spt, #wls, #list, #meta, #st, #apSt, #card, #apc, #lb, #hov, #toast, #clock';
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; n = w.nextNode();) {
    if (!n.data.trim() || n.parentElement.closest('script, style') || n.parentElement.closest(skip)) continue;
    n._o = n._o ?? n.data; const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(n._o); n.data = m[1] + t(m[2]) + m[3];
  }
  document.querySelectorAll('[placeholder], [title]').forEach(e => {
    if (e.closest('#card, #apc, #lb, #wls')) return;
    ['placeholder', 'title'].forEach(a => { if (!e.hasAttribute(a)) return; const k = 'o' + a; e.dataset[k] = e.dataset[k] ?? e.getAttribute(a); e.setAttribute(a, t(e.dataset[k])); });
  });
}
