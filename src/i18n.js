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
  '{0} s ago': '{0} sn önce', '{0} min ago': '{0} dk önce',
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
  'Hijacking': 'Kaçırma', 'Radio failure': 'Telsiz arızası', 'General emergency': 'Genel acil durum', 'Emergency': 'Acil durum', 'What does this code mean?': 'Bu kod ne anlama geliyor?',
  '{0} landed': '{0} indi', '{0} took off': '{0} kalktı', 'Watching {0}: you will be notified when it takes off or lands': '{0} takipte: kalkış ve inişte bildirim alacaksın',
  'Watchlist': 'Takip listesi', 'last seen {0} min ago': '{0} dk önce görüldü', 'not seen yet': 'henüz görülmedi', 'Remove': 'Kaldır', 'Not on the map right now': 'Şu an haritada yok',
  '🔔 Watching': '🔔 Takipte', '🔔 Watch': '🔔 Takip et', "Today's flights": 'Bugünkü uçuşlar', "Couldn't load today's flights": 'Bugünkü uçuşlar yüklenemedi',
  'No flights recorded today': 'Bugün kayıtlı uçuş yok', 'in flight': 'havada', 'now': 'şimdi', 'Radar unavailable': 'Radar kullanılamıyor',
  // spotter
  'Already logged': 'Zaten kaydedildi', 'new aircraft': 'yeni uçak', 'new type': 'yeni tip', 'Logged {0}': '{0} kaydedildi', 'Logbook': 'Uçuş defteri', 'aircraft': 'uçak', 'types': 'tip',
  'airlines': 'havayolu', 'Open logbook': 'Defteri aç', 'Export CSV': 'CSV dışa aktar', 'The logbook is empty': 'Defter boş', 'Search the logbook…': 'Defterde ara…',
  'Nothing matches': 'Eşleşen yok', 'The logbook is empty. Open a flight and press “Log sighting”.': 'Defter boş. Bir uçuş aç ve “Gözlemi kaydet”e bas.',
  'NEW AIRCRAFT': 'YENİ UÇAK', 'NEW TYPE': 'YENİ TİP', '✓ Logged': '✓ Kaydedildi', '📓 Log sighting': '📓 Gözlemi kaydet',
  // flight diary, share image, profile, settings, airport board
  'Vert. speed': 'Dikey hız', 'SkyTrack keeps running in the tray when you close the window': 'Pencereyi kapatınca SkyTrack tepside çalışmaya devam eder', '📓 Flight diary': '📓 Uçuş günlüğü',
  'Keep running in the tray': 'Tepside çalışmaya devam et', 'Desktop notifications': 'Masaüstü bildirimleri', 'Flight diary': 'Uçuş günlüğü', 'Flights': 'Uçuşlar', 'Distance': 'Mesafe', 'Around the Earth': 'Dünya turu',
  '(est.)': '(tahmini)', 'From': 'Nereden', 'To': 'Nereye', 'Flight no.': 'Uçuş no', 'Add': 'Ekle',
  'Your diary is empty. Add a flight above, or open a flight on the map and press “Add to diary”.': 'Günlüğün boş. Yukarıdan uçuş ekle ya da haritada bir uçuş açıp “Günlüğe ekle”ye bas.',
  'Unknown airport: use an IATA or ICAO code, e.g. IST or LTFM': 'Bilinmeyen havalimanı: IATA veya ICAO kodu kullan, örn. IST veya LTFM', 'Share image': 'Görsel paylaş', 'Add to diary': 'Günlüğe ekle', 'Added to your diary': 'Günlüğüne eklendi',
  'Free flight tracker · no account, no ads': 'Ücretsiz uçuş takibi · hesap yok, reklam yok', 'Image saved and copied to the clipboard': 'Görsel kaydedildi ve panoya kopyalandı', 'Image saved': 'Görsel kaydedildi', 'Altitude & speed': 'İrtifa ve hız',
  'Landing': 'İniyor', 'Approaching': 'Yaklaşıyor', 'Departed': 'Kalktı', 'En route': 'Yolda',
  // tools, tour, search, units
  'A free flight tracker: no account, no ads. Here is a quick tour of what you can do.': 'Ücretsiz bir uçuş takip uygulaması: hesap yok, reklam yok. İşte neler yapabileceğine hızlı bir bakış.',
  'Aircraft within {0} of your spot': 'Konumunun {0} çevresindeki uçaklar',
  'Airline code': 'Havayolu kodu',
  'Airport code': 'Havalimanı kodu',
  'Alert zone set ({0})': 'Uyarı bölgesi ayarlandı ({0})',
  'Alerts': 'Uyarılar',
  'App': 'Uygulama',
  'Back': 'Geri',
  'Callsign contains': 'Çağrı kodu içerir',
  'Choose where you are': 'Nerede olduğunu seç',
  'Click a plane to see its route, photo, altitude, speed and more. Click an airport (yellow dot) for its weather and arrivals.': 'Bir uçağa tıkla: rotasını, fotoğrafını, irtifasını, hızını ve daha fazlasını gör. Bir havalimanına (sarı nokta) tıklarsan hava durumunu ve varışları görürsün.',
  'Click any aircraft': 'Herhangi bir uçağa tıkla',
  'Click the map to set your spot': 'Konumunu belirlemek için haritaya tıkla',
  'Click the map where you are, or type an airport code. SkyTrack lists the aircraft flying around that spot, with the direction to look and how high in the sky.': 'Haritada olduğun yere tıkla ya da bir havalimanı kodu yaz. SkyTrack, o noktanın çevresinde uçan uçakları, hangi yöne bakacağını ve gökyüzünde ne kadar yüksekte olduklarını listeler.',
  'Click the map': 'Haritaya tıkla',
  'Move my spot': 'Konumumu taşı',
  'Done': 'Bitti',
  'Next': 'İleri',
  'Download': 'İndir',
  'Downloading update {0}…': '{0} güncellemesi indiriliyor…',
  'Get a notification when an aircraft you care about shows up on the map.': 'İlgilendiğin bir uçak haritada görününce bildirim al.',
  'Headwind {0}': 'Karşı rüzgar {0}',
  'Tailwind {0}': 'Arka rüzgar {0}',
  'Helicopters': 'Helikopterler',
  'Hide or show the menu any time. Enjoy the sky!': 'Menüyü istediğin zaman gizle ya da göster. Gökyüzünün tadını çıkar!',
  'High turbulence risk ahead (~{0})': 'Önünde yüksek türbülans ihtimali var (~{0})',
  'Moderate turbulence possible ahead (~{0})': 'Önünde orta düzey türbülans ihtimali var (~{0})',
  'Keep a flight diary, set alerts for rare aircraft, see what is flying overhead, and change units in Settings.': 'Uçuş günlüğü tut, nadir uçaklar için uyarı kur, tepende neyin uçtuğunu gör ve Ayarlar\'dan birimleri değiştir.',
  'Menu button': 'Menü düğmesi',
  'Military aircraft': 'Askeri uçaklar',
  'Narrow the map by altitude, speed, airport, airline or aircraft type.': 'Haritayı irtifa, hız, havalimanı, havayolu veya uçak tipine göre daralt.',
  'New version {0} available': 'Yeni sürüm {0} hazır',
  'No alerts yet. Add one above.': 'Henüz uyarı yok. Yukarıdan bir tane ekle.',
  'Nothing overhead right now.': 'Şu an tepende uçak yok.',
  'Overhead': 'Tepemde',
  'Radius': 'Yarıçap',
  'Restart': 'Yeniden başlat',
  'Search the whole world': 'Tüm dünyada ara',
  'Settings': 'Ayarlar',
  'Show the tour again': 'Turu tekrar göster',
  'Skip': 'Atla',
  'Switch the whole app between English, Turkish, Spanish, German and French.': 'Tüm uygulamayı İngilizce, Türkçe, İspanyolca, Almanca ve Fransızca arasında değiştir.',
  'Temperature': 'Sıcaklık',
  'Time': 'Saat',
  'Type a callsign, registration, aircraft type or airport. Results are not limited to the part of the map you see.': 'Bir çağrı kodu, tescil, uçak tipi veya havalimanı yaz. Sonuçlar sadece haritada gördüğün bölgeyle sınırlı değil.',
  'Units': 'Birimler',
  'Update {0} is ready': '{0} güncellemesi hazır',
  'Welcome to SkyTrack': 'SkyTrack\'e hoş geldin',
  'Worldwide': 'Dünya genelinde',
  'Your language': 'Dilin',
  'Your tools': 'Araçların',
  'e.g. A388, THY, TC-JNA': 'ör. A388, THY, TC-JNA',
  '{0} flown · {1} to go': '{0} uçuldu · {1} kaldı',
  '{0} more aircraft match your alerts': '{0} uçak daha uyarılarınla eşleşiyor',
  '⚙ Settings': '⚙ Ayarlar',
  '📍 Overhead': '📍 Tepemde',
  '🔔 Alerts': '🔔 Uyarılar'
};
// Languages: English (default texts), Turkish (TR below), Spanish / German / French (DICT in langs.js)
const LANGS = [{ c: 'en', n: 'English', loc: 'en-US' }, { c: 'tr', n: 'Türkçe', loc: 'tr-TR' }, { c: 'es', n: 'Español', loc: 'es-ES' }, { c: 'de', n: 'Deutsch', loc: 'de-DE' }, { c: 'fr', n: 'Français', loc: 'fr-FR' }];
const DICT = { tr: TR };
let LANG = (() => { try { const v = JSON.parse(localStorage.getItem('sky.lang')); if (LANGS.some(l => l.c === v)) return v; } catch {} const b = (navigator.language || '').toLowerCase().slice(0, 2); return LANGS.some(l => l.c === b) ? b : 'en'; })();
const t = (s, ...a) => ((LANG !== 'en' && DICT[LANG]?.[s]) || s).replace(/\{(\d)\}/g, (_, i) => a[i]);
const LOC = () => LANGS.find(l => l.c === LANG).loc;
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

