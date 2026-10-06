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
  const gap = [[0, 1, 1, 30000], [60, 2, 2, 3000], [5000, 3, 3, 4000], [5060, 4, 4, 20000]];
  assert.deepEqual(D.legOf(gap), [[3, 3], [4, 4]]);
  const ocean = [[0, 1, 1, 36000], [60, 2, 2, 36000], [5000, 3, 3, 36000], [5060, 4, 4, 36000]];
  assert.equal(D.legOf(ocean).length, 4); // a coverage hole at cruise altitude is not a new flight
  const flag = [[0, 1, 1, 30000, 0, 0, 0], [60, 2, 2, 30000, 0, 0, 2], [120, 3, 3, 30000, 0, 0, 0]];
  assert.deepEqual(D.legOf(flag), [[2, 2], [3, 3]]);
});

test('splitLegs: one leg per airborne stretch, from the last ground point to the next one', () => {
  const tr = [[0, 40, 28, 'ground'], [60, 40.1, 28.1, 5000], [900, 41, 30, 30000], [1800, 41.5, 31.5, 8000], [1900, 41.6, 31.6, 'ground'],
    [5000, 41.6, 31.6, 'ground'], [5100, 41.7, 31.7, 4000], [6000, 42.5, 33, 30000], [7000, 43, 35, 30000]];
  const l = D.splitLegs(tr, 1000);
  assert.equal(l.length, 2); assert.equal(l[0].open, false); assert.equal(l[1].open, true);
  assert.deepEqual(l[0].from, [40, 28]); assert.equal(l[0].t0, 1000); assert.equal(l[0].maxAlt, 30000);
  assert.deepEqual(l[1].from, [41.6, 31.6]); assert.deepEqual(l[1].to, [43, 35]);
});
test('splitLegs: ignores tiny hops and a long gap splits a leg', () => {
  assert.deepEqual(D.splitLegs([[0, 1, 1, 'ground'], [10, 1.001, 1.001, 500], [20, 1.002, 1.002, 500], [30, 1.003, 1.003, 'ground']]), []);
  const gap = [[0, 40, 28, 20000], [60, 41, 29, 20000], [120, 42, 30, 6000], [5000, 50, 40, 5000], [5060, 51, 41, 20000], [5120, 52, 42, 20000]];
  assert.equal(D.splitLegs(gap).length, 2);
  assert.equal(D.splitLegs(gap.map(p => [p[0], p[1], p[2], 30000])).length, 1);
});
test('watch: invalid lists are rejected before any network call', async () => {
  assert.equal((await D.watch([])).ok, false); assert.equal((await D.watch(['zz'])).ok, false);
});

test('turbAssess: advisory polygon / pilot report ahead -> level', () => {
  const pts = [[0, 0], [0, 1], [0, 2], [0, 3]], box = (a, b) => [[-1, a], [1, a], [1, b], [-1, b]];
  assert.equal(D.turbAssess(pts, 35000, [], []).level, 0);
  const mod = D.turbAssess(pts, 35000, [{ sev: 2, base: 20000, top: 45000, poly: box(1.5, 2.5) }], []);
  assert.equal(mod.level, 2); assert.ok(mod.km > 100 && mod.km < 240, mod.km);
  assert.equal(D.turbAssess(pts, 35000, [{ sev: 3, base: 0, top: 45000, poly: box(1.5, 2.5) }], []).level, 3);
  assert.equal(D.turbAssess(pts, 10000, [{ sev: 3, base: 20000, top: 45000, poly: box(1.5, 2.5) }], []).level, 0, 'other altitude');
  assert.equal(D.turbAssess(pts, 35000, [], [{ lat: 0.2, lon: 2, ft: 36000, sev: 2 }]).level, 2);
  assert.equal(D.turbAssess(pts, 35000, [], [{ lat: 0.2, lon: 2, ft: 36000, sev: 1 }]).level, 0, 'light is ignored');
});
test('ahead: heading projection and route', () => {
  const G = require('../src/geo.js'), p = G.ahead(0, 0, 90, null, 400, 100);
  assert.equal(p.length, 5); assert.ok(Math.abs(p[4][0]) < 0.01 && Math.abs(p[4][1] - 3.6) < 0.05, p[4]);
  const r = G.ahead(41, 29, 0, [50, 8.5], 500); assert.ok(r.length > 5 && G.km(41, 29, r.at(-1)[0], r.at(-1)[1]) <= 520);
});
