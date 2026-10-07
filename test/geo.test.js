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

test('scenePose: from the airport on the ground to the open sky at 5000 ft, and back', () => {
  const { scenePose: P } = require('../src/geo.js');
  const g = P(0, 0, 0, true); assert.deepEqual([g.show, g.t, g.rise, g.pitch, g.gear], [true, 0, 0, 0, true]);
  assert.equal(P(0, 0, 130, true).pitch, 5); // rolling fast: nose up for rotation
  const lo = P(200, 2500, 150, false); assert.ok(lo.t > .15 && lo.t < .25 && lo.pitch === 12 && lo.gear); // just lifted off
  assert.equal(P(400, 2500, 160, false).gear, false); // gear up after 250 ft
  const mid = P(1250, 1800, 200, false); assert.ok(Math.abs(mid.t - .5) < .01 && mid.rise > 6 && mid.rise < 8);
  assert.equal(P(6000, 0, 250, false).show, false); // cruise-ish: the dashed line again
  assert.equal(P(5000, 0, 250, false).t, 1);
  const app = P(2500, -700, 160, false); assert.ok(app.gear && app.pitch < 0 && app.pitch >= -6); // on approach: gear down, nose slightly down
  assert.equal(P(2500, 0, 160, false).gear, false);
  assert.equal(P(-50, 0, 0, false).t, 0); // bad input stays inside the range
});
