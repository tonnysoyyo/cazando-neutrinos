// Ejecutar opcionalmente con Node.js: node pruebas/verificar_fisica.cjs
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const event = {cx:0,cy:0,angle:0};
const sensor=P.sensorSignal(100,100,event,150);
const cosine=(100-sensor.ex)/sensor.distance;
assert.ok(Math.abs(cosine-1/(P.N*P.BETA))<1e-12,'Ángulo Cherenkov');
assert.ok(Math.abs(sensor.arrival-(sensor.emissionTime+P.N*sensor.distance/P.C))<1e-10,'Tiempo de vuelo');
assert.ok(sensor.arrival>=sensor.emissionTime,'Causalidad');
const rotated=P.sensorSignal(-100,100,{cx:0,cy:0,angle:90},150);
assert.ok(Math.abs(sensor.arrival-rotated.arrival)<1e-9,'Invariancia bajo rotación');
assert.ok(P.sensorSignal(100,100,event,300).amplitude>sensor.amplitude,'Absorción');
assert.equal(P.angularError(359,1),2,'Cruce de cero');
assert.equal(P.angularError(0,180),180,'Sentido opuesto');
const config={seed:42,angle:35,spacing:100,absorption:150};
assert.deepEqual(P.simulate(config),P.simulate(config),'Reproducibilidad');
for(const angle of [0,35,90,179,270,359])for(const spacing of [50,100,200])for(const absorption of [40,150,300]){
 const result=P.simulate({...config,angle,spacing,absorption});
 assert.ok(result.hits.length>0);
 for(const hit of result.hits){assert.ok(Number.isFinite(hit.arrival));assert.ok(hit.arrival>=0);assert.ok(hit.emission>=-650&&hit.emission<=650);}
}
const opaque=P.simulate({...config,absorption:40}).hits.length;
const clear=P.simulate({...config,absorption:300}).hits.length;
assert.ok(clear>=opaque,'Mayor absorción óptica reduce detecciones');
console.log('OK: geometría, causalidad, rotación, absorción, reproducibilidad y 54 configuraciones.');
