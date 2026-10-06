const test = require('node:test'), assert = require('node:assert');
const F = require('../src/fuel.js');

test('toGo: fuel and CO2 for the rest of the flight', () => {
  const r = F.toGo('A320', 1852, 450); // 1000 nm at 450 kt = 2.22 h at 2500 kg/h
  assert.ok(Math.abs(r.kg - 2500 * 1000 / 450) < 1, r.kg); assert.ok(Math.abs(r.co2 - r.kg * 3.16) < 1e-6);
  assert.equal(F.toGo('XXXX', 500, 450), null); assert.equal(F.toGo('A320', 500, 30), null); assert.equal(F.toGo('A320', 0, 450), null);
});
test('headwind: sign and tas fallback', () => {
  assert.ok(Math.abs(F.headwind(40, 90, 90) - 40) < 1e-9, 'wind from the track direction = headwind');
  assert.ok(Math.abs(F.headwind(40, 270, 90) + 40) < 1e-9, 'wind from behind = tailwind');
  assert.ok(Math.abs(F.headwind(40, 0, 90)) < 1e-9, 'pure crosswind');
  assert.equal(F.headwindFromTas(450, 400, 90, 90), 50);
});
