/* Cazando neutrinos en hielo · Escenarios didácticos y balance energético. */
(function (root) {
  'use strict';
  const P = root.NeutrinoPhysics || require('./physics.js');
  const lossA = 0.00024; // TeV/m, valor representativo del modelo
  const lossB = 0.00035; // 1/m
  const halfWidth = 500;
  const threshold = 0.75; // unidades arbitrarias de luz
  const directionCases = [
    {seed:43, spacing:100, absorption:150},
    {seed:44, spacing:100, absorption:150},
    {seed:89, spacing:200, absorption:40}
  ];
  const designSeeds = [14, 27, 38, 60, 71];
  const energyCases = [
    {energy:0.30, fraction:0.76, angle:8, x:-310, y:-65},
    {energy:0.30, fraction:0.53, angle:8, x:-310, y:-65},
    {energy:0.95, fraction:0.24, angle:14, x:-280, y:-100},
    {energy:0.09, fraction:0.68, angle:350, x:-310, y:60},
    {energy:0.61, fraction:0.78, angle:12, x:-320, y:-40}
  ];
  const energyRanges = [
    {id:'low', label:'Menos de 0,15 TeV', example:energyCases[3]},
    {id:'mid', label:'De 0,15 a menos de 0,45 TeV', example:energyCases[0]},
    {id:'high', label:'0,45 TeV o más', example:energyCases[4]}
  ];
  function rangeId(energy) { return energy < 0.15 ? 'low' : energy < 0.45 ? 'mid' : 'high'; }
  function grid(extent, spacing) {
    const count = Math.floor(extent / spacing);
    return Array.from({length:(2 * count + 1) ** 2}, (_, i) => ({
      x: (i % (2 * count + 1) - count) * spacing,
      y: (Math.floor(i / (2 * count + 1)) - count) * spacing
    }));
  }
  function track(seed, angle, spacing, absorption, layout = null) {
    if (!layout) return P.simulate({seed, angle, spacing, absorption});
    const event = P.geometry(seed, angle);
    const sensors = layout.map(({x,y}) => P.sensorSignal(x,y,event,absorption));
    return {event, sensors, hits:sensors.filter(s => s.hit).sort((a,b) => a.arrival-b.arrival)};
  }
  function challenge(index) {
    const {seed, spacing, absorption} = directionCases[index];
    const result = track(seed, P.hiddenAngle(seed), spacing, absorption);
    // Apagado determinista de módulos, idéntico al repetir cada caso.
    const sensors = result.sensors.map((sensor, i) => {
      const offline = (i * 7 + seed) % 13 < 2;
      return {...sensor, offline, hit:sensor.hit && !offline};
    });
    return {...result, sensors, hits:sensors.filter(s => s.hit).sort((a,b)=>a.arrival-b.arrival)};
  }
  function kineticAt(initial, length) {
    const critical = lossA / lossB;
    return Math.max(0, (initial + critical) * Math.exp(-lossB * length) - critical);
  }
  function lengthToEdge(x, y, ux, uy) {
    const limit = (at, direction) => Math.abs(direction) < 1e-12
      ? Infinity : (Math.sign(direction) * halfWidth - at) / direction;
    return Math.min(limit(x,ux), limit(y,uy));
  }
  function optical(distance, absorption) {
    return Math.exp(-distance / absorption) / (1 + (distance / 78) ** 2);
  }
  function energyEvent(configuration) {
    const {energy, fraction, angle, x, y} = configuration;
    const ux = Math.cos(P.radians(angle));
    const uy = Math.sin(P.radians(angle));
    const cascade = fraction * energy;
    const muon = energy - cascade;
    const stopLength = Math.log1p(muon * lossB / lossA) / lossB;
    const edge = lengthToEdge(x,y,ux,uy);
    const length = Math.min(stopLength,edge);
    const escaping = edge < stopLength;
    const remaining = kineticAt(muon,length);
    const coneFactor = Math.sqrt((P.N * P.BETA) ** 2 - 1);
    const sensors = grid(450,75).map(position => {
      const dx = position.x - x;
      const dy = position.y - y;
      const rho = Math.abs(dx * uy - dy * ux);
      const emission = dx * ux + dy * uy - rho / coneFactor;
      const flight = rho * P.N * P.BETA / coneFactor;
      const radial = Math.hypot(dx,dy);
      // Destello isotrópico efectivo. La traza emite en el ángulo Cherenkov.
      const candidates = [{kind:'cascade', time:P.N * radial / P.C,
        charge:720 * cascade * optical(radial,150)}];
      if (length > 0 && emission >= 0 && emission <= length) {
        const stopping = lossA + lossB * kineticAt(muon,emission);
        candidates.push({kind:'track', time:emission / (P.BETA * P.C) + P.N * flight / P.C,
          charge:720 * 75 * stopping * optical(flight,150)});
      }
      const pulses = candidates.filter(p => p.charge >= threshold).sort((a,b)=>a.time-b.time);
      return {...position, pulses, hit:pulses.length > 0,
        arrival:pulses[0]?.time, amplitude:pulses.reduce((sum,p)=>sum+p.charge,0)};
    });
    const hits = sensors.filter(s=>s.hit).sort((a,b)=>a.arrival-b.arrival);
    const totalLight = hits.reduce((sum,s)=>sum+s.amplitude,0);
    return {configuration, sensors, hits, totalLight, cascade, muon, remaining,
      escaping, length, deposited:energy-remaining, end:{x:x+ux*length,y:y+uy*length}};
  }
  const api = {directionCases,designSeeds,energyCases,energyRanges,rangeId,grid,track,
    challenge,kineticAt,energyEvent,lossA,lossB,threshold};
  root.IceMissions = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
