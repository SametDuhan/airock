const test = require('node:test'), assert = require('node:assert');
const { km, brg, gc, unwrap, nearLon } = require('../src/geo.js');

test('km: İstanbul–Frankfurt ~1860 km', () => {
  const d = km(41.26, 28.74, 50.03, 8.57); assert.ok(d > 1800 && d < 1900, d);
});
test('brg: kuzeye ve doğuya', () => {
  assert.ok(Math.abs(brg(0, 0, 10, 0) - 0) < 1e-6);
  assert.ok(Math.abs(brg(0, 0, 0, 10) - 90) < 1e-6);
});
test('gc: uçlar korunur, aynı nokta iki noktaya iner', () => {
  const p = gc([41, 29], [50, 8], 10); assert.equal(p.length, 11);
  assert.ok(Math.abs(p[0][0] - 41) < 1e-9 && Math.abs(p[10][1] - 8) < 1e-9);
  assert.equal(gc([1, 1], [1, 1]).length, 2);
});
test('unwrap: 180° geçişinde boylam sürekli kalır', () => {
  const u = unwrap([[0, 170], [0, -170]]); assert.equal(u[1][1], 190);
});
test('nearLon: merkeze en yakın dünya kopyası', () => {
  assert.equal(nearLon(-170, 190), 190); assert.equal(nearLon(170, -190), -190); assert.equal(nearLon(10, 20), 10);
});
