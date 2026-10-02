// Leaflet'i önce yerel node_modules'tan, bulunamazsa CDN'den yükler; sonra uygulamayı başlatır.
const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
(async () => {
  try { await load('../node_modules/leaflet/dist/leaflet.js'); }
  catch { try { await load('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'); }
  catch { document.getElementById('map').innerHTML = '<p style="padding:30px">Harita kütüphanesi yüklenemedi. "npm install" çalıştırın veya internet bağlantınızı kontrol edin.</p>'; return; } }
  await load('data.js');
  await load('renderer.js');
})();
