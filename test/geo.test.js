const test = require('node:test'), assert = require('node:assert');
const { km, brg, gc, unwrap, nearLon } = require('../src/geo.js');

test('km: Istanbul–Frankfurt ~1860 km', () => {
  const d = km(41.26, 28.74, 50.03, 8.57); assert.ok(d > 1800 && d < 1900, d);
});
test('brg: north and east', () => {
  assert.ok(Math.abs(brg(0, 0, 10, 0) - 0) < 1e-6);
  assert.ok(Math.abs(brg(0, 0, 0, 10) - 90) < 1e-6);
});
test('gc: endpoints are kept, identical points collapse to two points', () => {
  const p = gc([41, 29], [50, 8], 10); assert.equal(p.length, 11);
  assert.ok(Math.abs(p[0][0] - 41) < 1e-9 && Math.abs(p[10][1] - 8) < 1e-9);
  assert.equal(gc([1, 1], [1, 1]).length, 2);
});
test('unwrap: longitude stays continuous across 180°', () => {
  const u = unwrap([[0, 170], [0, -170]]); assert.equal(u[1][1], 190);
});
test('nearLon: world copy nearest the center', () => {
  assert.equal(nearLon(-170, 190), 190); assert.equal(nearLon(170, -190), -190); assert.equal(nearLon(10, 20), 10);
});

test('regCountry: registration prefix -> country code', () => {
  const { regCountry } = require('../src/geo.js');
  assert.equal(regCountry('N123AB'), 'US'); assert.equal(regCountry('TC-JJA'), 'TR'); assert.equal(regCountry('JA8089'), 'JP');
  assert.equal(regCountry('B-HNA'), 'HK'); assert.equal(regCountry('B-1234'), 'CN'); assert.equal(regCountry(''), '');
});

test('sun / night: solstice subsolar point and terminator', () => {
  const { sun, night } = require('../src/geo.js'), s = sun(new Date('2026-06-21T12:00:00Z'));
  assert.ok(Math.abs(s.lat - 23.4) < 0.3 && Math.abs(s.lon) < 5, JSON.stringify(s));
  const n = night(new Date('2026-06-21T12:00:00Z')); assert.ok(n.length > 300 && n.at(-1)[0] === -90, 'night over the south pole in northern summer');
});

test('sunSide: sun to the right when flying north at noon-west of the sun, none at night', () => {
  const G = require('../src/geo.js'), date = new Date(Date.UTC(2026, 5, 21, 12, 0, 0)); // June solstice, noon UTC
  const s = G.sun(date);
  // 20° of longitude west of the subsolar point, same latitude, flying north: the sun is to the east = right side
  const r = G.sunSide(s.lat, s.lon - 20, 0, date); assert.equal(r.side, 'right'); assert.ok(r.elev > 40);
  assert.equal(G.sunSide(s.lat, s.lon + 20, 0, date).side, 'left');
  assert.equal(G.sunSide(s.lat, s.lon - 20, 90, date).side, null); // flying straight at the sun
  assert.equal(G.sunSide(-s.lat, s.lon + 180, 0, date).side, null); // night side
});

test('scenePose: from the airport on the ground to the open sky, and back', () => {
  const { scenePose: P } = require('../src/geo.js');
  const g = P(0, 0, 0, true); assert.deepEqual([g.show, g.g, g.cl, g.rise, g.pitch, g.gear], [true, 0, 0, 0, 0, true]);
  assert.equal(P(0, 0, 130, true).pitch, 10); // rolling fast: the nose comes up for rotation
  assert.equal(P(0, 0, 130, true, false).pitch, 0); // ...but not while rolling out after a landing
  const lo = P(120, 2800, 150, false); assert.ok(lo.pitch >= 8 && lo.pitch <= 14 && lo.gear && lo.cl === .1); // just lifted off: nose up
  assert.ok(P(120, 0, 150, false).pitch >= 8); // just lifted off, the vertical rate not there yet: still nose up
  assert.equal(P(400, 2500, 160, false).gear, false); // gear up after 250 ft
  assert.equal(P(700, 2000, 200, false).g, 1); // at 700 ft nothing of the airport is left
  assert.ok(P(350, 2000, 190, false).g > .4 && P(350, 2000, 190, false).g < .6);
  assert.equal(P(1500, 2000, 220, false).g, 1); assert.equal(P(1500, 2000, 220, false).cl, 1); // 1500 ft: only sky and clouds
  assert.equal(P(6000, 0, 250, false).show, true); // the scene works at every altitude
  const app = P(2500, -700, 160, false); assert.ok(app.gear && app.pitch <= -4 && app.pitch >= -8); // descending: nose down, gear down
  assert.equal(P(2500, 0, 160, false).pitch, 0); assert.equal(P(2500, 0, 160, false).gear, false); // level: flat, gear up
  assert.equal(P(-50, 0, 0, false).g, 0); // bad input stays inside the range
});

test('sunElevation / solarHour: under the sun, opposite it, and the hour of the day', () => {
  const G = require('../src/geo.js'), date = new Date(Date.UTC(2026, 5, 21, 12, 0, 0)), s = G.sun(date);
  assert.ok(G.sunElevation(s.lat, s.lon, date) > 89.9); assert.ok(G.sunElevation(-s.lat, s.lon + 180, date) < -89.9);
  assert.ok(Math.abs(G.solarHour(s.lon, date) - 12) < .01);
  assert.ok(Math.abs(G.solarHour(s.lon + 45, date) - 15) < .01); // 45 degrees east of the sun: three hours later in the day
  assert.ok(Math.abs(G.solarHour(s.lon - 90, date) - 6) < .01); // 90 degrees west: morning
  assert.ok(G.sunElevation(41, 29, new Date(Date.UTC(2026, 5, 21, 2, 0, 0))) < 0); // Istanbul at 05:00 local mean time in June: before sunrise there... (sun below the horizon)
});

test('isNight: exactly the region the Night layer of the map shades (the polygon of night())', () => {
  const G = require('../src/geo.js');
  const inPoly = (lat, lon, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [yi, xi] = poly[i], [yj, xj] = poly[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c; } return c; };
  let n = 0;
  for (const date of [new Date(Date.UTC(2026, 5, 21, 12)), new Date(Date.UTC(2026, 11, 21, 3)), new Date(Date.UTC(2026, 2, 20, 18, 30)), new Date(Date.UTC(2026, 9, 7, 15, 20))]) {
    const poly = G.night(date);
    for (let lat = -80; lat <= 80; lat += 10) for (let lon = -175; lon <= 175; lon += 10) {
      if (Math.abs(G.sunElevation(lat, lon, date)) < 1.5) continue; // right on the line: polygon steps of 3 degrees
      assert.equal(G.isNight(lat, lon, date), inPoly(lat, lon, poly), `${lat},${lon} at ${date.toISOString()}`); n++;
    }
  }
  assert.ok(n > 1000);
});
