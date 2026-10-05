const test = require('node:test'), assert = require('node:assert');
const D = require('../src/data.js');

test('cover: close view is a single circle, not partial', () => {
  const c = D.cover({ s: 40, n: 42, w: 28, e: 30 }); assert.equal(c.circles.length, 1); assert.equal(c.partial, false);
});
test('cover: wide view is partial and returns a covered rectangle', () => {
  const c = D.cover({ s: 30, n: 60, w: -10, e: 40 });
  assert.equal(c.partial, true); assert.equal(c.circles.length, 2);
  assert.ok(c.covered.s < c.covered.n && c.covered.w < c.covered.e);
});
test('bounds: converts to numbers, clamps, rejects bad input', () => {
  assert.deepEqual(D.bounds({ s: '1', n: '2', w: -500, e: 500 }), { s: 1, n: 2, w: -180, e: 180 });
  assert.throws(() => D.bounds({ s: 'x', n: 2, w: 0, e: 1 }));
  assert.throws(() => D.bounds({ s: 5, n: 2, w: 0, e: 1 }));
  assert.throws(() => D.bounds(null));
});
test('route/aircraft: invalid input is rejected before any network call', async () => {
  assert.equal((await D.route('../x')).ok, false);
  assert.equal((await D.aircraft('zz')).ok, false);
});
test('flights: invalid bounds return an error', async () => {
  assert.equal((await D.flights({ s: 'a' })).ok, false);
});

test('legOf: keeps only the current flight of the day trace', () => {
  const t = [[0, 1, 1, 'ground'], [1, 2, 2, 5000], [2, 3, 3, 'ground'], [3, 4, 4, 'ground'], [4, 5, 5, 3000], [5, 6, 6, 30000]];
  assert.deepEqual(D.legOf(t), [[4, 4], [5, 5], [6, 6]]);
  assert.deepEqual(D.legOf([]), []);
});

test('legOf: a long gap or a "new leg" flag also starts a new flight', () => {
  const gap = [[0, 1, 1, 30000], [60, 2, 2, 30000], [5000, 3, 3, 20000], [5060, 4, 4, 20000]];
  assert.deepEqual(D.legOf(gap), [[3, 3], [4, 4]]);
  const flag = [[0, 1, 1, 30000, 0, 0, 0], [60, 2, 2, 30000, 0, 0, 2], [120, 3, 3, 30000, 0, 0, 0]];
  assert.deepEqual(D.legOf(flag), [[2, 2], [3, 3]]);
});
