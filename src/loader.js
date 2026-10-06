// Loads Leaflet from local node_modules first, falling back to the CDN; then starts the app.
const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
(async () => {
  try { await load('../node_modules/leaflet/dist/leaflet.js'); }
  catch { try { // no local copy: load both CSS and JS from the CDN
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'; document.head.appendChild(l);
      await load('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'); }
  catch { document.getElementById('map').innerHTML = '<p style="padding:30px">Could not load the map library. Run "npm install" or check your internet connection.</p>'; return; } }
  await load('geo.js');
  await load('fuel.js');
  await load('data.js');
  await load('i18n.js');
  await load('renderer.js');
  await load('extras.js');
  await load('layers.js');
})();
