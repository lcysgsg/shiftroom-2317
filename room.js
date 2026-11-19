// Orthographic cutaway. Geometry is in room coordinates, with Y up and the desk facing +Z.
(() => {
  const canvas = document.querySelector('#room-model');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.querySelector('#pins').hidden = true;
    document.querySelector('#scene-tip').textContent = '使用“靠近记录仪”即可操作纸带。';
    return;
  }
  const tau = Math.PI * 2;
  const faces = [];
  let prop=null;
  const pickAreas=[];
  const pins = [...document.querySelectorAll('[data-pin]')];
  const anchors = {screen:[-1.28,2.15,.78], drum:[1.65,2.03,.97], book:[.14,1.32,1.37]};
  const rgbCache = new Map();
  function shade(color, light) {
    const key = color + Math.round(light * 100);
    if (!rgbCache.has(key)) {
      const value = parseInt(color.slice(1),16);
      const channels = [value >> 16, value >> 8 & 255, value & 255];
      rgbCache.set(key,'rgb(' + channels.map(c => Math.min(255,Math.round(c * light))).join(',') + ')');
    }
    return rgbCache.get(key);
  }
  function face(points, color, layer, normal, texture) {
    const light = normal ? .81 + .18*normal[1] - .13*normal[0] + .11*normal[2] : 1;
    const center = [0,0,0];
    for (const point of points) for (let i=0;i<3;i++) center[i] += point[i]/points.length;
    faces.push({points,center,color:shade(color,light),layer,normal,texture,prop});
    return faces[faces.length-1];
  }
  function box(x,y,z,w,h,d,color,layer=3,skins={}) {
    const l=x-w/2,r=x+w/2,b=y-h/2,t=y+h/2,k=z-d/2,f=z+d/2;
    face([[l,t,f],[r,t,f],[r,b,f],[l,b,f]],color,layer,[0,0,1],skins.front);
    face([[r,t,k],[l,t,k],[l,b,k],[r,b,k]],color,layer,[0,0,-1],skins.back);
    face([[l,t,k],[r,t,k],[r,t,f],[l,t,f]],color,layer,[0,1,0],skins.top);
    face([[r,t,f],[r,t,k],[r,b,k],[r,b,f]],color,layer,[1,0,0],skins.right);
    face([[l,t,k],[l,t,f],[l,b,f],[l,b,k]],color,layer,[-1,0,0],skins.left);
  }
  const paper='#d9c6a0', enamel='#70847f', frame='#34474b', brass='#bb9362';
  function texture(w,h,draw) {
    const img=document.createElement('canvas'); img.width=w; img.height=h;
    draw(img.getContext('2d'),w,h); return img;
  }
  function fill(c,color,x,y,w,h) { c.fillStyle=color; c.fillRect(x,y,w,h); }
  function line(c,color,x,y,a,b,width=1) {
    c.beginPath(); c.strokeStyle=color; c.lineWidth=width; c.moveTo(x,y); c.lineTo(a,b); c.stroke();
  }
  function print(c,text,x,y,size,color,align='left') {
    c.font='600 '+size+'px Consolas,"Microsoft YaHei",monospace'; c.fillStyle=color; c.textAlign=align; c.fillText(text,x,y);
  }
  function rivets(c,w,h) {
    for(const x of [9,w-9]) for(const y of [9,h-9]) {
      c.fillStyle='#435254';c.beginPath();c.arc(x,y,3.4,0,tau);c.fill();
      line(c,'#c8bca7',x-2,y+1,x+2,y-1);
    }
  }
  const tiles=texture(720,540,(c,w,h)=>{
    fill(c,'#506068',0,0,w,h);
    for(let y=0;y<h;y+=60)for(let x=0;x<w;x+=60){
      fill(c,['#6c7777','#707b7b','#687575','#737c79'][(x/60+3*y/60)%4],x+1,y+1,58,58);
      line(c,'#88918a',x+2,y+2,x+57,y+2);
    }
    const grad=c.createRadialGradient(300,200,30,300,200,450);grad.addColorStop(0,'#172d3c55');grad.addColorStop(1,'#18283300');c.fillStyle=grad;c.fillRect(0,0,w,h);
  });
  const wall=texture(900,400,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#bba781');g.addColorStop(.48,'#aaa99a');g.addColorStop(1,'#889b9d');c.fillStyle=g;c.fillRect(0,0,w,h);
    fill(c,'#566e6a',0,254,w,146);fill(c,'#d4bb92',0,249,w,5);fill(c,'#384c50',0,380,w,20);
    for(let i=0;i<1400;i++)fill(c,i%2?'#f9ebc525':'#20332f19',(i*137)%w,(i*67+Math.floor(i/9))%h,1+i%3,1);
  });
  const nightWindow=texture(600,250,(c,w,h)=>{
    const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#1a2e49');sky.addColorStop(.7,'#597789');sky.addColorStop(1,'#466471');
    c.fillStyle=sky;c.fillRect(0,0,w,h);
    for(let k=0;k<3;k++){c.beginPath();c.moveTo(0,h);
      for(let x=0;x<=w;x+=6)c.lineTo(x,106+k*23+25*Math.sin(x/70+k)+12*Math.sin(x/26+.5*k));
      c.lineTo(w,h);c.closePath();c.fillStyle=['#405d72','#334c61','#253f4e'][k];c.fill();}
    fill(c,'#3f626b',0,196,w,h-196);
    for(let i=0;i<55;i++){let x=(i*79)%w;line(c,'#a5c5bd42',x,200+i%48,x+3+i%22,200+i%48);}
    for(let i=0;i<12;i++){const x=290+i*19;fill(c,'#eab878',x,184+Math.sin(i)*3,3,2);}
    for(let i=0;i<65;i++){const x=i*79%w,y=i*41%h;line(c,'#b8d9e333',x,y,x-4,y+13);}
    for(let i=1;i<4;i++){fill(c,'#1c343d',w*i/4-4,0,8,h);fill(c,'#879698',w*i/4+4,0,2,h);}
    fill(c,'#243b43',0,84,w,6);
  });
  const station=texture(460,78,(c,w,h)=>{fill(c,'#253e41',0,0,w,h);print(c,'石 溪 水 电 站',w/2,47,34,'#ebd8ae','center');rivets(c,w,h);});
  const wallClock=texture(140,140,(c,w,h)=>{
    for(const [radius,color] of [[68,'#384b50'],[63,'#9dafa9'],[58,'#e8ddbd']]){c.beginPath();c.arc(70,70,radius,0,tau);c.fillStyle=color;c.fill();}
    for(let i=0;i<60;i++){const a=i*tau/60;line(c,'#435252',70+Math.sin(a)*(i%5?53:48),70-Math.cos(a)*(i%5?53:48),70+Math.sin(a)*55,70-Math.cos(a)*55,i%5?1:3);}
    for(const [a,rad,weight,color] of [[(11+17/60)*tau/12,31,5,'#334349'],[17*tau/60,46,3,'#334349'],[4*tau/60,49,2,'#a25542']])line(c,color,70,70,70+Math.sin(a)*rad,70-Math.cos(a)*rad,weight);
  });
  const deskTop=texture(700,270,(c,w,h)=>{
    fill(c,'#9c8264',0,0,w,h);for(let i=0;i<130;i++){const y=(i*43)%h;line(c,i%3?'#c4a07945':'#53483d40',i*19%128,y,w-(i*13%110),y+2);}
    for(const [x,y,r] of [[170,102,111],[470,140,97],[60,50,51]]){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#272b27a0');g.addColorStop(1,'#272b2700');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);}
  });
  let tapeValue=1024, stampFlash=0, bellFlash=0, replaying=false;
  const monitor=texture(370,225,(c,w,h)=>{
    fill(c,'#101e24',0,0,w,h);const g=c.createRadialGradient(150,80,10,185,112,200);g.addColorStop(0,'#315650');g.addColorStop(1,'#122324');c.fillStyle=g;c.fillRect(6,5,w-12,h-10);
    for(let y=12;y<h;y+=4)fill(c,'#07192036',8,y,w-16,1);
    print(c,'SHIXI    /    EVENT LOG',20,30,15,'#a2bda6');print(c,'23:17:04',18,86,48,'#d2efb6');
    for(let i=0;i<3;i++){print(c,'#0'+(41+i)+'   23:17:0'+(2+i),23,121+i*27,19,'#97d5ac');fill(c,i===2?'#b9d9a3':'#d3a275',299,108+i*27,29+i*5,5);}
  });
  const monitorStill=texture(monitor.width,monitor.height,c=>c.drawImage(monitor,0,0));
  const vents=texture(220,100,(c,w,h)=>{fill(c,'#56696b',0,0,w,h);for(let y=12;y<90;y+=10){fill(c,'#293f43',12,y,196,4);fill(c,'#91a09a',13,y+4,193,1);}rivets(c,w,h);});
  const keyboard=texture(370,120,(c,w,h)=>{fill(c,'#b1b09e',0,0,w,h);for(let r=0;r<4;r++)for(let k=0;k<14;k++){let x=13+k*25+(r%2)*3,y=10+r*25;fill(c,k>10?'#697a77':'#d1c8ae',x,y,20,18);fill(c,'#55605c',x,y+16,20,4);} });
  const ledger=texture(330,240,(c,w,h)=>{fill(c,'#cbba95',0,0,w,h);fill(c,'#ede0b8',8,6,148,223);fill(c,'#e3d4ae',164,6,157,223);
    for(let s=0;s<2;s++){let x=18+s*157;print(c,s?'夜班':'交接记录',x,37,20,'#554e42');for(let i=0;i<8;i++){line(c,'#a3aaa0',x,56+i*21,x+121,56+i*21);if(i<5)line(c,'#6f7569',x+3,52+i*21,x+55+(i*31)%67,51+i*21,2);}}
    fill(c,'#966851',155,4,5,229);});
  const panel=texture(360,160,(c,w,h)=>{fill(c,'#526669',0,0,w,h);fill(c,'#354b50',9,10,w-18,h-20);
    for(let i=0;i<3;i++){let x=20+i*111;fill(c,'#a7b2a8',x,23,96,87);fill(c,'#ddcfaa',x+5,27,86,67);c.strokeStyle='#596461';c.lineWidth=2;c.beginPath();c.arc(x+48,89,43,3.72,5.72);c.stroke();
      for(let k=0;k<11;k++){let a=3.72+k*.2;line(c,'#536360',x+48+Math.cos(a)*37,89+Math.sin(a)*37,x+48+Math.cos(a)*43,89+Math.sin(a)*43);}
      line(c,'#a34c39',x+48,89,x+42+i*11,47,3);print(c,['A','V','Hz'][i],x+49,88,12,'#4c5450','center');fill(c,i===2?'#b7c897':'#d6aa72',x+38,125,18,6);}
    rivets(c,w,h);});
  const cabinetFace=texture(180,280,(c,w,h)=>{fill(c,'#637a78',0,0,w,h);c.strokeStyle='#344f52';c.strokeRect(5,5,w-10,h-10);
    fill(c,'#272f32',145,126,8,34);fill(c,'#afb2a1',148,128,5,27);for(let i=0;i<5;i++)fill(c,'#43585a',25,221+i*6,103,2);});
  const strip=texture(360,230,(c,w,h)=>{fill(c,'#e1cca0',0,0,w,h);for(let x=0;x<w;x+=16)line(c,'#bd8c785a',x,0,x,h);for(let y=0;y<h;y+=16)line(c,'#bf947a70',0,y,w,y);
    c.beginPath();for(let x=0;x<w;x+=2){const y=116-48*Math.exp(-Math.pow((x-148)/55,2))+7*Math.sin(x/16);if(!x)c.moveTo(x,y);else c.lineTo(x,y);}c.strokeStyle='#805447';c.lineWidth=4;c.stroke();print(c,'SX  /  LEVEL',12,28,18,'#6f6152');});
  // Revolved solids. Vertical cylinders also make the lamp shade; horizontal ones carry the recording paper.
  function cylinder(x,y,z,r0,r1,length,color,axis='y',layer=3,segments=20,wrap=null) {
    const ring=(r,pos,a)=>axis==='x'?[x+pos,y+r*Math.cos(a),z+r*Math.sin(a)]:[x+r*Math.cos(a),y+pos,z+r*Math.sin(a)];
    for(let i=0;i<segments;i++){
      const a=i*tau/segments,b=(i+1)*tau/segments,mid=(a+b)/2;
      const normal=axis==='x'?[0,Math.cos(mid),Math.sin(mid)]:[Math.cos(mid),0,Math.sin(mid)];
      const p=[ring(r0,-length/2,a),ring(r0,-length/2,b),ring(r1,length/2,b),ring(r1,length/2,a)];
      const f=face(p,color,layer,normal);if(wrap)f.band={i,segments,wrap};
    }
    for(const sign of [-1,1]){const points=[];for(let i=0;i<segments;i++)points.push(ring(sign<0?r0:r1,sign*length/2,i*tau/segments));
      face(points,color,layer,axis==='x'?[sign,0,0]:[0,sign,0]);}
  }
  function frontPanel(x,y,z,w,h,img,layer=4) {
    face([[x-w/2,y+h/2,z],[x+w/2,y+h/2,z],[x+w/2,y-h/2,z],[x-w/2,y-h/2,z]],'#ffffff',layer,[0,0,1],img);
  }
  function floorShadow(x,z,w,d){
    const img=texture(128,128,(c,size)=>{
      const g=c.createRadialGradient(64,64,3,64,64,64);
      g.addColorStop(0,'#12202878');g.addColorStop(.55,'#14252b46');g.addColorStop(1,'#17292c00');
      c.fillStyle=g;c.fillRect(0,0,size,size);
    });
    const f=face([[x-w/2,.04,z-d/2],[x+w/2,.04,z-d/2],[x+w/2,.04,z+d/2],[x-w/2,.04,z+d/2]],frame,-6.5,[0,1,0],img);
    f.decal=true;
  }
  // Stone plinth, cutaway walls, industrial glazing and the station nameplate.
  box(0,-.28,0,8.9,.32,5.55,'#26383f',-8);
  box(0,-.08,0,8.8,.23,5.45,'#8e8a75',-7,{top:tiles});
  floorShadow(-.18,.55,7.8,3.7);
  floorShadow(-.82,1.85,1.73,.99);
  box(0,1.69,-2.56,8.62,3.35,.18,'#9eaa9f',-6,{front:wall});
  box(-4.20,.58,-.12,.17,1.14,4.85,'#74877c',-5);
  box(-4.20,1.18,-.12,.23,.08,4.9,'#d6c4a1',-5);
  box(0,3.39,-2.56,8.75,.10,.25,'#cec5ae',-5);
  box(-.95,2.14,-2.38,4.75,1.75,.19,frame,-4,{front:nightWindow});
  box(-.95,1.25,-2.30,4.94,.12,.39,'#bead8e',-3);
  box(2.63,2.98,-2.40,2.44,.43,.12,frame,-4,{front:station});
  frontPanel(3.22,2.23,-2.43,.85,.85,wallClock,-3);
  box(1.87,1.89,-2.42,.82,.52,.10,enamel,-4,{front:vents});
  for(let i=0;i<3;i++)box(-3.62+i*.07,1.60,-2.40,.043,3.13,.06,'#87958b',-4);
  // Relay cabinets, plinth shadows, and a long solid timber workbench.
  for(let i=0;i<3;i++){const x=1.17+i*.89;box(x,.65,-1.94,.86,1.23,.83,enamel,-2,{front:cabinetFace});}
  box(2.08,1.29,-1.94,2.78,.10,.90,'#afb6a4',-1);
  box(2.07,1.72,-1.97,2.35,.78,.46,frame,-1,{front:panel});
  box(-.17,1.15,.26,6.60,.19,2.09,'#ab8e69',2,{top:deskTop});
  box(-.17,1.04,.26,6.48,.09,2.01,'#3f5554',1);
  for(const x of [-3.05,2.70])for(const z of [-.53,1.05]){
    box(x,.55,z,.13,1.03,.14,'#516567',0);box(x,.07,z,.25,.10,.23,'#354748',0);}
  box(-2.20,.65,.24,1.27,.74,1.36,'#647a76',1,{front:cabinetFace});
  // The operator's swivel stool, pulled back from the console.
  for(const x of [-1.18,-.54])for(const z of [1.64,2.13]){
    box(x,.085,z,.15,.10,.15,'#3e4a47',2.2);
    box(x,.22,z,.065,.23,.065,'#a39b84',2.2);
  }
  box(-.86,.305,1.885,.73,.055,.56,'#506264',2.2);
  cylinder(-.86,.43,1.885,.075,.065,.28,'#c3b591','y',2.2);
  cylinder(-.86,.57,1.885,.41,.44,.11,'#695046','y',2.3,28);
  cylinder(-.86,.64,1.885,.44,.41,.065,'#a26e54','y',2.4,28);
  // CRT terminal with stepped case, dark glass, ventilation, controls and keyboard.
  prop='screen';
  box(-1.22,1.33,-.04,1.29,.17,.76,'#506265');
  box(-1.22,1.49,-.08,.69,.24,.52,'#79877f');
  box(-1.22,1.97,-.13,1.74,.98,1.05,'#c1bba2',3,{right:vents});
  box(-1.22,1.98,.398,1.60,.86,.09,'#51625e');
  frontPanel(-1.26,2.02,.448,1.40,.67,monitor);
  box(-.60,1.60,.453,.11,.026,.028,'#a9c78e',4);
  box(-1.25,1.28,.88,1.71,.07,.56,'#b6b29e',4,{top:keyboard});
  // Articulated brass reading lamp.
  prop=null;
  cylinder(-2.78,1.29,-.26,.32,.28,.10,brass);
  cylinder(-2.78,1.77,-.26,.046,.046,.90,'#a48962');
  box(-2.58,2.20,-.26,.47,.065,.075,brass);
  cylinder(-2.38,2.10,-.26,.34,.12,.23,'#e4bc76');
  cylinder(-2.38,1.984,-.26,.32,.32,.023,'#ffe1a2');
  // Chart recorder, exposed drum, knurled wheel and sampling lever.
  prop='drum';
  box(1.51,1.40,.22,2.11,.32,1.24,'#526c6b');
  box(1.51,1.57,.21,2.03,.075,1.16,'#96a49a');
  for(const x of [.70,2.29])box(x,1.80,.13,.13,.54,.86,'#5e7576');
  cylinder(1.51,1.88,.13,.34,.34,1.48,paper,'x',4,36,strip);
  for(const x of [.75,2.27])cylinder(x,1.88,.13,.36,.36,.074,brass,'x',4,28);
  prop='crank';
  cylinder(2.49,1.88,.13,.24,.24,.24,'#526366','x',4);
  cylinder(2.65,1.88,.13,.31,.31,.11,brass,'x',4,28);
  prop='drum';
  box(1.47,1.617,.64,1.40,.022,.39,paper,4,{top:strip});
  box(1.51,2.13,.38,1.64,.036,.047,'#3d4541',5);
  box(1.68,2.09,.35,.055,.085,.11,'#ae5948',5);
  prop='lever';
  box(2.47,1.62,.68,.39,.065,.18,'#c77959',5);
  prop='book';
  box(.07,1.269,.84,.85,.051,.64,'#735744',4,{top:ledger});
  box(.49,1.285,.81,.032,.038,.43,'#c3a775',4);
  // Tall side locker and a striped status beacon give the cutaway a clear silhouette.
  prop=null;
  box(-3.59,1.08,-1.65,.81,2.07,.81,'#69817c',-2,{front:cabinetFace});
  box(-3.59,2.14,-1.65,.86,.07,.84,'#a2ac98',-1);
  cylinder(-3.59,2.23,-1.64,.16,.16,.13,frame,'y',0);
  cylinder(-3.59,2.43,-1.64,.13,.115,.29,'#de8264','y',0);
  cylinder(-3.59,2.59,-1.64,.13,.11,.025,brass,'y',0);

  let yaw=.48, pitch=.41, focus=0, wantedFocus=0, frameId=0, last=0;
  let viewWidth=1,viewHeight=1,pixelRatio=1;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function render(now) {
    frameId=0;
    const dt=Math.min(80,last ? now-last : 16);last=now;
    focus=reduced.matches?wantedFocus:focus+(wantedFocus-focus)*(1-Math.exp(-dt/125));
    if(Math.abs(focus-wantedFocus)<.002)focus=wantedFocus;
    const w=viewWidth,h=viewHeight, ca=Math.cos(yaw),sa=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const direction=[sa*cp,sp,ca*cp];
    const target=[1.45*focus,1.37+.35*focus,.20*focus];
    const fullScale=Math.min((w-22)/10.55,(h-48)/6.55);
    const scale=fullScale+(Math.min((w-18)/3.75,(h-24)/1.95)-fullScale)*focus;
    const centerX=w*.50,centerY=h*.50;
    function project(p) {
      const x=p[0]-target[0],y=p[1]-target[1],z=p[2]-target[2];
      return [centerX+(ca*x-sa*z)*scale,centerY-(cp*y-sp*(sa*x+ca*z))*scale];
    }
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.clearRect(0,0,w,h);
    const shadow=ctx.createRadialGradient(centerX,h*.72,0,centerX,h*.72,w*.44);
    shadow.addColorStop(0,'#071218a6');shadow.addColorStop(1,'#07121800');
    ctx.save();ctx.translate(0,h*.72);ctx.scale(1,.29);ctx.translate(0,-h*.72);ctx.fillStyle=shadow;ctx.fillRect(0,h*.72-w*.44,w,w*.88);ctx.restore();
    const dot=p=>p[0]*direction[0]+p[1]*direction[1]+p[2]*direction[2];
    const visible=faces.filter(f=>!f.normal||dot(f.normal)>.008);
    visible.sort((a,b)=>a.layer-b.layer||dot(a.center)-dot(b.center));
    pickAreas.length=0;
    for(const f of visible) {
      const pts=f.points.map(project);
      if(f.prop)pickAreas.push({prop:f.prop,pts});
      ctx.beginPath();ctx.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);ctx.closePath();
      if(!f.decal&&f.texture!==wallClock){ctx.fillStyle=f.color;ctx.fill();}
      if(!f.texture&&!f.band)continue;
      ctx.save();
      const a=pts[0],b=f.band?pts[3]:pts[1],d=f.band?pts[1]:pts[3];
      const img=f.texture || f.band.wrap;
      ctx.transform((b[0]-a[0])/img.width,(b[1]-a[1])/img.width,(d[0]-a[0])/img.height,(d[1]-a[1])/img.height,a[0],a[1]);
      if(f.band){
        const row=(f.band.i/f.band.segments*img.height+tapeValue*.60)%img.height;
        const lines=Math.min(img.height-row,img.height/f.band.segments);
        ctx.drawImage(img,0,row,img.width,Math.max(.1,lines),0,0,img.width,img.height);
        ctx.fillStyle='rgba(34,36,30,'+(1-Math.max(0,dot(f.normal)))*.32+')';ctx.fillRect(0,0,img.width,img.height);
      }else ctx.drawImage(img,0,0);
      ctx.restore();
    }
    if(replaying){
      ctx.save();ctx.globalCompositeOperation='source-atop';ctx.fillStyle='#0d233e66';ctx.fillRect(0,0,w,h);ctx.restore();
    }
    const bulb=project([-2.38,1.99,-.26]), glowSize=scale*.52;
    const lampGlow=ctx.createRadialGradient(...bulb,0,...bulb,glowSize);
    lampGlow.addColorStop(0,'#ffe2a878');lampGlow.addColorStop(.23,'#efbd7438');lampGlow.addColorStop(1,'#edaa5a00');
    ctx.fillStyle=lampGlow;ctx.fillRect(bulb[0]-glowSize,bulb[1]-glowSize,glowSize*2,glowSize*2);
    const angle=tapeValue*.032;
    const axle=project([2.715,1.88,.13]);
    const knob=project([2.72,1.88+.23*Math.cos(angle),.13+.23*Math.sin(angle)]);
    if(direction[0]>0){
      ctx.beginPath();ctx.moveTo(...axle);ctx.lineTo(...knob);ctx.strokeStyle='#5f5246';ctx.lineWidth=Math.max(1,scale*.045);ctx.stroke();
      ctx.fillStyle='#edca87';ctx.beginPath();ctx.arc(...axle,Math.max(2,scale*.045),0,tau);ctx.fill();
      ctx.fillStyle='#523e33';ctx.beginPath();ctx.arc(...knob,Math.max(2,scale*.062),0,tau);ctx.fill();
    }
    const crank=document.querySelector('#crank');crank.style.transform='translate('+clamp(axle[0],48,w-48)+'px,'+clamp(axle[1]+15,12,h-48)+'px) translateX(-50%)';
    if(stampFlash>now){const a=project([2.47,1.71,.68]);ctx.fillStyle='#ffe4a2';ctx.beginPath();ctx.arc(...a,Math.max(2,scale*.06),0,tau);ctx.fill();}
    if(bellFlash>now){
      const a=project([-3.59,2.43,-1.64]),r=scale*.63;
      const glow=ctx.createRadialGradient(...a,0,...a,r);glow.addColorStop(0,'#ffd695');glow.addColorStop(.2,'#ffa95db8');glow.addColorStop(1,'#f28b4400');
      ctx.fillStyle=glow;ctx.fillRect(a[0]-r,a[1]-r,2*r,2*r);
      const glass=project([-1.26,2.02,.45]),size=scale*1.04;
      const bloom=ctx.createRadialGradient(...glass,0,...glass,size);bloom.addColorStop(0,'#adffd54a');bloom.addColorStop(1,'#a0f6c900');
      ctx.fillStyle=bloom;ctx.fillRect(glass[0]-size,glass[1]-size,size*2,size*2);
    }
    for(const pin of pins){
      const p=project(anchors[pin.dataset.pin]);
      pin.style.transform='translate('+clamp(p[0],35,w-35)+'px,'+clamp(p[1]+13,15,h-40)+'px) translate(-50%,0)';
    }
    if(focus!==wantedFocus||stampFlash>now||bellFlash>now)requestFrame();
  }
  function requestFrame(){if(!frameId)frameId=requestAnimationFrame(render);}
  function resize(){
    const rect=canvas.getBoundingClientRect();viewWidth=Math.max(1,rect.width);viewHeight=Math.max(1,rect.height);
    pixelRatio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(viewWidth*pixelRatio);canvas.height=Math.round(viewHeight*pixelRatio);requestFrame();
  }
  new ResizeObserver(resize).observe(canvas);resize();
  let drag=null;
  function pick(x,y){
    for(let i=pickAreas.length-1;i>=0;i--){
      const {pts,prop}=pickAreas[i];let inside=false;
      for(let j=0,k=pts.length-1;j<pts.length;k=j++){
        const [ax,ay]=pts[j],[bx,by]=pts[k];
        if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
      }
      if(inside)return prop;
    }
  }
  const spool=document.querySelector('#spool');
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,prop:pick(e.offsetX,e.offsetY),value:Number(spool.value)};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag){
      const hover=pick(e.offsetX,e.offsetY);
      canvas.style.cursor=wantedFocus&&hover==='crank'?'ew-resize':(wantedFocus?hover==='lever':hover)?'pointer':'grab';return;
    }
    if(drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.hypot(dx,dy)>5)drag.moved=true;
    if(!drag.moved)return;
    if(wantedFocus&&drag.prop==='crank'){
      spool.value=String(Math.round(drag.value+dx*2.15));spool.dispatchEvent(new Event('input'));return;
    }
    canvas.style.cursor='grabbing';yaw=clamp(drag.yaw-dx*.006,-.67,.96);pitch=clamp(drag.pitch+dy*.003,.22,.67);requestFrame();
  });
  canvas.addEventListener('pointerup',e=>{
    if(!drag||drag.id!==e.pointerId||drag.moved)return;
    let name=drag.prop;
    if(wantedFocus){
      if(name==='lever')document.querySelector('#stamp').click();
      if(name==='crank')document.querySelector('#notch').click();
      return;
    }
    if(document.querySelector('#pins').hidden)return;
    if(name==='lever'||name==='crank')name='drum';
    if(name)pins.find(pin=>pin.dataset.pin===name)?.click();
  });
  canvas.addEventListener('lostpointercapture',()=>{drag=null;});
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();
    yaw=clamp(yaw+(e.key==='ArrowLeft'?-.09:e.key==='ArrowRight'?.09:0),-.67,.96);
    pitch=clamp(pitch+(e.key==='ArrowUp'?.06:e.key==='ArrowDown'?-.06:0),.22,.67);requestFrame();
  });
  document.querySelector('#reset-view').addEventListener('click',()=>{yaw=.48;pitch=.41;requestFrame();});
  window.nightRoom={
    focus(active){wantedFocus=active?1:0;requestFrame();},
    wind(value){tapeValue=value;requestFrame();},
    stamp(){stampFlash=performance.now()+280;requestFrame();},
    replay(active){
      replaying=active;monitor.getContext('2d').drawImage(monitorStill,0,0);requestFrame();
    },
    bell(rec){
      const c=monitor.getContext('2d');
      fill(c,'#193b37',12,43,345,164);print(c,rec.received,18,94,49,'#deffbe');
      print(c,rec.id+'  /  '+rec.state,24,157,34,'#b8e1ae');
      bellFlash=performance.now()+430;requestFrame();
    }
  };
})();
