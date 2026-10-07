// Geography helpers (pure functions). Used both in the browser (script tag) and in tests (require).
(function (root) {
  const R = Math.PI / 180;
  // a=(lat1,lon1), b=(lat2,lon2): bearing from start to destination (degrees)
  const brg = (a, b, c, d) => { const y = Math.sin((d - b) * R) * Math.cos(c * R), x = Math.cos(a * R) * Math.sin(c * R) - Math.sin(a * R) * Math.cos(c * R) * Math.cos((d - b) * R); return (Math.atan2(y, x) / R + 360) % 360; };
  // great-circle distance between two points (km)
  const km = (a, b, c, d) => { const x = Math.sin((c - a) * R / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin((d - b) * R / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  // Points along a great circle (the shortest path over the globe), split into n segments
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
  // Keep longitudes continuous so a line crossing 180° doesn't jump to the other side of the map
  const unwrap = pts => { for (let i = 1; i < pts.length; i++) { while (pts[i][1] - pts[i - 1][1] > 180) pts[i][1] -= 360; while (pts[i][1] - pts[i - 1][1] < -180) pts[i][1] += 360; } return pts; };
  // Moves lon to the world copy nearest the center longitude (so aircraft don't vanish near the date line)
  const nearLon = (lon, center) => lon + 360 * Math.round((center - lon) / 360);
  // Aircraft registration prefix -> ISO 3166-1 alpha-2 country code (longest prefix wins; "N" and "JA"-style marks have no hyphen)
  const REG = {}; // filled below from "ISO:prefix prefix ..." groups
  ('US:N|CA:C-,CF-,CG-|MX:XA-,XB-,XC-|GB:G-|DE:D-|FR:F-|IT:I-|ES:EC-|PT:CS-|NL:PH-|BE:OO-|LU:LX-|CH:HB-|AT:OE-|IE:EI-,EJ-|IS:TF-|NO:LN-|SE:SE-|DK:OY-|FI:OH-|PL:SP-|CZ:OK-|SK:OM-|HU:HA-|RO:YR-|BG:LZ-|GR:SX-|TR:TC-|CY:5B-|MT:9H-|HR:9A-|SI:S5-|RS:YU-|BA:E7-|ME:4O-|MK:Z3-|AL:ZA-|UA:UR-|BY:EW-|RU:RA-,RF-|EE:ES-|LV:YL-|LT:LY-|MD:ER-|GE:4L-|AM:EK-|AZ:4K-|KZ:UP-|UZ:UK-|IL:4X-|LB:OD-|JO:JY-|SA:HZ-|AE:A6-|QA:A7-|KW:9K-|BH:A9C-|OM:A4O-|IR:EP-|IQ:YI-|EG:SU-|LY:5A-|TN:TS-|DZ:7T-|MA:CN-|ET:ET-|KE:5Y-|TZ:5H-|UG:5X-|NG:5N-|GH:9G-|SN:6V-|ZA:ZS-,ZT-,ZU-|AO:D2-|MZ:C9-|ZW:Z-|MU:3B-|IN:VT-|PK:AP-|BD:S2-|LK:4R-|NP:9N-|CN:B-|HK:B-H,B-K,B-L|MO:B-M|JP:JA|KR:HL|KP:P-|MN:JU-|TH:HS-|VN:VN-|MY:9M-|SG:9V-|ID:PK-|PH:RP-|AU:VH-|NZ:ZK-|FJ:DQ-|BR:PP-,PR-,PS-,PT-,PU-|AR:LV-,LQ-|CL:CC-|PE:OB-|CO:HK-|VE:YV-|EC:HC-|BO:CP-|UY:CX-|PY:ZP-|PA:HP-|CR:TI-|CU:CU-|DO:HI-|JM:6Y-|BS:C6-|BB:8P-|TT:9Y-|LK:4R-|KG:EX-|TJ:EY-|TM:EZ-|AF:YA-|MM:XY-,XZ-|KH:XU-|LA:RDPL-').split('|').forEach(g => { const [c, ps] = g.split(':'); ps.split(',').forEach(p => { REG[p] = c; }); });
  const regCountry = reg => { const r = String(reg || '').toUpperCase().replace(/\s/g, ''); if (!r) return '';
    if (/^B-\d{5}$/.test(r)) return 'TW'; if (/^N\d/.test(r)) return 'US'; if (/^JA\d/.test(r)) return 'JP'; if (/^HL\d/.test(r)) return 'KR';
    for (let n = Math.min(5, r.length); n > 0; n--) { const c = REG[r.slice(0, n)]; if (c) return c; } return ''; };
  // Points ahead of an aircraft (up to maxKm): along the great circle to its destination, or straight along its heading when the route is unknown
  function ahead(lat, lon, hdg, dest, maxKm = 1500, stepKm = 40) {
    const out = [[lat, lon]];
    if (dest) { const d = km(lat, lon, dest[0], dest[1]); if (d < 1) return out; const g = gc([lat, lon], dest, Math.max(1, Math.ceil(d / stepKm)));
      let acc = 0; for (let i = 1; i < g.length; i++) { acc += km(g[i - 1][0], g[i - 1][1], g[i][0], g[i][1]); if (acc > maxKm) break; out.push(g[i]); } return out; }
    const φ = lat * R, λ = lon * R, θ = hdg * R;
    for (let d = stepKm; d <= maxKm; d += stepKm) { const δ = d / 6371, φ2 = Math.asin(Math.sin(φ) * Math.cos(δ) + Math.cos(φ) * Math.sin(δ) * Math.cos(θ));
      out.push([φ2 / R, (λ + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ), Math.cos(δ) - Math.sin(φ) * Math.sin(φ2))) / R]); }
    return out;
  }
  // Subsolar point (lat, lon in degrees) for a date: low-precision solar position, good to well under a degree
  function sun(date = new Date()) {
    const n = date.getTime() / 86400000 - 10957.5, L = 280.46 + 0.9856474 * n, g = (357.528 + 0.9856003 * n) * R, lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * R, eps = (23.439 - 4e-7 * n) * R;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam)), ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / R, gmst = (18.697374558 + 24.06570982441908 * n) * 15;
    return { lat: dec / R, lon: ((ra - gmst) % 360 + 540) % 360 - 180 };
  }
  // Night side of the Earth as a polygon covering three world copies (-540..540 degrees), so it also shows when the map is panned around
  function night(date = new Date()) {
    const s = sun(date), dec = Math.abs(s.lat) < .01 ? .01 : s.lat, pts = [];
    for (let lon = -540; lon <= 540; lon += 3) pts.push([Math.atan(-Math.cos((lon - s.lon) * R) / Math.tan(dec * R)) / R, lon]);
    const pole = dec > 0 ? -90 : 90; pts.push([pole, 540], [pole, -540]); return pts;
  }
  // Where the sun is relative to an aircraft: the sun's azimuth is the bearing to the subsolar point, its elevation is 90° minus the angular distance to it.
  // side: 'left' / 'right' of the nose, or null when the sun is below 3° or almost straight ahead / behind (within 25°)
  function sunSide(lat, lon, hdg, date = new Date()) {
    const s = sun(date), d = km(lat, lon, s.lat, s.lon) / 6371 / R, elev = 90 - d;
    if (elev < 3) return { elev, side: null };
    const rel = ((brg(lat, lon, s.lat, s.lon) - hdg + 540) % 360) - 180;
    return { elev, side: Math.abs(rel) < 25 || Math.abs(rel) > 155 ? null : rel > 0 ? 'right' : 'left' };
  }
  const api = { R, brg, km, gc, unwrap, nearLon, regCountry, ahead, sun, night, sunSide };
  root.SkyGeo = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
