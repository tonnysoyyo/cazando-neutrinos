/* Cazando neutrinos en hielo · Interfaz y controles del simulador. */
(function () {
  'use strict';
  const P=window.NeutrinoPhysics;
  const M=window.IceMissions;
  const D=window.IceDetector;
  const $=id=>document.getElementById(id);
  const modes={
    guide:['Llegadas de luz','Los tiempos de llegada permiten estimar el sentido de movimiento del muón antes de revelar su trayectoria.'],
    direction:['Dirección con tres consultas','El mapa muestra qué sensores registraron señal. Hasta tres consultas de tiempo permiten estimar el sentido del muón o determinar que la evidencia no basta.'],
    energy:['¿Con cuánta energía llegó?','Los ejemplos de referencia sirven para comparar el destello inicial y la traza, y distinguir la energía inicial de la depositada.'],
    classify:['Traza o cascada','La extensión de las señales permite clasificar el patrón antes de revelar qué lo produjo.'],
    compare:['Un evento, dos detectores','El detector B permite variar la separación y la longitud de absorción. Ambos detectores comparten evento, reloj y escala de color.'],
    design:['Un presupuesto de 25 sensores','La cuadrícula extendida y el diseño configurado usan 25 sensores y observan los mismos cinco eventos. Los resultados se revelan al terminar la ronda.']
  };
  const format=(value,digits=0)=>Number(value).toLocaleString('es-CO',{maximumFractionDigits:digits,minimumFractionDigits:digits});
  const designLocations=M.grid(400,100);
  const spread=M.grid(400,200);
  let mode='guide';
  let left,right,time,endTime,playing,lastFrame;
  let revealed,guess,consulted,focused,answer,notice;
  let dragOrigin=null,suppressCanvasClick=false;
  let challengeIndex=0,energyIndex=0,reference=0;
  let classificationIndex=0;
  const classifications=[
    {energy:.34,fraction:1,angle:0,x:-130,y:110},
    {energy:.85,fraction:.07,angle:22,x:-325,y:-160},
    {energy:.27,fraction:1,angle:0,x:190,y:-85}
  ];
  let comparison={seed:42,angle:35,spacing:200,absorption:150};
  let chosen=M.grid(200,100);
  let round=-1,phase=0,records=[];
  function pairVisible() {
    return mode==='compare'||mode==='energy'||(mode==='design'&&round>=0&&phase===2);
  }
  function blind() { return (mode==='direction'||mode==='design')&&!revealed; }
  function energyView() { return mode==='energy'||mode==='classify'; }
  function configuring() { return mode==='design'&&round<0; }
  function sensorLabel(sensor) { return '('+sensor.x+', '+sensor.y+') m'; }
  function prepare() {
    playing=false;
    revealed=false;
    notice='';
    consulted=[];
    focused=null;
    guess=0;
    answer='';
    time=0;
    dragOrigin=null;
    suppressCanvasClick=false;
    right=null;
    if(mode==='guide')left=M.track(42,35,100,150);
    if(mode==='direction')left=M.challenge(challengeIndex);
    if(mode==='energy'){
      left=M.energyEvent(M.energyCases[energyIndex]);
      right=M.energyEvent(M.energyRanges[reference].example);
    }
    if(mode==='classify')left=M.energyEvent(classifications[classificationIndex]);
    if(mode==='compare'){
      const {seed,angle,spacing,absorption}=comparison;
      left=M.track(seed,angle,100,150);
      right=M.track(seed,angle,spacing,absorption);
    }
    if(mode==='design'&&!configuring()){
      const seed=M.designSeeds[round];
      const angle=P.hiddenAngle(seed);
      left=M.track(seed,angle,100,150,phase===1?chosen:spread);
      if(phase===2){
        right=M.track(seed,angle,100,150,chosen);
        revealed=true;
      }
    }
    endTime=Math.max(500, ...[left,right].filter(Boolean).flatMap(result=>
      result.hits.flatMap(s=>s.pulses?s.pulses.map(p=>p.time):[s.arrival])),energyView()?0:P.TRACK/(P.BETA*P.C))+150;
    if(blind()||revealed)time=endTime;
    render();
  }
  function render() {
    const [title,description]=modes[mode];
    $('mission').innerHTML='<h2 id="mission-title">'+title+'</h2><p>'+description+'</p>';
    document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    $('right-figure').hidden=!pairVisible();
    $('detectors').classList.toggle('two',pairVisible());
    $('left').classList.toggle('can-aim',!revealed&&!configuring()&&['guide','direction','design'].includes(mode));
    $('left').classList.toggle('editable',configuring()||((mode==='guide'||mode==='direction'||mode==='energy')&&!revealed));
    $('playback').hidden=blind()||configuring();
    $('left-label').textContent=mode==='compare'?'A · Detector de referencia':
      mode==='energy'?'Evento por estimar':mode==='design'?(configuring()?'Ubicaciones disponibles':phase===1?'Detector configurado':'Cuadrícula extendida'):'Detector';
    $('right-label').textContent=mode==='energy'?'Ejemplo de '+M.energyRanges[reference].label.toLowerCase():mode==='design'?'Detector configurado':'B · Detector ajustable';
    $('legend').innerHTML=configuring()?'Puntos oscuros · sensores elegidos':
      blind()?'Puntos llenos · señal registrada · Rayas · sensor fuera de servicio':
        '<i class="gradient"></i> Llegadas tempranas → tardías · '+(energyView()?'Radio del punto: luz acumulada':'Radio del punto: señal relativa');
    $('sidebar').innerHTML=sideContent();
    draw();
  }
  function heading(title,body) { return '<section class="side-group"><h3>'+title+'</h3>'+body+'</section>'; }
  function guessInput() {
    return '<label>Sentido de movimiento <strong class="metric" id="guess-value">'+guess+'°</strong><input id="guess" type="range" min="0" max="359" value="'+guess+'" '+(revealed?'disabled':'')+'></label><p>0° → derecha · 90° → arriba'+(revealed?'':'. La flecha también se puede orientar arrastrando en el visor.')+'</p>';
  }
  function sensorOptions(sensors) {
    return '<label>Sensor activo<select id="sensor-select" class="sensor-select">'+sensors.map((sensor,index)=>
      '<option value="'+index+'">'+sensorLabel(sensor)+'</option>').join('')+'</select></label>';
  }
  function observations() {
    if(!left.hits.length)return '<p>El mapa de este evento no contiene señales registradas.</p>';
    const isBlind=mode==='direction'||mode==='design';
    return sensorOptions(isBlind?blindHits():left.hits)+
      '<button data-action="inspect" '+(blind()&&consulted.length>=3?'disabled':'')+'>'+(blind()?'Consultar tiempo':'Ver lectura')+'</button>'+
      (isBlind?'<p><strong>'+consulted.length+' de 3 consultas</strong></p><div class="metrics">'+consulted.map(s=>
        '<span>'+sensorLabel(s)+' · '+format(s.arrival)+' ns</span>').join('')+'</div>':'<p>El sensor también se puede seleccionar en el mapa.</p>');
  }
  function compareControls() {
    return heading('Evento compartido',
      '<label>Semilla <input id="seed" type="number" min="1" max="999999" value="'+comparison.seed+'"></label>'+
      '<label>Dirección <strong class="metric" id="angle-read">'+comparison.angle+'°</strong><input id="angle" type="range" min="0" max="359" value="'+comparison.angle+'"></label>')+
      heading('Ajustes del detector B','<p>A usa separación de 100 m y absorción de 150 m.</p>'+
      '<label>Separación <select id="spacing">'+options([50,75,100,125,150,175,200],comparison.spacing,' m')+'</select></label>'+
      '<label>Longitud de absorción <select id="absorption">'+options([40,80,100,150,200,250,300],comparison.absorption,' m')+'</select></label>'+
      '<div class="metrics" id="counts"></div><button data-action="csv">Descargar CSV de A y B</button>');
  }
  function options(values,current,suffix) {
    return values.map(value=>'<option '+(value===current?'selected':'')+' value="'+value+'">'+value+suffix+'</option>').join('');
  }
  function energyControls() {
    return heading('Evento '+(energyIndex+1)+' de '+M.energyCases.length,
      '<div class="row"><button data-action="energy-back" '+(energyIndex===0?'disabled':'')+'>Anterior</button><button data-action="energy-next" '+(energyIndex===M.energyCases.length-1?'disabled':'')+'>Siguiente</button></div>'+
      '<p>El tamaño del sensor representa luz registrada. Las lecturas usan unidades arbitrarias.</p><div class="metrics" id="light-values"></div>'+
      (left.hits.length?sensorOptions(left.hits)+'<button data-action="inspect">Ver pulsos del sensor</button>':''))+
      heading('Calibración didáctica','<label>Ejemplo de referencia <select id="reference">'+M.energyRanges.map((item,index)=>
        '<option value="'+index+'" '+(index===reference?'selected':'')+'>'+item.label+'</option>').join('')+'</select></label>'+
      '<label>Estimación <select id="energy-answer" '+(revealed?'disabled':'')+'><option value="">Seleccionar una opción</option>'+
      [...M.energyRanges,{id:'deposit',label:'Solo se estima la energía depositada'}].map(item=>
        '<option value="'+item.id+'" '+(answer===item.id?'selected':'')+'>'+item.label+'</option>').join('')+'</select></label>'+
      '<button class="primary" data-action="energy-reveal" '+(!answer||revealed?'disabled':'')+'>Revelar balance</button>'+
      (revealed?energySummary():''));
  }
  function energySummary() {
    const total=left.configuration.energy;
    const parts=[left.cascade,left.muon-left.remaining,left.remaining];
    return '<div class="metrics"><div class="bar" aria-hidden="true">'+parts.map(value=>'<span style="width:'+100*value/total+'%"></span>').join('')+'</div>'+
      '<span>Neutrino simulado <b>'+format(total,2)+' TeV</b></span><span>Cascada <b>'+format(parts[0],3)+' TeV</b></span>'+
      '<span>Depositado por el muón <b>'+format(parts[1],3)+' TeV</b></span><span>Se lo lleva el muón <b>'+format(parts[2],3)+' TeV</b></span>'+
      '<span>Depósito total <b>'+format(left.deposited,3)+' TeV</b></span></div>'+
      '<p>'+(left.escaping?'El muón cruza el borde y conserva energía.':'El muón se detiene dentro de la región simulada.')+'</p>';
  }
  function designControls() {
    if(configuring())return heading('Disposición de sensores',
      '<div class="row"><button data-action="spread">Extendida</button><button data-action="dense">Concentrada</button><button data-action="clear">Vaciar</button></div>'+
      '<p>Cada posición se puede añadir o retirar desde el visor o la lista.</p>'+
      '<label>Ubicación <select id="location">'+designLocations.map((sensor,i)=>'<option value="'+i+'">'+sensorLabel(sensor)+'</option>').join('')+'</select></label>'+
      '<button data-action="location">Añadir o retirar</button><p><strong>'+chosen.length+' / 25 sensores</strong></p>'+
      '<button class="primary" data-action="start-design" '+(chosen.length!==25?'disabled':'')+'>Evaluar el diseño</button>');
    if(phase===2){
      const score=number=>{
        const errors=records.map((pair,i)=>pair[number]===null?null:P.angularError(pair[number],P.hiddenAngle(M.designSeeds[i])));
        const usable=errors.filter(value=>value!==null);
        return {errors,count:usable.length,mean:usable.length?format(usable.reduce((a,b)=>a+b,0)/usable.length,1)+'°':'—'};
      };
      const a=score(0),b=score(1);
      return heading('Resultados de la ronda','<table><thead><tr><th>Evento</th><th>Extendida</th><th>Diseño evaluado</th></tr></thead><tbody>'+
        a.errors.map((error,index)=>'<tr><td><button data-review="'+index+'">'+(index+1)+'</button></td><td>'+(error===null?'—':error+'°')+'</td><td>'+(b.errors[index]===null?'—':b.errors[index]+'°')+'</td></tr>').join('')+
        '<tr><th>Respondidos</th><td>'+a.count+'/5</td><td>'+b.count+'/5</td></tr><tr><th>Error medio</th><td>'+a.mean+'</td><td>'+b.mean+'</td></tr></tbody></table>'+
        '<p>Evento revisado: '+(round+1)+'. El guion indica que se reportó evidencia insuficiente.</p><button data-action="restart-design">Rediseñar</button>');
    }
    return heading('Evento '+(round+1)+' de 5','<p>'+ (phase===0?'Cuadrícula extendida':'Detector configurado')+'. El registro de una respuesta permite avanzar.</p>'+observations())+directionControls();
  }
  function directionControls() {
    return heading('Estimación de dirección',guessInput()+
      '<div class="stack"><button class="primary" data-action="direction-reveal" '+(revealed||!left.hits.length?'disabled':'')+'>'+(mode==='design'?'Guardar ángulo':'Comparar y revelar')+'</button>'+
      (mode==='guide'?'':'<button data-action="insufficient" '+(revealed?'disabled':'')+'>Información insuficiente</button>')+'</div>');
  }
  function sideContent() {
    if(mode==='compare')return compareControls();
    if(mode==='energy')return energyControls();
    if(mode==='classify')return heading('Patrón '+(classificationIndex+1)+' de '+classifications.length,
      '<div class="stack"><button data-action="class-track" '+(revealed?'disabled':'')+'>Traza</button><button data-action="class-cascade" '+(revealed?'disabled':'')+'>Cascada</button><button data-action="class-next">Otro evento</button></div>'+
      '<p>Un patrón localizado y uno extendido ofrecen pistas distintas sobre su origen.</p>');
    if(mode==='design')return designControls();
    if(mode==='direction')return heading('Caso '+(challengeIndex+1)+' de '+M.directionCases.length,
      '<div class="row"><button data-action="case-back" '+(challengeIndex===0?'disabled':'')+'>Anterior</button><button data-action="case-next" '+(challengeIndex===M.directionCases.length-1?'disabled':'')+'>Siguiente</button></div><p>'+left.hits.length+' sensores con señal.</p>'+observations())+
      directionControls()+(challengeIndex===2&&revealed?heading('Una segunda observación','<p>La comparación permite variar solo la absorción para observar el mismo evento en otras condiciones.</p><button data-action="recover">Comparar el caso 89</button>'):'');
    return heading('Lecturas del detector','<p>Los sensores cambian de color según su tiempo de llegada. Las lecturas se pueden consultar al completar el evento.</p>'+
      '<div class="metrics" id="counts"></div><button data-action="inspect-first">Consultar primera señal</button>')+directionControls();
  }
  function visibleHits(result,at) { return result.hits.filter(s=>s.arrival<=at); }
  function lightAt(result,at) {
    return result.hits.reduce((sum,s)=>sum+s.pulses.filter(p=>p.time<=at).reduce((a,p)=>a+p.charge,0),0);
  }
  function draw() {
    const scale=energyView()?Math.max(4000,endTime):endTime;
    D.draw($('left'),{result:left,time,scale,blind:blind(),truth:revealed||mode==='compare',
      guess:['guide','direction'].includes(mode)||(mode==='design'&&phase!==2&&!configuring())?guess:mode==='design'&&phase===2?records[round][0]:null,
      energy:energyView(),checks:consulted,focus:focused,layout:configuring()?{locations:designLocations,chosen}:null});
    if(pairVisible())D.draw($('right'),{result:right,time:mode==='energy'?Infinity:time,scale,truth:mode!=='energy',
      guess:mode==='design'?records[round][1]:null,energy:mode==='energy'});
    $('status').textContent=notice;
    $('time').value=Math.round(time*1000/endTime);
    $('clock').textContent=format(time)+' ns';
    $('play').textContent=playing?'Pausar':time>=endTime?'Repetir':'Reproducir';
    if($('counts'))$('counts').textContent=visibleHits(left,time).length+' / '+left.sensors.length+' sensores activos'+(right?' (A) · '+visibleHits(right,time).length+' / '+right.sensors.length+' (B)':'');
    if($('light-values'))$('light-values').textContent='Evento '+format(lightAt(left,time),1)+' u. a. · Ejemplo '+format(right.totalLight,1)+' u. a.';
  }
  function blindHits() {
    // El orden de esta lista es espacial para que no revele el orden temporal.
    return left.sensors.filter(sensor=>sensor.hit);
  }
  function inspect(sensor) {
    if(!sensor?.hit||configuring())return;
    if(blind()&&!consulted.includes(sensor)){
      if(consulted.length>=3){notice='Límite de tres consultas alcanzado.';draw();return;}
      consulted.push(sensor);
      $('sidebar').innerHTML=sideContent();
      $('sensor-select')?.focus();
    }
    if(!blind()&&sensor.arrival>time){notice='La lectura estará disponible cuando llegue la señal.';draw();return;}
    focused=sensor;
    notice=sensorLabel(sensor)+' · '+format(sensor.arrival)+' ns';
    if(energyView())notice=sensorLabel(sensor)+' · Pulsos registrados: '+sensor.pulses.filter(p=>p.time<=time)
      .map(p=>format(p.time)+' ns, '+format(p.charge,1)+' u. a.').join(' · ');
    draw();
  }
  function recordDirection(value) {
    if(!left.hits.length&&value!==null)return;
    if(mode==='design'){
      if(phase===0){records.push([value]);phase=1;}
      else {
        records[round].push(value);
        round+=1;
        phase=round===M.designSeeds.length?2:0;
        if(phase===2)round=0;
      }
      prepare();
      return;
    }
    revealed=true;
    playing=false;
    time=endTime;
    const angle=left.event.angle;
    notice=value===null?(left.hits.length===0?'Decisión respaldada: el detector registró cero señales.':'Se registró evidencia insuficiente; no se informó un ángulo.'):
      'Dirección simulada '+angle+'° · Error angular '+P.angularError(value,angle)+'°.';
    render();
  }
  function toggleLocation(location) {
    if(!location||!configuring())return;
    const index=chosen.findIndex(s=>s.x===location.x&&s.y===location.y);
    if(index>=0)chosen.splice(index,1);
    else if(chosen.length<25)chosen.push(location);
    else {notice='Límite de 25 sensores. Para añadir otro es necesario retirar uno.';draw();return;}
    notice='';
    render();
    $('location').value=designLocations.indexOf(location);
  }
  function exportComparison() {
    const rows=[['detector','semilla','angulo_grados','separacion_m','absorcion_m','x_m','y_m','detectado','tiempo_ns','senal_relativa']];
    for(const [name,result,spacing,absorption] of [['A',left,100,150],['B',right,comparison.spacing,comparison.absorption]]){
      for(const s of result.sensors)rows.push([name,comparison.seed,comparison.angle,spacing,absorption,s.x,s.y,Number(s.hit),s.hit?s.arrival.toFixed(5):'',s.amplitude.toFixed(6)]);
    }
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.join(',')).join('\n')],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;
    link.download='neutrinos_comparacion_'+comparison.seed+'.csv';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function classify(choice) {
    revealed=true;playing=false;time=endTime;
    const actual=left.configuration.fraction===1?'cascada':'traza';
    notice=(choice===actual?'Coincide con el modelo. ':'La clasificación no coincide con el modelo. ')+
      (actual==='cascada'?'La señal se concentra alrededor del punto de interacción.':'La señal se extiende en la dirección que siguió el muón.');
    render();
  }
  function setMode(next) {
    mode=next;
    if(mode==='design'){round=-1;phase=0;records=[];}
    prepare();
  }
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
  $('sidebar').addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    if(button.dataset.review!==undefined){round=Number(button.dataset.review);prepare();return;}
    const actions={
      'inspect':()=>inspect((blind()?blindHits():left.hits)[Number($('sensor-select').value)]),
      'inspect-first':()=>inspect(visibleHits(left,time)[0]),
      'case-back':()=>{challengeIndex--;prepare();},
      'case-next':()=>{challengeIndex++;prepare();},
      'direction-reveal':()=>recordDirection(guess),
      'insufficient':()=>recordDirection(null),
      'recover':()=>{comparison={seed:89,angle:P.hiddenAngle(89),spacing:200,absorption:40};setMode('compare');},
      'class-track':()=>classify('traza'),
      'class-cascade':()=>classify('cascada'),
      'class-next':()=>{classificationIndex=(classificationIndex+1)%classifications.length;prepare();},
      'energy-back':()=>{energyIndex--;prepare();},
      'energy-next':()=>{energyIndex++;prepare();},
      'energy-reveal':()=>{
        revealed=true;playing=false;time=endTime;
        const expected=left.escaping?'deposit':M.rangeId(left.configuration.energy);
        notice=(expected===answer?'La estimación coincide con el caso simulado. ':'La estimación no coincide con el caso simulado. ')+
          (left.escaping?'La luz visible solo informa sobre el depósito; queda energía fuera.':'Aquí las dos contribuciones se depositaron dentro.');
        render();
      },
      'spread':()=>{chosen=[...spread];render();},
      'dense':()=>{chosen=M.grid(200,100);render();},
      'clear':()=>{chosen=[];render();},
      'location':()=>toggleLocation(designLocations[Number($('location').value)]),
      'start-design':()=>{round=0;phase=0;records=[];prepare();},
      'restart-design':()=>setMode('design'),
      'csv':exportComparison
    };
    actions[button.dataset.action]?.();
  });
  $('sidebar').addEventListener('change',event=>{
    const {id,value}=event.target;
    if(['seed','spacing','absorption','angle'].includes(id)){
      comparison[id]=id==='seed'?Math.max(1,Math.min(999999,Math.round(Number(value)||42))):Number(value);
      prepare();
      $(id)?.focus();
    }
    if(id==='reference'){
      reference=Number(value);
      right=M.energyEvent(M.energyRanges[reference].example);
      render();
      $('reference').focus();
    }
    if(id==='energy-answer'){
      answer=value;
      $('sidebar').querySelector('[data-action="energy-reveal"]').disabled=!answer;
    }
  });
  $('sidebar').addEventListener('input',event=>{
    const {id,value}=event.target;
    if(id==='guess'){guess=Number(value);$('guess-value').textContent=value+'°';draw();}
    if(id==='angle')$('angle-read').textContent=value+'°';
  });
  $('left').addEventListener('pointerdown',event=>{
    if(!revealed&&!configuring()&&['guide','direction','design'].includes(mode)){
      dragOrigin={x:event.clientX,y:event.clientY};
      $('left').setPointerCapture(event.pointerId);
    }
  });
  $('left').addEventListener('pointerup',event=>{
    if(!dragOrigin)return;
    const dx=event.clientX-dragOrigin.x;
    const dy=dragOrigin.y-event.clientY;
    dragOrigin=null;
    if(Math.hypot(dx,dy)<10)return;
    guess=(Math.round(Math.atan2(dy,dx)*180/Math.PI)+360)%360;
    $('guess').value=guess;
    $('guess-value').textContent=guess+'°';
    suppressCanvasClick=true;
    setTimeout(()=>{suppressCanvasClick=false;},0);
    draw();
  });
  $('left').addEventListener('pointercancel',()=>{dragOrigin=null;});
  $('left').addEventListener('click',event=>{
    if(suppressCanvasClick)return;
    const pos=D.coordinates($('left'),event);
    const pool=configuring()?designLocations:left.sensors;
    const bounds=$('left').getBoundingClientRect();
    const tolerance=Math.max(18,10000/bounds.width);
    const nearest=pool.reduce((best,s)=>{
      const distance=Math.hypot(pos.x-s.x,pos.y-s.y);
      return distance<best.distance?{sensor:s,distance}:best;
    },{sensor:null,distance:tolerance}).sensor;
    if(configuring())toggleLocation(nearest);
    else inspect(nearest);
  });
  $('play').addEventListener('click',()=>{if(time>=endTime)time=0;playing=!playing;draw();});
  $('end').addEventListener('click',()=>{time=endTime;playing=false;draw();});
  $('time').addEventListener('input',()=>{playing=false;time=endTime*Number($('time').value)/1000;draw();});
  function frame(now) {
    const elapsed=Math.min(.1,(now-(lastFrame||now))/1000);
    lastFrame=now;
    if(playing){
      time=Math.min(endTime,time+elapsed*1050);
      if(time===endTime)playing=false;
      draw();
    }
    requestAnimationFrame(frame);
  }
  prepare();
  requestAnimationFrame(frame);
})();
