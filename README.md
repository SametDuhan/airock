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

## v0.2 özellikleri
- **İrtifa renkleri:** düşük irtifa sarı/turuncu → yüksek irtifa mor/mavi.
- **Filtreler:** tek çubukta min–max irtifa (sol tutamaç en az, sağ tutamaç en çok), min hız, sadece favoriler.
- **Favoriler:** uçuş kartındaki ☆ ile ekle; localStorage'da saklanır.
- **Havalimanları:** 63 havalimanı (Türkiye, Avrupa, Orta Doğu, dünya); tıklayınca 100 km içindeki uçak sayısı. Uçuş kartında "en yakın havalimanı" gösterilir.
- **Uyarı bölgesi:** "Uyarı bölgesi" → haritaya tıkla (100 km yarıçap, `renderer.js` içinde `ZONE_R`). Bir uçak bölgeye girince bildirim çıkar.
- **Geçmiş:** son 720 kare (5 sn aralıkla, ~1 saat) bellekte tutulur; alttaki çubukla geri sar, "● Canlı" ile dön. Uygulama kapanınca sıfırlanır.

## v0.3 özellikleri
- **Uçuş rotası (nereden → nereye):** uçuş kartında kalkış/varış havalimanı, ilerleme çubuğu, uçulan/kalan mesafe ve tahmini kalan süre.
  Haritada seçili uçak için kesikli rota çizgisi ve havalimanı etiketleri; listede `IST→FRA` gösterimi.
- **Demo:** uçaklar gerçek rotalarda uçar (kalkıştan varışa), varınca yeni rotaya çıkar.
- **Canlı:** rota, çağrı koduna göre [adsbdb.com](https://www.adsbdb.com) API'sinden alınır (ücretsiz, anahtarsız). Veri tablo tabanlıdır; bazı uçuşlarda eksik/eski olabilir.
- **Sol menü:** veri modu (Demo/Canlı), harita katmanları (Havalimanları, Uyarı bölgesi) ve filtreler tek menüde; ✕ ile kapatılır, ☰ ile açılır (durum hatırlanır). Sağ üstte yalnızca saat.
