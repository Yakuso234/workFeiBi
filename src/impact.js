const canvas=document.getElementById('impact'),ctx=canvas.getContext('2d');
let frame=0;
function drawCrack(point){
  cancelAnimationFrame(frame);
  const scale=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.ceil(innerWidth*scale);canvas.height=Math.ceil(innerHeight*scale);
  ctx.setTransform(scale,0,0,scale,0,0);
  const x=Math.max(0,Math.min(innerWidth,point.x)),y=Math.max(0,Math.min(innerHeight,point.y));
  const rays=[],branches=[],shards=[];
  for(let ray=0;ray<11;ray++){
    const angle=ray*Math.PI*2/11+(Math.random()-.5)*.2,length=90+Math.random()*100;
    const nodes=[[x,y]];
    for(let step=1;step<=5;step++){
      const jitter=(Math.random()-.5)*13,r=step*length/5;
      nodes.push([x+Math.cos(angle)*r+Math.sin(angle)*jitter,y+Math.sin(angle)*r-Math.cos(angle)*jitter]);
      if(step===2||step===4){const p=nodes.at(-1),a=angle+(ray%2?1:-1)*.7;branches.push([p,[p[0]+Math.cos(a)*20,p[1]+Math.sin(a)*20],[p[0]+Math.cos(a+.25)*42,p[1]+Math.sin(a+.25)*42]]);}
    }
    rays.push(nodes);
    shards.push({angle,speed:35+Math.random()*35,size:3+Math.random()*5});
  }
  canvas.dataset.rays=String(rays.length);canvas.dataset.branches=String(branches.length);
  canvas.dataset.active='true';
  const start=performance.now();
  function line(nodes,progress){
    ctx.beginPath();ctx.moveTo(...nodes[0]);
    const limit=Math.min(nodes.length-1,progress*(nodes.length-1));
    for(let i=1;i<=Math.floor(limit);i++)ctx.lineTo(...nodes[i]);
    const whole=Math.floor(limit),fraction=limit-whole;
    if(fraction&&whole+1<nodes.length)ctx.lineTo(nodes[whole][0]+(nodes[whole+1][0]-nodes[whole][0])*fraction,nodes[whole][1]+(nodes[whole+1][1]-nodes[whole][1])*fraction);
    ctx.stroke();
  }
  function paint(now){
    // A compositor frame timestamp can precede the task which scheduled it.
    // Clamp the first frame so polyline interpolation never indexes node -1.
    const elapsed=Math.max(0,now-start),progress=Math.min(1,elapsed/210),opacity=elapsed<1700?1:Math.max(0,1-(elapsed-1700)/950);
    ctx.clearRect(0,0,innerWidth,innerHeight);
    if(elapsed>=2650){canvas.dataset.active='false';return;}
    ctx.save();ctx.globalAlpha=opacity;
    ctx.strokeStyle='rgba(14,26,45,.8)';ctx.lineWidth=4;
    for(const ray of rays)line(ray,progress);
    ctx.strokeStyle='rgba(231,252,255,.95)';ctx.lineWidth=1.5;
    for(const ray of rays)line(ray,progress);
    ctx.strokeStyle='rgba(140,233,244,.85)';ctx.lineWidth=.9;
    for(const branch of branches)line(branch,Math.max(0,(progress-.4)/.6));
    // Irregular cross-links produce a shattered-glass web rather than spokes.
    for(let i=0;i<rays.length;i++)for(const ring of [1,2])line([rays[i][ring],rays[(i+1)%rays.length][ring+(i%3===0?1:0)]],progress);
    if(elapsed<700){
      ctx.globalAlpha=opacity*(1-elapsed/700);ctx.strokeStyle='#b2f5ff';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(x,y,9+elapsed*.19,0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=opacity*.65;ctx.fillStyle='#e6fbff';
    for(const shard of shards){const t=elapsed/1000,sx=x+Math.cos(shard.angle)*shard.speed*t,sy=y+Math.sin(shard.angle)*shard.speed*t+20*t*t;ctx.beginPath();ctx.moveTo(sx,sy-shard.size);ctx.lineTo(sx+shard.size,sy+shard.size);ctx.lineTo(sx-shard.size/2,sy+shard.size*.6);ctx.closePath();ctx.fill();}
    ctx.restore();frame=requestAnimationFrame(paint);
  }
  frame=requestAnimationFrame(paint);
}
window.workFeiBi.onImpact(point=>{if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))drawCrack(point);});
