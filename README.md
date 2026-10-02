# SkyTrack – Flightradar tarzı masaüstü uygulama şablonu

Electron + Leaflet. Harita üzerinde uçak simgeleri, arama/listeleme, uçuş detay paneli ve iz çizgisi içerir.

## Çalıştırma
    npm install
    npm start

## Paketleme (.exe / .dmg / AppImage)
    npm run dist

## Modlar
- **Demo:** Uydurma uçuşlar, internet verisi gerekmez (zaman 30x hızlı akar).
- **Canlı:** açık ADS-B verisi, 15 sn'de bir yenilenir (ayrıntılar aşağıda, *Veri kaynakları*).

## Veri kaynakları
| Ne | Kaynak | Not |
|---|---|---|
| Uçak konumları (yakın görünüm) | [adsb.lol](https://adsb.lol) | Ücretsiz, anahtarsız. Bir noktanın en fazla 250 deniz mili çevresi sorulabilir ve hız sınırı sıkıdır (~10 istek/dk); bu yüzden en fazla 2 daire sorulur. |
| Uçak konumları (geniş görünüm / yedek) | [OpenSky Network](https://opensky-network.org) | Tek istekle tüm alan. Anonim kullanımda günlük kredi düşüktür; kredi bitince (429) 10 dk hiç sorulmaz ve adsb.lol ile yalnız orta bölge gösterilir. |
| Rota (kalkış → varış), uçak tipi/tescil/fotoğraf | [adsbdb.com](https://www.adsbdb.com) | Ücretsiz, anahtarsız. Tablo tabanlıdır; bazı uçuşlarda eksik/eski olabilir. |
| Havayolu logosu | images.kiwi.com | IATA koduna göre. |
| Harita | OpenStreetMap (Standart), Esri gri altlıklar (Açık / Koyu) | |

Tüm istekler `src/data.js` içindedir; masaüstünde ana süreçten (`main.js`), tarayıcıda doğrudan çalışır.
Not: adsb.lol ve OpenSky tarayıcıdan gelen isteklere CORS izni vermez, yani canlı mod yalnızca masaüstü uygulamada çalışır.

## Nereden geliştirilir?
- `src/data.js` → veri kaynakları (uçuşlar, rota, uçak bilgisi)
- `main.js` → Electron penceresi ve `data.js`'e köprü (IPC)
- `src/renderer.js` → harita, canvas uçak katmanı, panel, liste mantığı
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
  Haritada seçili uçak için koyu kenarlı, düz kırmızı-pembe rota çizgisi ve havalimanı etiketleri; listede `IST→FRA` gösterimi.
- **Demo:** uçaklar gerçek rotalarda uçar (kalkıştan varışa), varınca yeni rotaya çıkar.
- **Canlı:** rota, çağrı koduna göre [adsbdb.com](https://www.adsbdb.com) API'sinden alınır (ücretsiz, anahtarsız). Veri tablo tabanlıdır; bazı uçuşlarda eksik/eski olabilir.
- **Sol menü:** veri modu (Demo/Canlı), harita katmanları (Havalimanları, Uyarı bölgesi) ve filtreler tek menüde; ✕ ile kapatılır, ☰ ile açılır (durum hatırlanır). Sağ üstte yalnızca saat.
- **Hızlı bölge yükleme (canlı):** harita kaydırılıp/zoom yapılınca 0,4 sn içinde yeni bölge istenir. Görünen alanın %15 genişi alındığından küçük hareketler yeni istek atmaz; hızlı ardışık atlamalarda yalnızca son cevap kullanılır.
- **Havalimanı filtresi:** Filtreler'de *Kalkış* ve *Varış* kutuları. Yalnız kalkış → o havalimanından kalkanlar; yalnız varış → oraya gidenler; ikisi birden → tam o rotadakiler. IATA (IST), ICAO (LTFM) veya şehir adı (İstanbul) yazılabilir, ⇄ ile yer değiştirilir. Canlı modda filtre açıkken ekrandaki uçakların rotaları arka planda (aynı anda en fazla 3 istek) yüklenir; rotası bilinmeyen uçaklar filtre açıkken gizlenir.

## v0.4 özellikleri
- **Yeni veri kaynağı:** adsb.lol (birincil) + OpenSky (geniş görünüm / yedek); yenileme 30 sn → 15 sn.
- **Performans:** uçaklar tek bir canvas'a çizilir; Avrupa genelinde ~3.700 uçak tek karede ~8 ms. Uzaklaştıkça simgeler küçülür.
- **Uçak bilgisi:** kartta havayolu logosu, uçak tipi, tescil, sahibi ve (varsa) fotoğraf; fotoğrafa tıklayınca sistem tarayıcısında büyük hali açılır.
- **Büyük daire rotaları:** rota çizgisi dünyanın eğriliğini izler (IST→JFK gibi uzun uçuşlarda doğru yay).
- **İz:** her uçağın son ~30 dk izi 5 sn'de bir kaydedilir; uçak seçilince geçmiş izi hemen görünür.
- **Yerdeki uçaklar:** gri, küçük simgeyle gösterilir; Filtreler'de *Yerdeki uçakları göster* ile gizlenebilir.
- **Harita stili:** Standart (OSM), Açık ve Koyu (Esri gri altlıklar); seçim hatırlanır.
- **Diğer:** üzerine gelince uçuş etiketi, tescil koduyla arama, dış kaynaklı metinlerin HTML kaçışı, uygulama penceresinde dış sayfaya gidilmesinin engellenmesi.
