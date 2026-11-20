const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const M = require('../src/missions.js');

const cases = M.energyCases.map(M.energyEvent);
for (const available of cases) {
  assert.ok(available.hits.length > 2);
  assert.ok(available.length > 0);
  assert.ok(Math.abs(available.cascade + available.muon - available.configuration.energy) < 1e-9);
  assert.ok(Math.abs(available.deposited + available.remaining - available.configuration.energy) < 1e-9);
  assert.ok(available.hits.every(sensor => sensor.pulses.every(pulse => pulse.time >= 0 && pulse.charge >= M.threshold)));
  assert.equal(available.escaping, available.remaining > 1e-9);
}
assert.equal(cases[0].configuration.energy, cases[1].configuration.energy);
assert.notEqual(cases[0].totalLight, cases[1].totalLight);
assert.ok(cases[2].escaping && cases[2].remaining > 0.35);
assert.equal(M.energyEvent({energy:.34,fraction:1,angle:0,x:-130,y:110}).hits
  .some(sensor => sensor.pulses.some(pulse => pulse.kind==='track')),false);
assert.equal(M.challenge(2).hits.length, 0);
assert.equal(M.track(89,P.hiddenAngle(89),200,150).hits.length,9);
for (const seed of M.designSeeds) {
  const angle=P.hiddenAngle(seed);
  const wide=M.track(seed,angle,100,150,M.grid(400,200));
  const dense=M.track(seed,angle,100,150,M.grid(200,100));
  assert.deepEqual(wide.event,dense.event);
  assert.equal(wide.sensors.length,25);
  assert.equal(dense.sensors.length,25);
  assert.ok(wide.hits.length && dense.hits.length);
}
console.log('OK: balance y pulsos, depósito y escape, cascada pura, evento sin señal y geometría común en cinco eventos.');
