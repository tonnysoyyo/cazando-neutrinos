/* Cazando neutrinos en hielo · Geometría y tiempos de la luz directa. */
/* Modelo educativo 2D, SI: metros y nanosegundos. Sin dependencias. */
(function (root) {
  'use strict';
  const C = 0.299792458;
  const N = 1.33;
  const BETA = 0.999999;
  const TRACK = 1300;
  const THRESHOLD = 0.055;
  const radians = degrees => degrees * Math.PI / 180;
  function random(seed) {
    let state = seed >>> 0;
    return function () {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  function geometry(seed, angle) {
    const rng = random(seed);
    return {angle, cx: (rng() - 0.5) * 140, cy: (rng() - 0.5) * 140};
  }
  function hiddenAngle(seed) { return Math.floor(random(seed + 983)() * 360); }
  function sensorSignal(x, y, event, absorption) {
    const ux = Math.cos(radians(event.angle));
    const uy = Math.sin(radians(event.angle));
    const dx = x - event.cx;
    const dy = y - event.cy;
    const longitudinal = dx * ux + dy * uy;
    const transverse = Math.abs(dx * uy - dy * ux);
    const coneFactor = Math.sqrt((N * BETA) ** 2 - 1);
    const emission = longitudinal - transverse / coneFactor;
    const distance = transverse * N * BETA / coneFactor;
    const valid = emission >= -TRACK / 2 && emission <= TRACK / 2;
    const emissionTime = (emission + TRACK / 2) / (BETA * C);
    const arrival = emissionTime + N * distance / C;
    // Respuesta fenomenológica relativa. No corresponde a fotoelectrones ni a energía.
    const amplitude = Math.exp(-distance / absorption) / (1 + (distance / 100) ** 2);
    return {x, y, emission, distance, emissionTime, arrival, amplitude,
      hit: valid && amplitude >= THRESHOLD,
      ex: event.cx + emission * ux, ey: event.cy + emission * uy};
  }
  function simulate({seed, angle, spacing, absorption}) {
    const event = geometry(seed, angle);
    const sensors = [];
    const halfCount = Math.floor(400 / spacing);
    for (let row = -halfCount; row <= halfCount; row++) {
      for (let column = -halfCount; column <= halfCount; column++) {
        sensors.push(sensorSignal(column * spacing, row * spacing, event, absorption));
      }
    }
    const hits = sensors.filter(sensor => sensor.hit).sort((a, b) => a.arrival - b.arrival);
    const endTime = Math.max(TRACK / (BETA * C), ...hits.map(sensor => sensor.arrival)) + 300;
    return {event, sensors, hits, endTime};
  }
  function angularError(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }
  const api = {C, N, BETA, TRACK, THRESHOLD, radians, geometry, hiddenAngle, sensorSignal, simulate, angularError};
  root.NeutrinoPhysics = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
