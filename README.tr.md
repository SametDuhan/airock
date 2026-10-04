# SkyTrack

[English](README.md) · **Türkçe**

[![tests](https://github.com/SametDuhan/airock/actions/workflows/test.yml/badge.svg)](https://github.com/SametDuhan/airock/actions/workflows/test.yml) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) ![platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

SkyTrack, uçuşları harita üzerinde canlı izlemeni sağlayan, Flightradar24 benzeri ücretsiz bir masaüstü uygulaması. Windows, macOS ve Linux'ta çalışıyor. Açık ADS-B verisi kullandığı için hesap ya da API anahtarı gerekmiyor.

![İstanbul çevresindeki canlı uçuşlar; seçili uçuşun rotası ve bilgileri](docs/screenshot.jpg)

## Özellikler

- **Canlı uçuşlar**: uçak konumları 15 saniyede bir yenilenir. Haritayı kaydırınca ya da yakınlaştırınca yeni bölge hemen yüklenir.
- **Demo modu**: internet gerektirmeyen 45 sanal uçuş. Zaman 30 kat hızlı akar.
- **Uçuş bilgisi**: bir uçağa tıklayınca şunları görürsün:
  - havayolu ve logosu, uçak tipi, tescil ve (varsa) fotoğraf
  - rota (kalkış → varış), ilerleme çubuğu, kalan mesafe ve tahmini kalan süre
  - irtifa, hız ve dikey hız
- **Rota ve iz**: rota büyük daire yayı olarak, yani dünya üzerindeki gerçek en kısa yol olarak çizilir. İz, uçağın son ~30 dakikada nereden geçtiğini gösterir.
- **Filtreler**:
  - tek çubukta irtifa aralığı (sol tutamaç en az, sağ tutamaç en çok)
  - en düşük hız
  - kalkış ve/veya varış havalimanı; kodla (IST, LTFM) ya da şehir adıyla
  - yerdeki uçakları gösterme/gizleme ve sadece favoriler
- **Favoriler**: bir uçuşu ☆ ile işaretleyip sonra kolayca bulabilirsin.
- **Uyarı bölgesi**: haritaya tıklayarak bir daire belirlersin (varsayılan 100 km; yarıçapı menüden 10–500 km arasında değiştirebilirsin). Bir uçak daireye girince, ya da ilk kez daire içinde görününce bildirim gelir.
- **Geçmişi oynatma**: alttaki çubukla son bir saati geri sarabilirsin. *● Canlı* düğmesi canlı görünüme döndürür.
- **Harita stili**: Standart, Açık veya Koyu.
- **Çok uçakta da hızlı**: bütün uçaklar tek bir tuvale (canvas) çizilir. Avrupa genelinde yaklaşık 3.700 uçak yaklaşık 8 ms'de çizilir.

## İndir

Kendi sistemin için kurulum dosyasını [son sürümden](https://github.com/SametDuhan/airock/releases/latest) indir (Windows için `.exe`, macOS için `.dmg`, Linux için AppImage). Hesap gerekmez. Kaynaktan çalıştırmak istersen aşağıya bak.

## Kurulum ve çalıştırma

[Node.js](https://nodejs.org) 18 veya daha yeni bir sürüm gerekiyor.

```bash
git clone https://github.com/SametDuhan/airock.git
cd airock
npm install
npm start
```

İşletim sistemin için kurulum dosyası (`.exe`, `.dmg` veya AppImage) oluşturmak için şunu çalıştır:

```bash
npm run dist
```

Kurulum dosyası `dist/` klasöründe oluşur.

## Nasıl kullanılır?

| Ne yapmak istiyorum? | Nasıl? |
|---|---|
| Gerçek uçuşları görmek | Sol menüde **Canlı**'ya tıkla. **Demo** sanal uçuşlara geri döner. |
| Bir uçağın bilgilerini görmek | Uçağa haritada ya da listede tıkla. Kartı **✕** ile kapat. |
| Bir uçuşu bulmak | Arama kutusuna çağrı kodu (ör. `THY1`) ya da tescil (ör. `TC-JPN`) yaz. |
| Sadece İstanbul'dan Frankfurt'a gidenleri görmek | *Filtreler* bölümünde **Kalkış**'a `IST`, **Varış**'a `FRA` yaz. Tek kutuyu doldurursan o havalimanından kalkan ya da oraya giden bütün uçuşları görürsün. |
| Yan menüyü gizlemek/göstermek | Menünün üstündeki **✕** ile kapat, haritadaki **☰** ile geri aç. |
| Geçmişe dönmek | Haritanın altındaki çubuğu sürükle. |

## Veri kaynakları

| Veri | Kaynak | Not |
|---|---|---|
| Uçak konumları (yakın görünüm) | [adsb.lol](https://adsb.lol) | Ücretsiz, anahtarsız. İstek sınırı sıkı (~10 istek/dk). |
| Uçak konumları (geniş görünüm / yedek) | [OpenSky Network](https://opensky-network.org) | Geniş bir alanı tek istekte getirir. Giriş yapmadan kullanımda günlük sınır düşük. |
| Rota, uçak tipi, tescil, fotoğraf | [adsbdb.com](https://www.adsbdb.com) | Ücretsiz, anahtarsız. Bazı uçuşlarda eksik ya da eski olabilir. |
| Havayolu logoları | images.kiwi.com | |
| Haritalar | OpenStreetMap, Esri | |

Bütün ağ istekleri [`src/data.js`](src/data.js) dosyasında.

> Flightradar24'ün kendi verisi ücretli, ticari bir API. SkyTrack sadece açık, gönüllülerin topladığı ADS-B verisini kullanır; bu yüzden bazı bölgelerde kapsama daha zayıf olabilir.

## Sık karşılaşılan durumlar

- **Durum satırında hata görünüyor ya da uzaklaşınca az uçak çıkıyor.**
  Ücretsiz kaynakların istek sınırı var. OpenSky'ın günlük hakkı bitince SkyTrack sadece haritanın ortasını gösterir ve yakınlaştırmanı ister. Yakınlaştırmak genelde sorunu çözer.
- **`src/index.html` dosyasını tarayıcıda açınca canlı mod çalışmıyor.**
  Veri kaynakları isteklere sadece masaüstü uygulamadan izin veriyor, web sayfasından gelenleri engelliyor. `npm start` ile çalıştır. Demo modu ikisinde de çalışır.
- **Bir uçuşta "Rota bilgisi bulunamadı" yazıyor.**
  Rota veritabanı bu çağrı kodunu bilmiyor. Diğer bilgiler yine görünür.

## Proje yapısı

```
main.js           Electron penceresi; uygulamadan gelen veri isteklerini src/data.js'e iletir
preload.js        Bu istekleri uygulamaya güvenli şekilde açar
src/index.html    Arayüz ve stiller
src/loader.js     Leaflet'i yükler (önce yerel kopya, olmazsa CDN), sonra uygulamayı başlatır
src/geo.js        Mesafe, yön ve büyük daire yardımcıları (testli)
src/data.js       Bütün veri kaynakları: uçuşlar, rotalar, uçak bilgisi
src/renderer.js   Harita, uçak katmanı, uçuş kartı, liste, filtreler, geçmiş oynatma
docs/             README'deki ekran görüntüleri
```

[Electron](https://www.electronjs.org) ve [Leaflet](https://leafletjs.com) ile yapıldı.

## Katkı

Hata bildirimi, fikir ve pull request'ler memnuniyetle karşılanır. [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına ve [`good first issue`](https://github.com/SametDuhan/airock/labels/good%20first%20issue) listesine bak. SkyTrack işine yaradıysa bir ⭐ başkalarının da bulmasına yardım eder.

[MIT Lisansı](LICENSE) ile yayımlanmıştır.
