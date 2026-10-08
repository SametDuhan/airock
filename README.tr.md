# SkyTrack

[English](README.md) · **Türkçe**

[![tests](https://github.com/SametDuhan/airock/actions/workflows/test.yml/badge.svg)](https://github.com/SametDuhan/airock/actions/workflows/test.yml) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) ![platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

SkyTrack, uçuşları harita üzerinde canlı izlemeni sağlayan, Flightradar24 benzeri ücretsiz bir masaüstü uygulaması. Windows, macOS ve Linux'ta çalışıyor. Açık ADS-B verisi kullandığı için hesap ya da API anahtarı gerekmiyor.

![İstanbul çevresindeki canlı uçuşlar; seçili uçuşun rotası ve bilgileri](docs/screenshot.jpg)

## Özellikler

- **Canlı uçuşlar**: uçak konumları 15 saniyede bir yenilenir. Haritayı kaydırınca ya da yakınlaştırınca yeni bölge hemen yüklenir.
- **Demo modu**: internet gerektirmeyen 45 sanal uçuş. Zaman 30 kat hızlı akar.
- **Web demosu**: SkyTrack'i tarayıcıda dene: [sametduhan.github.io/airock/app/](https://sametduhan.github.io/airock/app/). Uçuşlar ve türbülans alanları sanaldır; canlı veri için masaüstü uygulaması gerekir. Yeniden derlemek için `npm run build:web` (çıktı `site/app/` içinde).
- **Rota kontrolü**: iki havalimanı seç (**Mod → Rota kontrolü**); FL280, FL340 ve FL390'da yol boyunca bildirilen türbülansı, ilk görüldüğü yeri ve haritada çizgiyi gör.
- **Takip ettiğin uçuşlar için türbülans uyarısı**: takip listendeki bir uçuşun önündeki yol sallantılı olunca (ve düzelince) SkyTrack haber verir. **🔔 Uyarılar → Bir uçuşu takip et**, kalkıştan önce `TK1` gibi bir uçuş numarası alır ve havalanınca izlemeye başlar.
- **Koltuk ipuçları**: uçuş kartı güneşin uçağın hangi tarafında olduğunu (gerçek güneş konumundan) ve türbülans varsa kabinde en az nerede hissedildiğini söyler.
- **Takip bağlantısı**: canlı bir uçuşta **🔗 Takip bağlantısını kopyala**, bir arkadaşın ya da yakının açabileceği bir sayfa verir (`site/track/`). `proxy/` içindeki proxy'yi gerektirir; `src/data.js` içinde `PROXY_URL` ayarlanana kadar kapalı kalır.
- **Uçuş bilgisi**: bir uçağa tıklayınca şunları görürsün:
  - havayolu ve logosu, uçak tipi, tescil ve (varsa) fotoğraf
  - rota (kalkış → varış), ilerleme çubuğu, kalan mesafe ve tahmini kalan süre
  - irtifa, hız ve dikey hız, karşı/arka rüzgar ile kalan yol için kaba bir yakıt ve CO₂ tahmini (tahmini kalan yakıt için bir çubukla)
  - **türbülans** satırı: önündeki yolda, uçağın irtifasında türbülans bildirimi ya da tahmini yoksa yeşil, orta ihtimalde sarı, yüksek ihtimalde kırmızı (SIGMET / G-AIRMET uyarıları ve son pilot raporları)
  - tescilinin ait olduğu ülkenin bayrağı ve tahmini varış saati
- **Rota ve iz**: rota büyük daire yayı olarak, yani dünya üzerindeki gerçek en kısa yol olarak çizilir. İz, uçağın son ~30 dakikada nereden geçtiğini gösterir. Canlı modda uçulan kısım uçağın gerçek izini izler ve kalkış havalimanından başlar; aynı uçağın daha önceki bir uçuşu çizgiye karışmaz.
- **Havalimanı paneli**: bir havalimanına (sarı nokta) tıklayınca sağda bir panel açılır:
  - havalimanının fotoğrafı, bulunduğu şehir ve ülke
  - anlık hava durumu: sıcaklık, rüzgâr, hamle, nem, basınç ve görüş
  - görebildiğin uçakların **Varışlar** ve **Kalkışlar** listesi; birine tıklayınca haritada tıklamış gibi uçuş kartı açılır
- **Filtreler**: Filtreler kartı kaç filtrenin açık olduğunu gösterir ve **Filtreleri sıfırla** düğmesi vardır.
  - irtifa ve hız aralığı (sol tutamaç en az, sağ tutamaç en çok)
  - **uçuş evresi**: hepsi, tırmanış, seyir ya da alçalış (dikey hıza göre)
  - kalkış ve/veya varış havalimanı; kodla (IST, LTFM) ya da şehir adıyla
  - havayolu, uçak tipi ve ülke (ülke veriden ya da tescil önekinden bulunur)
  - metin kutusunun yanındaki **+**, yazdığını etikete çevirir; böylece tek filtreye birden çok değer girilir (THY ve Pegasus). **×** alanı temizler
  - yerdeki uçakları gösterme/gizleme, sadece favoriler ve sadece acil durumlar
- **Sadeleşen menü**: menü bölümleri başlığında sarı çubuk olan ayrı kartlardır, Harita bölümü kapalı başlar. **Ayarlar** ve **İletişim** (hata bildir, özellik iste, rapor için uygulama bilgisini kopyala) altta ince bir çubukta durur. Menü düğmesi, menünün açık olup olmadığını gösteren bir panel simgesidir.
- **Daha doğru rota**: uçak havadayken veritabanındaki rota, uçak belli ki o rotada değilse (hattan çok uzak ya da varıştan uzaklaşıyorsa) gösterilmez; çünkü havayolları çağrı kodlarını yeniden kullanır.
- **Acil durum**: 7500, 7600 ya da 7700 squawk kodu veren uçağın etrafında yanıp sönen kırmızı halka çıkar ve bildirim gelir; listede ⚠ görünür.
- **Takip listesi**: uçuş kartında **🔔 Takip et**'e bas. SkyTrack takip ettiğin uçakları dünyanın neresinde olursa olsun 45 saniyede bir sorar; biri kalkınca ya da inince bildirim gelir.
- **Bugünkü uçuşlar**: canlı bir uçuş kartında **Bugünkü uçuşlar**, uçağın bugün yaptığı bütün uçuşları (saat, mesafe, en yüksek irtifa) listeler. Birine tıklayınca haritada çizilir.
- **Yağış radarı**: **Radar** düğmesi canlı yağış katmanı ekler. Havalimanı paneli ayrıca havalimanının METAR ve TAF raporunu, VFR/IFR uçuş kategorisiyle birlikte gösterir.
- **Harita katmanları**: yağış radarına ek olarak **Türbülans** düğmesi SIGMET / G-AIRMET türbülans alanlarını, **Rüzgar** rüzgar oklarını (açılan seçiciden irtifayı seç), **Gece** ise Dünya'nın gece tarafını çizer.
- **Katlanan menü**: sol menüdeki bir bölümün başlığına (Veri, Mod, Harita, Filtreler, Uçaklar) tıklayınca o bölüm kapanır. Neyi kapattığını hatırlar.
- **Uçak gözlemci modu**: **Mod** bölümünden açılır. Defter (uçuş kartında **📓 Gözlemi kaydet**, CSV dışa aktarma), *yeni uçak* / *yeni tip* rozetleri ve ek bilgiler (ICAO24, squawk, kategori) ekler. Normal modda bunların hiçbiri görünmez.
- **On beş dil**: menünün üstündeki dil düğmesi tüm arayüzü İngilizce, Türkçe, İspanyolca, Almanca, Fransızca, Arapça ve Farsça (sağdan sola), Çince, Japonca, Korece, İtalyanca, Rusça, Portekizce, Lehçe ve Svahili arasında değiştirir. Sistem diliyle açılır. Yeni dil eklemek için `src/langs.js` içine bir tablo ve `src/i18n.js` içindeki `LANGS` listesine bir satır eklemen yeter.
- **Farklı uçak simgeleri**: helikopterlerin rotorlu simgesi var, dört motorlu yolcu uçakları (A380, 747) en büyük çizilir; iki motorlu yolcu uçakları, iş jetleri, turboproplar ve hafif uçaklar ayrı şekillerde. Simgeler uçak sınıfına göre boyutlanır (geniş gövdeler büyük, hafif uçaklar küçük; uzaklaşınca fark azalır) ve havalimanına yakınlaştıkça büyür. Havalimanı hizmet konumları (kule, yer, itfaiye...) ve yer araçları küçük kutu olarak çizilir. Hepsi irtifaya göre renklenir.
- **Kalabalığı azalt**: **Ayarlar**'dan küçük havalimanlarını ve heliportları gizleyebilirsin.
- **İrtifa ve hız grafiği**: canlı uçuş kartında, uçuş boyunca irtifa ve hızı gösteren küçük bir grafik çıkar.
- **Görsel paylaş**: uçuş kartındaki **📷 Görsel paylaş**, uçuşun rotası, çağrı kodu ve sayılarıyla bir resim kaydeder (panoya da kopyalar).
- **Uçuş günlüğü**: **Mod** altındaki **Uçuş günlüğü** kendi uçuşlarını tutar (tarih, rota, uçuş no, uçak); toplam mesafe, Dünya turu sayısı, yolcu başına tahmini CO₂ ve CSV dışa aktarma var. Uçuş kartındaki **Günlüğe ekle** bunu senin yerine doldurur.
- **Tepsi ve bildirimler**: **Mod** altında pencereyi kapatınca SkyTrack'i sistem tepsisinde çalışır tutabilir (takip listesi bildirimleri gelmeye devam eder) ve masaüstü bildirimlerini açıp kapatabilirsin.
- **Her sistem için indirme**: Windows kurulumu, macOS (.dmg, Apple silikon ve Intel) ve Linux (.AppImage) her sürüme derleme akışıyla eklenir.
- **Uydu bulutları ve izler:** **Bulutlar** düğmesi uçakların altında NASA'nın son uydu görüntüsünü (bulutlarla) gösterir; **İzler** her uçağın nereden geldiğini (5 ya da 30 dakika, irtifaya göre renkli) çizer.
- **İstatistikler:** **İstatistikler** (**Mod** altında), SkyTrack'in şu an gördüklerini özetler: havadaki ve yerdeki uçaklar, en yüksek ve en hızlı uçak, en çok görülen havayolları ve tipler, en yoğun havalimanları.
- **Daha uzun geri sarma:** Ayarlar'dan 1, 3 ya da 6 saat geriye sarabilirsin.
- **Daha güvenilir veri:** SkyTrack canlı modda açılır ve harita son bilinen konumlarla dolu gelir; ücretsiz veri kaynakları yoğunsa anlaşılır bir mesaj gösterir ve daha yüksek günlük limit için kendi ücretsiz OpenSky API istemcini kullanabilir.
- **Kendi yönteminle kur:** kurulum dosyalarına ek olarak winget ve Arch (AUR) için manifestolar [`packaging/`](packaging/) klasöründe, bkz. [docs/PACKAGING.md](docs/PACKAGING.md).
- **Favoriler**: bir uçuşu ☆ ile işaretleyip sonra kolayca bulabilirsin.
- **Uyarı bölgesi**: haritaya tıklayarak bir daire belirlersin (varsayılan 100 km; yarıçapı menüde − ve + düğmeleriyle 3–500 km arasında değiştirebilirsin). Bir uçak daireye girince, ya da ilk kez daire içinde görününce bildirim gelir.
- **Geçmişi oynatma**: alttaki çubukla son bir saati geri sarabilirsin. *● Canlı* düğmesi canlı görünüme döndürür.
- **Harita stili**: Standart, Açık veya Koyu. Fare imleci ve filtre kutucukları SkyTrack'in sarı-siyah görünümünü kullanır.
- **Çok uçakta da hızlı**: bütün uçaklar tek bir tuvale (canvas) çizilir. Avrupa genelinde yaklaşık 3.700 uçak yaklaşık 8 ms'de çizilir.

## İndir

- **Windows:** [kurulum dosyasını indir](https://github.com/SametDuhan/airock/releases/latest/download/SkyTrack-Setup.exe) (`SkyTrack-Setup.exe`) ya da tüm [sürümlere](https://github.com/SametDuhan/airock/releases) bak. Kurulum dosyası henüz kod imzalı değil; Windows uyarı verirse *Daha fazla bilgi*'ye, sonra *Yine de çalıştır*'a tıkla.
- **macOS, Linux ya da konsoldan kurmak istersen:** kaynaktan kur, aşağıya bak.

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
| Bir havalimanının hava durumunu, varış ve kalkışlarını görmek | Haritada havalimanının sarı noktasına tıkla. **Varışlar** ve **Kalkışlar** arasında geçiş yap, bir uçuşa tıklayıp aç. Paneli **✕** ile kapat. |
| Bir uçak kalkınca ya da inince haber almak | Uçağı aç ve **🔔 Takip et**'e bas. Takipteki uçaklar menüde *Takip listesi* altında görünür. |
| Gözlem defteri tutmak | **Mod** bölümünden **Uçak gözlemci**'yi seç, bir uçuş aç ve **📓 Gözlemi kaydet**'e bas. **Defteri aç** hepsini gösterir, **CSV dışa aktar** kaydeder. |
| Bir uçağın bilgilerini görmek | Uçağa haritada ya da listede tıkla. Kartı **✕** ile kapat. |
| Bir uçuşu bulmak | Arama kutusuna çağrı kodu (ör. `THY1`) ya da tescil (ör. `TC-JPN`) yaz. |
| Sadece İstanbul'dan Frankfurt'a gidenleri görmek | *Filtreler* bölümünde **Kalkış**'a `IST`, **Varış**'a `FRA` yaz. Tek kutuyu doldurursan o havalimanından kalkan ya da oraya giden bütün uçuşları görürsün. |
| Yan menüyü gizlemek/göstermek | Haritanın sol üstündeki panel düğmesiyle (telefonda menünün üstündeki **✕**) kapat ve aç. |
| Geçmişe dönmek | Haritanın altındaki çubuğu sürükle. |

## Veri kaynakları

| Veri | Kaynak | Not |
|---|---|---|
| Uçak konumları (yakın görünüm) | [adsb.lol](https://adsb.lol) ve [adsb.fi](https://adsb.fi) | Ücretsiz, anahtarsız. İkisinin de istek sınırı sıkı; bu yüzden SkyTrack istekleri ikisine dağıtır, biri hata verirse diğerine geçer. Geniş görünümde tek kaynağa göre yaklaşık iki kat alan kapsanır. |
| Uçak konumları (geniş görünüm / yedek) | [OpenSky Network](https://opensky-network.org) | Geniş bir alanı tek istekte getirir. Giriş yapmadan kullanımda günlük sınır düşük. |
| Rota, uçak tipi, tescil, fotoğraf | [adsbdb.com](https://www.adsbdb.com) | Ücretsiz, anahtarsız. Bazı uçuşlarda eksik ya da eski olabilir. |
| Havayolu logoları | images.kiwi.com | |
| Havalimanı hava durumu, uçuş seviyelerinde rüzgar | [Open-Meteo](https://open-meteo.com) | Ücretsiz, anahtarsız. |
| METAR ve TAF, türbülans uyarıları, pilot raporları | [aviationweather.gov](https://aviationweather.gov) | Ücretsiz, anahtarsız. Türbülans için "yok", bildirilmiş ya da tahmin edilmiş bir şey olmadığı anlamına gelir; garanti değildir. |
| Yağış radarı | [RainViewer](https://www.rainviewer.com) | Ücretsiz, anahtarsız. |
| Bir uçağın bugünkü uçuşları | [adsb.lol](https://adsb.lol) günlük izleri | Ücretsiz, anahtarsız. |
| Havalimanının şehri ve ülkesi | [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) | Ücretsiz, anahtarsız. |
| Havalimanı fotoğrafı | [Wikipedia](https://en.wikipedia.org) | Havalimanının resimli bir Wikipedia sayfası varsa gösterilir. |
| Haritalar | OpenStreetMap, Esri | |

Bütün ağ istekleri [`src/data.js`](src/data.js) dosyasında.

> Havalimanı panelindeki varış ve kalkışlar uçuş tarifesinden değil, SkyTrack'in zaten gördüğü uçaklardan (havalimanına 600 km içinde, rotası o havalimanına giden ya da oradan çıkan) gelir; bu yüzden henüz kalkmamış uçuşlar görünmez.

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
src/extras.js     Acil durumlar, takip listesi, bugünkü uçuşlar, radar, gözlem defteri, dil değiştirme
src/i18n.js       İngilizce / Türkçe metinler ve dil listesi
src/langs*.js     Diğer on üç dil
src/layers.js     Gece, bulut, izler, katlanan menü
src/features.js   Görsel paylaş, günlük, irtifa profili
src/tools.js      Ayarlar, uyarılar, tepemde, tur, karşılama ekranı
src/trip.js       Rota kontrolü ve yolculuk araçları
src/airports*.js  Gömülü havalimanı verisi
site/             İnternet sitesi (GitHub Pages) ve site/app/ içindeki web demosu
docs/             README'deki ekran görüntüleri
```

[Electron](https://www.electronjs.org) ve [Leaflet](https://leafletjs.com) ile yapıldı.

## Katkı

Hata bildirimi, fikir ve pull request'ler memnuniyetle karşılanır. [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına ve [`good first issue`](https://github.com/SametDuhan/airock/labels/good%20first%20issue) listesine bak. SkyTrack işine yaradıysa bir ⭐ başkalarının da bulmasına yardım eder.

[MIT Lisansı](LICENSE) ile yayımlanmıştır.
