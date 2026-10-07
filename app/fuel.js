// Rough fuel burn and wind helpers for the aircraft card (estimates, not flight-planning data). Used in the browser (script tag) and in tests (require).
(function (root) {
  // Typical cruise fuel burn, kg per hour, by ICAO type code
  const BURN = {};
  ('A318:2300 A319:2400 A320:2500 A20N:2150 A321:2900 A21N:2600 A332:5600 A333:5700 A338:5300 A339:5400 A343:6300 A346:7500 A359:5900 A35K:6800 A388:11500 A306:5600 A310:4800 A124:11000 A225:12000 '
    + 'B712:2000 B731:2600 B732:2900 B733:2500 B734:2600 B735:2300 B736:2300 B737:2400 B738:2500 B739:2600 B37M:2300 B38M:2300 B39M:2400 B3XM:2500 B744:10500 B748:10800 B752:3800 B753:4200 B762:5000 B763:5300 B764:5600 '
    + 'B772:7200 B773:7800 B77L:7500 B77W:7500 B788:5300 B789:5500 B78X:5900 MD11:7500 MD82:2800 MD83:2800 MD88:2800 MD90:2600 DC10:7600 L101:7000 '
    + 'E135:1100 E145:1200 E170:1700 E75L:1800 E75S:1800 E190:2000 E195:2100 E290:1800 E295:2000 BCS1:1700 BCS3:1900 CRJ2:1200 CRJ7:1500 CRJ9:1700 CRJX:1800 SU95:1800 C919:2400 '
    + 'AT43:600 AT45:650 AT72:700 AT75:720 AT76:720 DH8A:450 DH8B:500 DH8C:600 DH8D:900 SF34:600 JS41:550 B190:400 F50:650 F100:2000 F70:1700 '
    + 'C25A:550 C56X:700 C680:800 C700:1100 CL35:850 CL60:1500 GLEX:1700 GL5T:1800 G650:1900 FA7X:1400 F900:1000 F2TH:1000 E55P:650 LJ45:700 GLF4:1500 GLF5:1600 GLF6:1800 '
    + 'C172:35 C182:50 C208:220 PC12:230 BE20:300 BE9L:200 PA28:30 SR22:55 TBM9:200').split(' ').forEach(x => { const [k, v] = x.split(':'); BURN[k] = +v; });
  const CO2_PER_KG = 3.16; // kg CO2 per kg of jet fuel burned
  const rate = icao => BURN[String(icao || '').toUpperCase()] || 0;
  // Estimated fuel (kg) and CO2 (kg) for the rest of the flight; null if the type is unknown or the speed is too low to extrapolate
  const toGo = (icao, kmLeft, gsKt) => { const r = rate(icao); if (!r || !(kmLeft > 0) || !(gsKt >= 100)) return null;
    const kg = r * (kmLeft / 1.852 / gsKt); return { kg, co2: kg * CO2_PER_KG }; };
  // Wind relative to the track. wd = direction the wind blows FROM, ws in knots. Positive = headwind, negative = tailwind.
  const R = Math.PI / 180;
  const headwind = (ws, wd, trk) => ws * Math.cos((wd - trk) * R);
  // Without a reported wind, true airspeed minus ground speed gives the along-track component (ignores drift)
  const headwindFromTas = (tas, gs, hdg, trk) => tas * Math.cos((hdg - trk) * R) - gs;
  const api = { rate, toGo, headwind, headwindFromTas, CO2_PER_KG };
  root.SkyFuel = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
