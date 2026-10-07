const test = require('node:test'), assert = require('node:assert');
const D = require('../src/data.js');
globalThis.SkyData = D; // webdemo.js patches the shared data object (in the browser: window.SkyData)
const { ADV } = require('../src/webdemo.js');

test('web demo: turbulence over a demo area is judged by the real assessment code', async () => {
  const inside = [[40.2, 31.5], [39.8, 33], [39.4, 34.5]]; // Central Anatolia advisory (sev 2, FL150-FL420)
  const r = await D.turb(inside, 34000);
  assert.equal(r.ok, true); assert.equal(r.level, 2); assert.equal(r.km, 0);
});

test('web demo: clear route, and an altitude outside the advisory, give level 0', async () => {
  assert.equal((await D.turb([[50, -20], [50, -18]], 34000)).level, 0);
  assert.equal((await D.turb([[40.2, 31.5], [39.8, 33]], 5000)).level, 0);
});

test('web demo: map advisories are returned as copies with a level label', async () => {
  const m = await D.turbMap(); assert.equal(m.ok, true); assert.equal(m.adv.length, ADV.length);
  assert.ok(m.adv.every(a => a.sev >= 2 && a.poly.length > 2 && /^FL/.test(a.lv)));
  m.adv[0].poly[0][0] = 99; assert.notEqual(ADV[0].poly[0][0], 99);
});
