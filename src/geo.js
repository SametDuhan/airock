// Coğrafya yardımcıları (saf fonksiyonlar). Hem tarayıcıda (script etiketi) hem testlerde (require) kullanılır.
(function (root) {
  const R = Math.PI / 180;
  // a=(lat1,lon1), b=(lat2,lon2): başlangıçtan varışa yön (derece)
  const brg = (a, b, c, d) => { const y = Math.sin((d - b) * R) * Math.cos(c * R), x = Math.cos(a * R) * Math.sin(c * R) - Math.sin(a * R) * Math.cos(c * R) * Math.cos((d - b) * R); return (Math.atan2(y, x) / R + 360) % 360; };
  // iki nokta arası büyük daire mesafesi (km)
  const km = (a, b, c, d) => { const x = Math.sin((c - a) * R / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin((d - b) * R / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  // Büyük daire (dünya yüzeyindeki en kısa yol) üzerinde n parçalık noktalar
  function gc(a, b, n = 48) {
    const [φ1, λ1, φ2, λ2] = [a[0] * R, a[1] * R, b[0] * R, b[1] * R];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
    if (d < 1e-6) return [a, b];
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, A = Math.sin((1 - t) * d) / Math.sin(d), B = Math.sin(t * d) / Math.sin(d);
      const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2), y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2), z = A * Math.sin(φ1) + B * Math.sin(φ2);
      out.push([Math.atan2(z, Math.hypot(x, y)) / R, Math.atan2(y, x) / R]);
    }
    return out;
  }
  // Boylam 180°'yi geçerken çizgi haritanın öbür ucuna atlamasın diye boylamları sürekli tut
  const unwrap = pts => { for (let i = 1; i < pts.length; i++) { while (pts[i][1] - pts[i - 1][1] > 180) pts[i][1] -= 360; while (pts[i][1] - pts[i - 1][1] < -180) pts[i][1] += 360; } return pts; };
  // lon'u, merkez boylamına en yakın dünya kopyasına taşır (tarih değişim çizgisi civarında uçaklar kaybolmasın)
  const nearLon = (lon, center) => lon + 360 * Math.round((center - lon) / 360);
  const api = { R, brg, km, gc, unwrap, nearLon };
  root.SkyGeo = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
