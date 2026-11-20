/* Cazando neutrinos en hielo · Renderizado del detector en Canvas. */
(function (root) {
  'use strict';
  const P = root.NeutrinoPhysics;
  const point = (x,y) => [300 + .5*x, 300 - .5*y];
  function coordinates(canvas, event) {
    const bounds = canvas.getBoundingClientRect();
    return {x:((event.clientX-bounds.left)*600/bounds.width-300)*2,
      y:(300-(event.clientY-bounds.top)*600/bounds.height)*2};
  }
  function ray(ctx,a,b,color,width=1,dashed=false) {
    ctx.beginPath();
    ctx.strokeStyle=color;
    ctx.lineWidth=width;
    ctx.setLineDash(dashed ? [6,5] : []);
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function arrow(ctx,x,y,angle,color,size=90) {
    const radians = P.radians(angle);
    const tip = [x+size*Math.cos(radians),y-size*Math.sin(radians)];
    ray(ctx,[x,y],tip,color,3);
    for (const delta of [-.48,.48]) {
      ray(ctx,tip,[tip[0]-12*Math.cos(radians+delta),tip[1]+12*Math.sin(radians+delta)],color,3);
    }
  }
  function dot(ctx,x,y,r,fill,stroke=null) {
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=fill;
    ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function timeColor(t) {
    const stops = [[169,85,41],[103,87,126],[34,117,170]];
    const fraction = Math.max(0,Math.min(1,t));
    const part = fraction<.5 ? 0 : 1;
    return 'rgb('+stops[part].map((c,i)=>Math.round(c+(stops[part+1][i]-c)*(fraction*2-part))).join(',')+')';
  }
  function backdrop(ctx) {
    const ice=ctx.createLinearGradient(0,0,600,600);
    ice.addColorStop(0,'#f4faff');
    ice.addColorStop(1,'#cee3ee');
    ctx.fillStyle=ice;
    ctx.fillRect(0,0,600,600);
    ctx.font='12px Arial';
    for(let d=-500;d<=500;d+=100){
      ray(ctx,point(d,-500),point(d,500),'#b8cedb');
      ray(ctx,point(-500,d),point(500,d),'#b8cedb');
      if(d%200===0){
        ctx.fillStyle='#36576c';
        ctx.fillText(d,point(d,-500)[0]-10,570);
        ctx.fillText(d,15,point(-500,d)[1]+3);
      }
    }
    ctx.fillText('x (m)',540,570);
    ctx.fillText('y (m)',15,35);
  }
  function drawTrack(ctx,result,time) {
    const {angle,cx,cy}=result.event;
    const ux=Math.cos(P.radians(angle));
    const uy=Math.sin(P.radians(angle));
    const at=s=>point(cx+s*ux,cy+s*uy);
    const distance=Math.min(P.TRACK,time*P.BETA*P.C);
    ray(ctx,at(-P.TRACK/2),at(P.TRACK/2),'#5e8d91',1,true);
    ray(ctx,at(-P.TRACK/2),at(-P.TRACK/2+distance),'#0c6270',3);
    if(distance>0 && distance<P.TRACK) dot(ctx,...at(-P.TRACK/2+distance),4,'#0c6270');
    if(distance>P.TRACK/2) arrow(ctx,...at(0),angle,'#0c6270',48);
    for(const sensor of result.hits){
      if(time<sensor.emissionTime||time>=sensor.arrival)continue;
      const progress=(time-sensor.emissionTime)/(sensor.arrival-sensor.emissionTime);
      dot(ctx,...point(sensor.ex+(sensor.x-sensor.ex)*progress,sensor.ey+(sensor.y-sensor.ey)*progress),2.4,'#327bae');
    }
  }
  function draw(canvas,{result,time,scale=5500,blind=false,truth=false,checks=[],guess=null,energy=false,layout=null,focus=null}) {
    const ctx=canvas.getContext('2d');
    backdrop(ctx);
    ctx.save();
    ctx.beginPath();
    ctx.rect(50,50,500,500);
    ctx.clip();
    if(layout){
      for(const sensor of layout.locations){
        const selected=layout.chosen.some(s=>s.x===sensor.x&&s.y===sensor.y);
        dot(ctx,...point(sensor.x,sensor.y),selected?6:3,selected?'#20536e':'#a5bdcb');
      }
    } else {
      if(truth&&!energy)drawTrack(ctx,result,time);
      if(truth&&energy){
        const start=point(result.configuration.x,result.configuration.y);
        if(result.length>0){
          ray(ctx,start,point(result.end.x,result.end.y),'#0c6270',3,true);
          arrow(ctx,...start,result.configuration.angle,'#0c6270',46);
          dot(ctx,...point(result.end.x,result.end.y),5,'#0c6270','#fff');
        }
        dot(ctx,...start,7,'#a95529','#fff');
      }
      for(const sensor of result.sensors){
        const at=point(sensor.x,sensor.y);
        const selected=checks.includes(sensor);
        if(sensor.offline){dot(ctx,...at,3,'#a1afbb');ray(ctx,[at[0]-3,at[1]-3],[at[0]+3,at[1]+3],'#637784');continue;}
        const active=sensor.hit&&(blind||sensor.arrival<=time);
        const showTime=active&&(!blind||selected);
        const charge=energy&&active ? sensor.pulses.filter(p=>p.time<=time).reduce((sum,p)=>sum+p.charge,0) : sensor.amplitude;
        const radius=active?(energy?Math.min(12,4+Math.sqrt(charge)):(blind?6:5+4*Math.sqrt(charge))):2.6;
        const fill=showTime?timeColor(sensor.arrival/scale):active?'#215d74':'#98b2c3';
        const outline=selected||sensor===focus?'#442b69':null;
        dot(ctx,...at,radius,fill,outline);
      }
      if(guess!==null)arrow(ctx,300,300,guess,'#794e2f');
    }
    ctx.restore();
  }
  root.IceDetector={draw,coordinates};
})(globalThis);
