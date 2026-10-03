const test = require('node:test'), assert = require('node:assert');
const D = require('../src/data.js');

test('cover: yakın görünüm tek daire, kısmi değil', () => {
  const c = D.cover({ s: 40, n: 42, w: 28, e: 30 }); assert.equal(c.circles.length, 1); assert.equal(c.partial, false);
});
test('cover: geniş görünüm kısmi ve covered dikdörtgeni verir', () => {
  const c = D.cover({ s: 30, n: 60, w: -10, e: 40 });
  assert.equal(c.partial, true); assert.equal(c.circles.length, 2);
  assert.ok(c.covered.s < c.covered.n && c.covered.w < c.covered.e);
});
test('bounds: sayıya çevirir, kırpar, bozuk girdiyi reddeder', () => {
  assert.deepEqual(D.bounds({ s: '1', n: '2', w: -500, e: 500 }), { s: 1, n: 2, w: -180, e: 180 });
  assert.throws(() => D.bounds({ s: 'x', n: 2, w: 0, e: 1 }));
  assert.throws(() => D.bounds({ s: 5, n: 2, w: 0, e: 1 }));
  assert.throws(() => D.bounds(null));
});
test('route/aircraft: geçersiz girdi ağa gitmeden reddedilir', async () => {
  assert.equal((await D.route('../x')).ok, false);
  assert.equal((await D.aircraft('zz')).ok, false);
});
test('flights: geçersiz sınırda hata döner', async () => {
  assert.equal((await D.flights({ s: 'a' })).ok, false);
});
