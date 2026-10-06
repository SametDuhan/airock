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
  const api = { R, brg, km, gc, unwrap, nearLon, regCountry };
  root.SkyGeo = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
