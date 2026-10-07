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
  const ocean = [[0, 48, 16, 36000], [60, 47.9, 16.1, 36000], [5000, 30, 40, 36000], [5060, 29.9, 40.1, 36000]]; // ~2,800 km in 1.4 h
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

test('cityName: only the city of an airport', () => {
  assert.equal(D.cityName('Arnavutköy, Istanbul'), 'Istanbul'); assert.equal(D.cityName('Shanghai (Pudong)'), 'Shanghai');
  assert.equal(D.cityName('Pendik, Istanbul'), 'Istanbul'); assert.equal(D.cityName('London'), 'London'); assert.equal(D.cityName('Washington, D.C.'), 'Washington'); assert.equal(D.cityName(''), '');
});

test('legOf: a gap at altitude that the aircraft could not have flown through is a new flight', () => {
  // landed, turned around for hours, first seen again at altitude near the same place: ends are ~30 km apart after a 2.5 h gap at ~450 kt
  const t = [[0, 48, 16, 30000, 450], [60, 47, 17, 29000, 450], [9060, 47.2, 17.2, 20000, 400], [9120, 47.3, 17.4, 21000, 400]];
  assert.deepEqual(D.legOf(t), [[47.2, 17.2], [47.3, 17.4]]);
  const cruise = [[0, 48, 16, 36000, 450], [60, 47.9, 16.1, 36000, 450], [4000, 30, 40, 36000, 450], [4060, 29.9, 40.1, 36000, 450]]; // a real coverage hole at cruise (~3000 km in 1.1 h)
  assert.equal(D.legOf(cruise).length, 4);
});

test('cover: every point of the area is inside some circle, and no circle is bigger than the API allows', () => {
  const geo = require('../src/geo.js');
  for (const b of [{ s: 21, n: 29.5, w: 49, e: 63 }, { s: 44, n: 54, w: 0, e: 18 }, { s: 35, n: 43, w: 24, e: 40 }, { s: -5, n: 8, w: 100, e: 112 }]) {
    const c = D.cover(b, 99); assert.equal(c.partial, false);
    assert.ok(c.circles.every(x => x.r <= 250), 'radius over 250 nm');
    for (let la = b.s; la <= b.n; la += 0.5) for (let lo = b.w; lo <= b.e; lo += 0.5)
      assert.ok(c.circles.some(x => geo.km(la, lo, x.lat, x.lon) <= x.r * 1.852), `uncovered ${la},${lo} in ${JSON.stringify(b)}`);
  }
});

test('cover: a Dubai-sized view needs far fewer circles than a fixed 600 km grid did', () => {
  assert.ok(D.cover({ s: 21, n: 29.5, w: 49, e: 63 }, 99).circles.length <= 4);
});

test('cover: a continent-sized view with spread = true reaches all of it early; nearest-first stays around the center', () => {
  const geo = require('../src/geo.js'), b = { s: 0, n: 65, w: -25, e: 85 }; // Europe + Africa + Asia, like the zoomed-out screenshot
  const near = D.cover(b, 200).circles, spread = D.cover(b, 200, -1, true).circles;
  assert.equal(spread.length, near.length); assert.ok(near.length > 40);
  assert.deepEqual(spread[0], near[0]); // the first one is the center in both
  const span = list => { const k = list.slice(0, 12); return Math.max(...k.map(c => Math.max(...k.map(d => geo.km(c.lat, c.lon, d.lat, d.lon))))); };
  assert.ok(span(spread) > span(near) * 1.3, `spread ${span(spread)} vs nearest ${span(near)}`);
  const a = D.cover({ s: 40, n: 42, w: 28, e: 30 }, 200, -1, true).circles, b2 = D.cover({ s: 40, n: 42, w: 28, e: 30 }, 200).circles;
  assert.deepEqual(a, b2); // a small view is unchanged
});
