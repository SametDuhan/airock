# SkyTrack – Flightradar tarzı masaüstü uygulama şablonu

Electron + Leaflet. Harita üzerinde uçak simgeleri, arama/listeleme, uçuş detay paneli ve iz çizgisi içerir.

## Çalıştırma
    npm install
    npm start

## Paketleme (.exe / .dmg / AppImage)
    npm run dist

## Modlar
- **Demo:** Uydurma uçuşlar, internet verisi gerekmez (zaman 30x hızlı akar).
- **Canlı:** OpenSky Network API (ücretsiz). Anonim kullanımda günlük kredi sınırı düşüktür; sık yenileme
  istiyorsan opensky-network.org'da hesap açıp `main.js` içindeki isteğe kimlik bilgisi ekle.

## Nereden geliştirilir?
- `main.js` → veri kaynağı (burayı adsb.lol / airplanes.live gibi başka bir ADS-B API ile değiştirebilirsin)
- `src/renderer.js` → harita, marker, panel, liste mantığı
- `src/index.html` → arayüz ve tema (CSS burada)

## Fikirler
Uçuş rotası/havalimanı bilgisi, filtreler (irtifa, hız), favoriler, ses/uyarı, geçmiş iz kaydı (SQLite), tema seçenekleri.

Not: Flightradar24'ün kendi verisi ticari API'dir; bu şablon açık ADS-B verisi kullanır.