// ---- Units and time format (Settings): stored in localStorage 'sky.units'. Internal data stays in km / ft / kt / °C; these only format for display.
const U = Object.assign({ dist: 'km', alt: 'ft', spd: 'kt', temp: 'c', h24: true }, (() => { try { return JSON.parse(localStorage.getItem('sky.units')) || {}; } catch { return {}; } })());
const nf = (n, d = 0) => n.toLocaleString(LOC(), { maximumFractionDigits: d, minimumFractionDigits: 0 });
const uDist = km => U.dist === 'mi' ? [km * .621371, 'mi'] : U.dist === 'nm' ? [km * .539957, 'nm'] : [km, 'km'];
const uAlt = ft => U.alt === 'm' ? [ft * .3048, 'm'] : [ft, 'ft'];
const uSpd = kt => U.spd === 'kmh' ? [kt * 1.852, 'km/h'] : U.spd === 'mph' ? [kt * 1.15078, 'mph'] : [kt, 'kt'];
const uVs = fpm => U.alt === 'm' ? [fpm * .00508, 'm/s'] : [fpm, 'ft/min'];
const uTemp = c => U.temp === 'f' ? [c * 9 / 5 + 32, '°F'] : [c, '°C'];
const fmtDist = (km, d = 0) => { const [n, u] = uDist(km); return nf(n, d) + ' ' + u; };
const fmtAlt = (ft, r = 1) => { const [n, u] = uAlt(ft); return nf(u === 'm' && r > 1 ? Math.round(n / 10) * 10 : Math.round(n / r) * r) + ' ' + u; };
const fmtSpd = kt => { const [n, u] = uSpd(kt); return Math.round(n) + ' ' + u; };
const fmtVs = fpm => { const [n, u] = uVs(fpm); return (u === 'm/s' ? n.toFixed(1) : Math.round(n)) + ' ' + u; };
const fmtTemp = c => { const [n, u] = uTemp(c); return Math.round(n) + u; };
const TF = (o = {}) => ({ ...o, hour12: !U.h24 });
