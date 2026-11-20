<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Flight Command 3D</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000;user-select:none;touch-action:none;font-family:monospace}
canvas{position:fixed;left:0;top:0;width:100vw;height:100vh;display:block}
#g{pointer-events:none}
video{display:none}
</style>
</head>
<body>
<canvas id="w"></canvas>
<canvas id="g"></canvas>
<video id="cv" autoplay playsinline muted></video>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
const rnd=(a,b)=>a+Math.random()*(b-a);

/* ===== RENDERER, CAMERA, OVERLAY ===== */
const R=new THREE.WebGLRenderer({canvas:document.getElementById('w'),antialias:true});
R.setPixelRatio(Math.min(devicePixelRatio,2));
R.outputEncoding=THREE.sRGBEncoding;
R.toneMapping=THREE.ACESFilmicToneMapping;
R.toneMappingExposure=1.25;
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x05040f,.0013);
const camera=new THREE.PerspectiveCamera(60,1,.1,1500);
const CAMZ=11,TAN=Math.tan(Math.PI/6);
const c=document.getElementById('g'),ctx=c.getContext('2d');
let vw=1,vh=1,halfW=1,halfH=1,T=0;
function resize(){
  const pr=Math.min(devicePixelRatio,2);
  vw=innerWidth;vh=innerHeight;
  R.setSize(vw,vh);
  camera.aspect=vw/vh;camera.updateProjectionMatrix();
  c.width=vw*pr;c.height=vh*pr;ctx.setTransform(pr,0,0,pr,0,0);
  halfH=CAMZ*TAN;halfW=halfH*camera.aspect;
}
resize();
addEventListener('resize',resize);

/* ===== TEXTURES, SKY, PLANET ===== */
function tex(src){const t=new THREE.CanvasTexture(src);t.encoding=THREE.sRGBEncoding;return t;}
const gc=document.createElement('canvas');gc.width=gc.height=128;
const gx=gc.getContext('2d'),gg=gx.createRadialGradient(64,64,0,64,64,64);
gg.addColorStop(0,'#fff');gg.addColorStop(.2,'rgba(255,255,255,.5)');gg.addColorStop(.55,'rgba(255,255,255,.08)');gg.addColorStop(1,'rgba(255,255,255,0)');
gx.fillStyle=gg;gx.fillRect(0,0,128,128);
const glowT=tex(gc);

const nk=document.createElement('canvas');nk.width=nk.height=1024;
const nctx=nk.getContext('2d');
nctx.fillStyle='#030309';nctx.fillRect(0,0,1024,1024);
['150,70,255','0,190,255','255,70,150','60,110,255'].forEach(col=>{
  for(let i=0;i<14;i++){
    const x0=Math.random()*1024,y0=Math.random()*1024,r=140+Math.random()*280,g=nctx.createRadialGradient(x0,y0,0,x0,y0,r);
    g.addColorStop(0,`rgba(${col},.2)`);g.addColorStop(1,`rgba(${col},0)`);
    nctx.fillStyle=g;nctx.fillRect(0,0,1024,1024);
  }
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1400,48,24),new THREE.MeshBasicMaterial({map:tex(nk),side:THREE.BackSide,fog:false})));

const pk=document.createElement('canvas');pk.width=8;pk.height=512;
const pctx=pk.getContext('2d'),pgr=pctx.createLinearGradient(0,0,0,512);
pgr.addColorStop(0,'#2b1466');pgr.addColorStop(.3,'#7a3cff');pgr.addColorStop(.5,'#15b0d8');pgr.addColorStop(.66,'#ff5fa2');pgr.addColorStop(.85,'#1b0b40');pgr.addColorStop(1,'#0b0420');
pctx.fillStyle=pgr;pctx.fillRect(0,0,8,512);
for(let y=0;y<512;y+=3+Math.random()*9){pctx.fillStyle=`rgba(255,255,255,${Math.random()*.12})`;pctx.fillRect(0,y,8,1+Math.random()*3);}
const planets=[];
function planetTex(cols,blobs,bands){
  const k=document.createElement('canvas');k.width=256;k.height=128;const x=k.getContext('2d');
  const g=x.createLinearGradient(0,0,0,128);cols.forEach((c,i)=>g.addColorStop(i/(cols.length-1),c));
  x.fillStyle=g;x.fillRect(0,0,256,128);
  for(let i=0;i<bands;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.12})`;x.fillRect(0,Math.random()*128,256,1+Math.random()*3);}
  for(let i=0;i<blobs;i++){
    const bx=Math.random()*256,by=Math.random()*128,br=3+Math.random()*16;
    for(const ox of[-256,0,256]){const rg=x.createRadialGradient(bx+ox,by,0,bx+ox,by,br);rg.addColorStop(0,'rgba(0,0,0,.28)');rg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=rg;x.fillRect(bx+ox-br,by-br,br*2,br*2);}
  }
  return tex(k);
}
function makePlanet(x,y,z,r,map,spin,moon){
  const g=new THREE.Group(),b=new THREE.Mesh(new THREE.SphereGeometry(r,48,36),new THREE.MeshStandardMaterial({map,roughness:.85,emissive:0x0c0618,emissiveIntensity:.5,fog:false})),q={b,s:spin};
  g.add(b);g.position.set(x,y,z);scene.add(g);
  if(moon){
    q.mp=new THREE.Group();q.ms=.004;q.mp.rotation.x=.35;
    const mo=new THREE.Mesh(new THREE.SphereGeometry(r*.16,24,18),new THREE.MeshStandardMaterial({map:planetTex(['#9a9aa8','#d6d6e0','#5c5c6a'],40,0),roughness:.95}));
    mo.position.x=r*1.7;q.mp.add(mo);g.add(q.mp);
  }
  planets.push(q);
}
makePlanet(-150,60,-420,60,planetTex(['#c9824a','#f2d7a6','#b86a3c','#e9c08a','#8c4a2b'],0,30),.0006,true);
makePlanet(230,-50,-360,26,planetTex(['#c1440e','#e27b58','#7b2d12','#f0a06a'],80,0),.0009);
makePlanet(500,-225,-640,46,planetTex(['#e8faff','#8fd3ff','#4aa3d9','#d7f1ff'],30,8),.0005);
makePlanet(-340,-128,-520,34,planetTex(['#0b3d91','#1aa3a3','#0a6e78','#7fe0d2'],50,0),.0007);
makePlanet(627,50,-860,88,tex(pk),.0004);

/* ===== STARFIELD + WARP STREAKS ===== */
const SN=2000,spos=new Float32Array(SN*3),scol=new Float32Array(SN*3),svel=new Float32Array(SN);
const TINT=[[.6,.8,1],[1,1,1],[1,.8,.55]];
function starAt(i,z){const k=(CAMZ-z)*TAN*1.25;spos[i*3]=rnd(-k,k)*camera.aspect;spos[i*3+1]=rnd(-k,k);spos[i*3+2]=z;}
for(let i=0;i<SN;i++){
  starAt(i,-500+Math.random()*530);
  const t=TINT[i%3],b=.3+Math.random()*.9;
  scol.set([t[0]*b,t[1]*b,t[2]*b],i*3);svel[i]=.6+Math.random()*.9;
}
const sGeo=new THREE.BufferGeometry();
sGeo.setAttribute('position',new THREE.BufferAttribute(spos,3));
sGeo.setAttribute('color',new THREE.BufferAttribute(scol,3));
scene.add(new THREE.Points(sGeo,new THREE.PointsMaterial({size:1.6,map:glowT,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));
const LN=240,lpos=new Float32Array(LN*6),lGeo=new THREE.BufferGeometry();
lGeo.setAttribute('position',new THREE.BufferAttribute(lpos,3));
const streaks=new THREE.LineSegments(lGeo,new THREE.LineBasicMaterial({color:0xaee8ff,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));
scene.add(streaks);

/* ===== LIGHTS ===== */
scene.add(new THREE.HemisphereLight(0x7fb2ff,0x1b0a33,.8));
const sun=new THREE.DirectionalLight(0xfff0dd,2.4);sun.position.set(80,60,60);scene.add(sun);
const glowLight=new THREE.PointLight(0x00e5ff,3,40,1.5);scene.add(glowLight);

/* ===== PLAYER SHIP ===== */
const ship=new THREE.Group(),bank=new THREE.Group();
ship.add(bank);scene.add(ship);
const sh=new THREE.Shape();
sh.moveTo(0,1.8);sh.lineTo(1.3,-.9);sh.lineTo(.4,-.5);sh.lineTo(0,-.9);sh.lineTo(-.4,-.5);sh.lineTo(-1.3,-.9);sh.closePath();
const shipGeo=new THREE.ExtrudeGeometry(sh,{depth:.28,bevelEnabled:true,bevelThickness:.1,bevelSize:.12,bevelSegments:2});
shipGeo.rotateX(-Math.PI/2);shipGeo.center();
bank.add(new THREE.Mesh(shipGeo,new THREE.MeshStandardMaterial({color:0xcfefff,metalness:.9,roughness:.2,emissive:0x021a26})));
const edges=new THREE.LineSegments(new THREE.EdgesGeometry(shipGeo,25),new THREE.LineBasicMaterial({color:0x00f0ff}));
edges.scale.setScalar(1.01);bank.add(edges);
const cockpit=new THREE.Mesh(new THREE.SphereGeometry(.38,24,16),new THREE.MeshStandardMaterial({color:0x00e5ff,emissive:0x00606e,roughness:.05,metalness:.3,transparent:true,opacity:.9}));
cockpit.scale.set(.8,.5,1.6);cockpit.position.set(0,.2,-.35);bank.add(cockpit);
const engMat=new THREE.SpriteMaterial({map:glowT,color:0x33eeff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
const engines=[-.45,.45].map(x=>{const s=new THREE.Sprite(engMat);s.position.set(x,.1,1);s.scale.setScalar(1.6);bank.add(s);return s;});

/* ===== BULLETS ===== */
const bGeo=new THREE.CylinderGeometry(.05,.05,1.5,6);bGeo.rotateX(Math.PI/2);
const bMat=new THREE.MeshBasicMaterial({color:new THREE.Color(.4,2.6,2.8)});
let bullets=[];

/* ===== ENEMIES AND BOSS ===== */
const rockG=[0,1,2].map(k=>{
  const g=new THREE.IcosahedronGeometry(1,1),q=g.attributes.position,v=new THREE.Vector3();
  for(let i=0;i<q.count;i++){
    v.fromBufferAttribute(q,i);
    const n=1+.28*Math.sin(v.x*4.1+v.y*2.3+k)*Math.cos(v.z*3.7-v.y*1.9)+.12*Math.sin(v.x*9.7+v.z*7.3+k*2);
    q.setXYZ(i,v.x*n,v.y*n,v.z*n);
  }
  g.computeVertexNormals();return g;
});
let enemies=[],boss=null;
function spawnEnemy(x,y,z,r,vz){
  const m=new THREE.Mesh(rockG[Math.random()*3|0],new THREE.MeshStandardMaterial({color:0x7a6558,roughness:.8,metalness:.2,flatShading:true,emissive:0xff4a10,emissiveIntensity:.25}));
  m.position.set(x,y,z);m.scale.setScalar(r);scene.add(m);
  enemies.push({m,x,y,z,r,hp:Math.ceil(r*2.5),vz,fl:0,sp:[rnd(-.025,.025),rnd(-.025,.025)]});
}
function spawnWave(){
  if(isWarp||boss)return;
  for(let i=0;i<3+lvl;i++)spawnEnemy(rnd(-.8,.8)*halfW,rnd(-.75,.75)*halfH,-130-Math.random()*60,rnd(1,2.6),rnd(.5,.75)+lvl*.05);
}
function spawnBoss(){
  enemies.forEach(e=>{scene.remove(e.m);e.m.material.dispose();});enemies=[];
  const g=new THREE.Group(),rm=new THREE.MeshStandardMaterial({color:0x221218,metalness:.8,roughness:.3,emissive:0xff0055,emissiveIntensity:.9});
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(3.4,1),new THREE.MeshStandardMaterial({color:0x2a1a24,metalness:.7,roughness:.35,flatShading:true,emissive:0xff0055,emissiveIntensity:.35}));
  const r1=new THREE.Mesh(new THREE.TorusGeometry(6.2,.28,12,64),rm),r2=new THREE.Mesh(new THREE.TorusGeometry(4.4,.22,12,48),rm);
  r2.rotation.x=1.2;
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowT,color:0xff0055,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
  halo.scale.setScalar(24);
  g.add(core,r1,r2,halo);g.position.set(0,4,-200);scene.add(g);
  boss={g,core,r1,r2,hp:50+lvl*40,mhp:50+lvl*40,fl:0};
  boom(0,4,-120,0xff0055,80,1.5);sfx.alarm();
}
function bossStep(){
  const b=boss,q=b.g.position;
  q.z=Math.min(-90,q.z+.8);q.x=Math.sin(gTime*.7)*8;q.y=4+Math.sin(gTime*.45)*1.5;
  b.core.rotation.y+=.01;b.core.rotation.x+=.004;b.r1.rotation.z+=.012;b.r2.rotation.y+=.02;
  b.fl*=.9;b.core.material.emissiveIntensity=.35+b.fl*2;
  if(Math.random()<.012+lvl*.006)spawnEnemy(q.x+rnd(-2,2),q.y+rnd(-2,2),q.z+4,1.1,.7+lvl*.05);
}
function bossDown(){
  const q=boss.g.position;
  boom(q.x,q.y,q.z,0xff0055,90,1.6);ring(q.x,q.y,q.z,0xff3388,9);sfx.bigBoom();
  score+=5000*lvl;scene.remove(boss.g);boss=null;startWarp(100);
}

/* ===== PARTICLES AND SHOCKWAVES ===== */
const PN=600,pPos=new Float32Array(PN*3),pCol=new Float32Array(PN*3),pBase=new Float32Array(PN*3),pVel=new Float32Array(PN*3),pLife=new Float32Array(PN);
let pIdx=0;
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
scene.add(new THREE.Points(pGeo,new THREE.PointsMaterial({size:1.8,map:glowT,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));
function boom(x,y,z,col,n,sp){
  const k3=new THREE.Color(col);
  for(let i=0;i<n;i++){
    const k=pIdx;pIdx=(pIdx+1)%PN;const j=k*3;
    pPos.set([x,y,z],j);pVel.set([rnd(-sp,sp),rnd(-sp,sp),rnd(-sp,sp)],j);
    pBase.set([k3.r*2,k3.g*2,k3.b*2],j);pCol.set([k3.r*2,k3.g*2,k3.b*2],j);
    pLife[k]=1;
  }
}
const rings=[],ringG=new THREE.RingGeometry(.6,.8,48);
function ring(x,y,z,col,s){
  const m=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:col,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(x,y,z);scene.add(m);rings.push({m,t:0,s});
}

/* ===== WEBCAM CONTROL ===== */
const CW=64,CH=48;
const cam={on:false,v:document.getElementById('cv'),prev:null,tx:0,ty:0,motion:0,msg:"",stream:null};
const wcv=document.createElement('canvas');wcv.width=CW;wcv.height=CH;
const sx=wcv.getContext('2d',{willReadFrequently:true});
async function toggleCam(){
  if(cam.on){cam.stream&&cam.stream.getTracks().forEach(t=>t.stop());cam.on=false;cam.prev=null;cam.msg="CAMERA OFF";return;}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){cam.msg="CAMERA NOT SUPPORTED (use https or localhost)";return;}
  cam.msg="REQUESTING CAMERA ACCESS...";
  try{
    cam.stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:"user"},audio:false});
    cam.v.srcObject=cam.stream;await cam.v.play();
    cam.on=true;cam.prev=null;cam.tx=p.x;cam.ty=p.y;cam.msg="CAMERA ONLINE - MOVE YOUR HAND OR BODY";
  }catch(err){cam.on=false;cam.msg="CAMERA BLOCKED: "+(err.name||"error");}
}
function camStep(){
  if(!cam.on||cam.v.readyState<2)return;
  sx.drawImage(cam.v,0,0,CW,CH);
  const d=sx.getImageData(0,0,CW,CH).data,cur=new Float32Array(CW*CH);
  let n=0,mx=0,my=0;
  for(let i=0;i<CW*CH;i++){
    const l=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;cur[i]=l;
    if(cam.prev&&Math.abs(l-cam.prev[i])>30){n++;mx+=i%CW;my+=(i/CW)|0;}
  }
  cam.prev=cur;cam.motion=n;
  if(n>14){
    const nx=1-(mx/n)/CW,ny=(my/n)/CH;
    cam.tx+=((nx-.5)*1.8*halfW-cam.tx)*.35;cam.ty+=((.5-ny)*1.8*halfH-cam.ty)*.35;
  }
}
function drawCamPreview(){
  if(!cam.on||cam.v.readyState<2)return;
  const w=160,h=120,x=vw-w-15,y=vh-h-15;
  ctx.save();ctx.globalAlpha=.9;ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(cam.v,0,0,w,h);ctx.restore();
  ctx.strokeStyle="#00ffcc";ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle=cam.motion>14?"#00ffcc":"#ff5555";
  ctx.beginPath();ctx.arc(x+((cam.tx/(halfW*1.8))+.5)*w,y+(.5-cam.ty/(halfH*1.8))*h,5,0,Math.PI*2);ctx.fill();
  ctx.textAlign="left";txt(cam.motion>14?"TRACKING":"NO MOTION",x,y-6,`bold 11px monospace`,ctx.fillStyle);
}

/* ===== SOUND (synthesized with Web Audio, no files) ===== */
let AC=null,master=null,drone=null,noiseBuf=null,sfxOn=true,lastSfx=0;
function audioInit(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    const comp=AC.createDynamicsCompressor();
    master=AC.createGain();master.gain.value=sfxOn?.5:0;
    master.connect(comp);comp.connect(AC.destination);
    const o=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();
    o.type='sawtooth';o.frequency.value=48;f.type='lowpass';f.frequency.value=160;g.gain.value=0;
    o.connect(f);f.connect(g);g.connect(master);o.start();drone={o,g};
  }catch(err){AC=null;}
}
function tone(type,f0,f1,dur,vol,delay=0){
  if(!AC||!sfxOn)return;
  const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.05);
}
function noise(dur,vol,fc,delay=0){
  if(!AC||!sfxOn)return;
  if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  const t=AC.currentTime+delay,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=noiseBuf;f.type='lowpass';f.frequency.setValueAtTime(fc,t);f.frequency.exponentialRampToValueAtTime(90,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f);f.connect(g);g.connect(master);s.start(t,Math.random()*.5);s.stop(t+dur+.05);
}
const sfx={
  laser:()=>tone('sawtooth',1400,220,.13,.035),
  tick:()=>{const n=performance.now();if(n-lastSfx<45)return;lastSfx=n;noise(.05,.12,3000);tone('triangle',900,400,.05,.05);},
  bossHit:()=>{const n=performance.now();if(n-lastSfx<70)return;lastSfx=n;tone('triangle',700,300,.08,.07);},
  explode:()=>{noise(.55,.35,1600);tone('sawtooth',220,50,.45,.14);},
  hit:()=>{tone('sawtooth',180,50,.35,.22);noise(.3,.3,900);},
  alarm:()=>{[0,.22,.44,.66].forEach((d,i)=>tone('square',i%2?660:880,i%2?660:880,.18,.06,d));},
  bigBoom:()=>{noise(1.4,.7,1500);tone('sawtooth',140,30,1.2,.3);tone('sine',60,30,.8,.4,.1);noise(.6,.4,2400,.25);noise(.5,.35,1800,.6);},
  warp:()=>{tone('sawtooth',80,700,1.6,.12);tone('sine',160,1400,1.6,.1);noise(1.6,.18,3500);},
  chime:()=>{tone('triangle',523,523,.2,.12);tone('triangle',659,659,.2,.12,.12);tone('triangle',784,784,.3,.12,.24);},
  over:()=>{tone('sawtooth',320,35,2,.22);tone('square',160,40,2,.08,.2);noise(1.8,.25,1100);},
  click:()=>tone('square',1100,1100,.035,.05)
};
function ambient(live){
  if(!drone)return;
  const t=AC.currentTime;
  drone.g.gain.setTargetAtTime(live&&sfxOn?.04:0,t,.25);
  drone.o.frequency.setTargetAtTime(isWarp?96:48,t,.4);
}
function toggleSound(){sfxOn=!sfxOn;if(master&&AC)master.gain.setTargetAtTime(sfxOn?.5:0,AC.currentTime,.05);}
/* ===== MENU STATE AND INPUT ===== */
const buttons=[{t:"START GAME",a:"start"},{t:"CAMERA: OFF",a:"camera"},{t:"KEYBINDS",a:"keybinds"},{t:"CREDITS",a:"credits"},{t:"SOUND: ON",a:"sound"}];
function hitBtn(x,y){for(const b of buttons)if(x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h)return b.a;return null;}
function menuAction(a){if(a)sfx.click();
  if(a==="start"){resetGame();menu=false;spawnWave();}
  else if(a==="camera")toggleCam();
  else if(a==="keybinds")keybindsMenu=true;
  else if(a==="sound")toggleSound();
  else if(a==="credits")alert("Flight Command\nMade for a birthday party.\nHave fun!");
}
let p={x:0,y:0,vx:0,vy:0,hp:100,mhp:100},keys={},score=0,lvl=1,over=false,overAt=0,paused=false,shake=0,lShot=0,gTime=0,lBoss=0,tDest=0,tReq=8,isWarp=false,wTime=0,warpK=0,uMouse=false,mpx=0,mpy=0,menu=true,keybindsMenu=false,lastTouch=0;
const rc=new THREE.Raycaster(),zPl=new THREE.Plane(new THREE.Vector3(0,0,1),0),tmpV=new THREE.Vector3();
function mL(e){uMouse=true;const t=e.touches?e.touches[0]:e;mpx=t.clientX;mpy=t.clientY;}
function press(){
  audioInit();
  if(keybindsMenu){keybindsMenu=false;return;}
  if(menu){menuAction(hitBtn(mpx,mpy));return;}
  if(!over&&mpx>20&&mpx<150&&mpy>vh-45&&mpy<vh-5){paused=!paused;return;}
  if(mpx>165&&mpx<300&&mpy>vh-45&&mpy<vh-5){sfx.click();goMenu();return;}
  keys[' ']=true;
}
function kL(e,v){
  const k=e.key.toLowerCase();
  if(v){audioInit();if(k==='m'){toggleSound();return;}}
  if(v&&k==='l'){keybindsMenu=!keybindsMenu;return;}
  if(v&&k==='c'){toggleCam();return;}
  if(v&&k==='q'&&!menu){goMenu();return;}
  if(v&&k==='r'&&!menu&&!over){resetGame();spawnWave();return;}
  if(v&&!menu&&!over&&(k==='escape'||k==='p')){paused=!paused;sfx.click();}
  keys[k]=v;if(v)uMouse=false;
}
addEventListener('keydown',e=>kL(e,true));
addEventListener('keyup',e=>kL(e,false));
addEventListener('blur',()=>{keys={};});
addEventListener('mousemove',mL);
addEventListener('mousedown',e=>{if(e.button!==0||Date.now()-lastTouch<600)return;mL(e);press();});
addEventListener('mouseup',e=>{if(e.button===0)keys[' ']=false;});
addEventListener('touchstart',e=>{e.preventDefault();lastTouch=Date.now();mL(e);press();},{passive:false});
addEventListener('touchmove',e=>{e.preventDefault();mL(e);},{passive:false});
addEventListener('touchend',()=>{keys[' ']=false;});

/* ===== GAME STATE ===== */
function clearAll(){
  enemies.forEach(e=>{scene.remove(e.m);e.m.material.dispose();});enemies=[];
  bullets.forEach(b=>scene.remove(b));bullets=[];
  if(boss){scene.remove(boss.g);boss=null;}
}
function resetGame(){
  clearAll();
  p={x:0,y:0,vx:0,vy:0,hp:100,mhp:100};keys={};
  score=0;lvl=1;over=false;tDest=0;tReq=8;isWarp=false;wTime=0;gTime=0;lBoss=0;shake=0;cam.tx=0;cam.ty=0;
}
function startWarp(t){
  isWarp=true;wTime=t;sfx.warp();
  enemies.forEach(e=>{scene.remove(e.m);e.m.material.dispose();});enemies=[];
}
function killEnemy(j){
  const e=enemies[j];
  boom(e.x,e.y,e.z,0xff7a2a,40,.9);ring(e.x,e.y,e.z,0xffb070,5);sfx.explode();
  score+=Math.floor(e.r*30);tDest++;
  scene.remove(e.m);e.m.material.dispose();enemies.splice(j,1);
  if(tDest>=tReq&&!isWarp&&!boss)startWarp(90);
}
function goMenu(){resetGame();paused=false;menu=true;}
function gameOver(){sfx.over();over=true;overAt=Date.now();boom(p.x,p.y,0,0x00ffff,80,1.4);ring(p.x,p.y,0,0x00ffff,8);shake=20;}

function step(){
  if(!isWarp)gTime+=1/60;
  camStep();
  if(gTime-lBoss>=60&&!boss&&!isWarp){spawnBoss();lBoss=gTime;}
  if(isWarp){
    shake=Math.max(shake,2.5);
    if(--wTime<=0){
      isWarp=false;lvl++;tDest=0;tReq=8+lvl*4;sfx.chime();
      bullets.forEach(b=>scene.remove(b));bullets=[];
      spawnWave();
    }
  }
  if(cam.on){p.vx=(cam.tx-p.x)*.15;p.vy=(cam.ty-p.y)*.15;}
  else if(uMouse){
    rc.setFromCamera({x:mpx/vw*2-1,y:1-mpy/vh*2},camera);
    if(rc.ray.intersectPlane(zPl,tmpV)){p.vx=(tmpV.x-p.x)*.18;p.vy=(tmpV.y-p.y)*.18;}
  }else{
    const a=.9,f=.86;
    if(keys.a||keys.arrowleft)p.vx-=a;
    if(keys.d||keys.arrowright)p.vx+=a;
    if(keys.w||keys.arrowup)p.vy-=a;
    if(keys.s||keys.arrowdown)p.vy+=a;
    p.vx*=f;p.vy*=f;
  }
  p.x=Math.max(-halfW*.92,Math.min(halfW*.92,p.x+p.vx));
  p.y=Math.max(-halfH*.9,Math.min(halfH*.9,p.y+p.vy));

  const now=Date.now();
  if((keys[' ']||cam.on)&&now-lShot>110&&!isWarp){
    for(const dx of[-.9,.9]){const m=new THREE.Mesh(bGeo,bMat);m.position.set(p.x+dx,p.y,-1.6);scene.add(m);bullets.push(m);}
    lShot=now;shake=Math.max(shake,.4);sfx.laser();
  }

  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i],bp=b.position;bp.z-=3.4;
    let used=false;
    for(let j=enemies.length-1;j>=0&&!used;j--){
      const e=enemies[j];
      if(Math.abs(bp.x-e.x)<e.r+.4&&Math.abs(bp.y-e.y)<e.r+.4&&Math.abs(bp.z-e.z)<4){
        used=true;e.hp--;e.fl=1;boom(bp.x,bp.y,bp.z,0xffaa55,6,.4);sfx.tick();
        if(e.hp<=0)killEnemy(j);
      }
    }
    if(!used&&boss){
      const q=boss.g.position;
      if(Math.abs(bp.x-q.x)<7&&Math.abs(bp.y-q.y)<7&&Math.abs(bp.z-q.z)<4){
        used=true;boss.hp--;boss.fl=1;boom(bp.x,bp.y,bp.z,0xffffff,4,.3);sfx.bossHit();
        if(boss.hp<=0)bossDown();
      }
    }
    if(used||bp.z<-320){scene.remove(b);bullets.splice(i,1);}
  }

  for(let j=enemies.length-1;j>=0;j--){
    const e=enemies[j];
    e.z+=e.vz;e.fl*=.85;e.m.position.z=e.z;
    e.m.rotation.x+=e.sp[0];e.m.rotation.y+=e.sp[1];
    e.m.material.emissiveIntensity=.25+e.fl*3;
    if(e.z>CAMZ+4){scene.remove(e.m);e.m.material.dispose();enemies.splice(j,1);continue;}
    if(!isWarp&&Math.abs(e.z)<e.r+1.6&&Math.hypot(e.x-p.x,e.y-p.y)<e.r+1.1){
      p.hp-=Math.ceil(e.r*6);shake=12;
      boom(e.x,e.y,e.z,0xff3300,25,.8);ring(e.x,e.y,e.z,0xff5533,4);sfx.hit();
      scene.remove(e.m);e.m.material.dispose();enemies.splice(j,1);
      if(p.hp<=0)gameOver();
    }
  }
  if(boss)bossStep();
  if(!boss&&!isWarp&&enemies.length===0)spawnWave();
}

/* ===== BACKGROUND, EFFECTS, CAMERA, SHIP ===== */
function stepBg(live){
  const sm=(paused||over)?.05:(live?1+warpK*7:.35);
  for(let i=0;i<SN;i++){
    const j=i*3+2;spos[j]+=svel[i]*sm;
    if(spos[j]>30)starAt(i,-500-Math.random()*60);
  }
  sGeo.attributes.position.needsUpdate=true;
  planets.forEach(q=>{q.b.rotation.y+=q.s;if(q.mp)q.mp.rotation.y+=q.ms;});
  streaks.visible=warpK>.04;
  if(streaks.visible){
    for(let i=0;i<LN;i++){
      const j=i*3,k=i*6;
      lpos[k]=spos[j];lpos[k+1]=spos[j+1];lpos[k+2]=spos[j+2];
      lpos[k+3]=spos[j];lpos[k+4]=spos[j+1];lpos[k+5]=spos[j+2]-warpK*(18+svel[i]*12);
    }
    lGeo.attributes.position.needsUpdate=true;
  }
}
function stepFx(){
  for(let k=0;k<PN;k++){
    if(pLife[k]<=0)continue;
    pLife[k]-=.028;const f=Math.max(0,pLife[k]),j=k*3;
    for(let q=0;q<3;q++){pVel[j+q]*=.93;pPos[j+q]+=pVel[j+q];pCol[j+q]=pBase[j+q]*f;}
  }
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true;
  for(let i=rings.length-1;i>=0;i--){
    const r=rings[i];r.t++;const q=r.t/24;
    r.m.scale.setScalar(.6+q*r.s);r.m.material.opacity=1-q;
    if(q>=1){scene.remove(r.m);r.m.material.dispose();rings.splice(i,1);}
  }
}
let mk=1;
function placeShip(){
  if(menu){p.x*=.92;p.y*=.92;p.vx=p.vy=0;}
  mk+=((menu?1:0)-mk)*.08;
  ship.position.set(p.x+mk*halfW*.5,p.y,0);
  ship.visible=!over;
  ship.rotation.y+=((menu?Math.sin(T*.012)*.6:0)-ship.rotation.y)*.08;
  bank.rotation.z+=(-p.vx*.07-bank.rotation.z)*.2;
  bank.rotation.x+=(p.vy*.05-bank.rotation.x)*.2;
  glowLight.position.set(p.x,p.y+.6,1.5);
  engines.forEach(s=>s.scale.setScalar(1.3+Math.random()*.7));
}
function placeCam(){
  const s=shake*.15;
  warpK+=((isWarp?1:0)-warpK)*.07;
  camera.position.set(p.x*.25+rnd(-s,s),p.y*.25+1.6+rnd(-s,s),CAMZ);
  camera.lookAt(p.x*.4,p.y*.4,-40);
  camera.fov=60+warpK*24;camera.updateProjectionMatrix();
}

/* ===== 2D OVERLAY: HUD AND MENUS ===== */
function txt(t,x,y,f,col,s=5,sc='#000'){ctx.font=f;ctx.fillStyle=col;ctx.shadowBlur=s;ctx.shadowColor=sc;ctx.fillText(t,x,y);ctx.shadowBlur=0;}
function overlay(title,tc,s1,s2,sub){
  const g=ctx.createLinearGradient(0,0,0,vh);g.addColorStop(0,'rgba(0,0,0,.2)');g.addColorStop(1,'rgba(0,0,0,.75)');
  ctx.fillStyle=g;ctx.fillRect(0,0,vw,vh);ctx.textAlign="center";
  txt(title,vw/2,vh/2-25,`bold 5.5vw sans-serif`,tc,25,tc);
  txt(s1,vw/2,vh/2+30,`2.2vw monospace`,"#fff");
  txt(s2,vw/2,vh/2+70,`1.6vw monospace`,"#8899aa");
  txt(sub,vw/2,vh/2+140,`bold 1.3vw monospace`,"#00ffcc",10,"#00ffcc");
}
function drawMenu(){
  const g=ctx.createRadialGradient(vw/2,vh/2,0,vw/2,vh/2,Math.max(vw,vh)*.6);g.addColorStop(0,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,.1)');
  ctx.fillStyle=g;ctx.fillRect(0,0,vw,vh);
  const L=vw/2-150;
  ctx.textAlign="center";
  txt("FLIGHT COMMAND",vw/2,vh*.22,`bold ${Math.min(vw*.06,76)}px monospace`,"#00ffcc",25,"#00ffcc");
  txt("SECTOR DEFENSE PROTOCOL ONLINE",vw/2,vh*.22+34,`bold 15px monospace`,"#fff");
  buttons[1].t="CAMERA: "+(cam.on?"ON":"OFF");
  buttons[4].t="SOUND: "+(sfxOn?"ON":"OFF");
  buttons.forEach((b,i)=>{
    b.x=L;b.y=vh*.42+i*72;b.w=300;b.h=54;
    const col=(b.a==="camera"&&cam.on)?"#ffee00":"#00ffaa";
    ctx.fillStyle="rgba(0,20,30,.75)";ctx.fillRect(b.x,b.y,b.w,b.h);
    ctx.strokeStyle=col;ctx.lineWidth=3;ctx.strokeRect(b.x,b.y,b.w,b.h);
    ctx.textAlign="center";txt(b.t,b.x+b.w/2,b.y+35,`bold 20px monospace`,col);ctx.textAlign="left";
  });
  ctx.textAlign="center";if(cam.msg)txt(cam.msg,vw/2,vh-95,`bold 15px monospace`,"#ffee00");
  txt("C: CAMERA  |  L: KEYBINDS  |  P/ESC: PAUSE  |  R: RESTART  |  M: SOUND",vw/2,vh-60,`bold 14px monospace`,"#88aaee");
}
function drawKeys(){
  const S=[
    {h:'FLIGHT',r:[['WASD','Move (or arrow keys)'],['SPACE','Fire (hold to repeat)'],['MOUSE','Aim (or click to fire)'],['C','Webcam aim + fire']]},
    {h:'SYSTEM',r:[['P / ESC','Pause'],['R','Restart run'],['Q','Main menu'],['M','Mute or unmute sound'],['L','Show/hide this list']]}
  ];
  const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();};
  const two=vw>=760,W=Math.min(vw-32,820),pad=30,gap=28,rowH=vh<680?36:44,secH=38,headH=78,footH=50;
  const colW=two?(W-pad*2-gap)/2:W-pad*2,cols=two?S.map(s=>[s]):[S];
  ctx.font='bold 13px monospace';
  const kw=Math.max(...S.flatMap(s=>s.r.map(q=>ctx.measureText(q[0]).width)))+20;
  const bodyH=Math.max(...cols.map(c=>c.reduce((a,s)=>a+secH+s.r.length*rowH,0)));
  const H=headH+bodyH+footH,X=(vw-W)/2,Y=Math.max(12,(vh-H)/2);
  ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(0,0,vw,vh);
  rr(X,Y,W,H,14);ctx.fillStyle='rgba(0,14,24,.95)';ctx.fill();
  ctx.strokeStyle='#00ffcc';ctx.lineWidth=2;ctx.stroke();
  ctx.textAlign='center';txt('KEYBINDS',vw/2,Y+48,'bold 26px monospace','#00ffcc',16,'#00ffcc');
  cols.forEach((col,ci)=>{
    const x0=X+pad+ci*(colW+gap);
    let y=Y+headH;
    col.forEach(s=>{
      ctx.textAlign='left';txt(s.h,x0,y+20,'bold 13px monospace','#7fffe6',0);
      ctx.fillStyle='rgba(0,255,204,.35)';ctx.fillRect(x0,y+28,colW,1);
      y+=secH;
      s.r.forEach(q=>{
        const ky=y+(rowH-26)/2;
        rr(x0,ky,kw,26,6);ctx.fillStyle='rgba(0,255,204,.1)';ctx.fill();ctx.strokeStyle='rgba(0,255,204,.7)';ctx.lineWidth=1.2;ctx.stroke();
        ctx.textAlign='center';txt(q[0],x0+kw/2,ky+17,'bold 13px monospace','#00ffcc',0);
        ctx.textAlign='left';txt(q[1],x0+kw+14,y+rowH/2+5,'14px monospace','#e6f7ff',0);
        y+=rowH;
      });
    });
  });
  ctx.textAlign='center';txt('PRESS L OR CLICK ANYWHERE TO CLOSE',vw/2,Y+H-20,'bold 13px monospace','#00ffaa',0);
}
function drawHUD(){
  ctx.clearRect(0,0,vw,vh);
  if(keybindsMenu)return drawKeys();
  if(menu)return drawMenu();
  ctx.textAlign="left";
  txt(`SYSTEM MONITOR S-0${lvl}`,20,35,`13px monospace`,"rgba(0,255,255,.9)");
  txt(`TOTAL VAL SCORE : ${score}`,20,52,`13px monospace`,"rgba(0,255,255,.9)");
  if(boss){
    txt(`ALERT: CAPITAL ANOMALY DETECTED`,20,72,`13px monospace`,"#ff0055");
    ctx.fillStyle="rgba(255,0,85,.2)";ctx.fillRect(vw/2-210,22,420,8);
    ctx.fillStyle="#ff0055";ctx.fillRect(vw/2-210,22,420*Math.max(0,boss.hp/boss.mhp),8);
  }else{
    txt(`HOSTILE REMNANTS: ${Math.max(0,tReq-tDest)}`,20,72,`13px monospace`,"rgba(255,160,0,.9)");
    ctx.fillStyle="#112233";ctx.fillRect(20,85,150,5);
    ctx.fillStyle="#ffa500";ctx.fillRect(20,85,150*Math.min(1,tDest/tReq),5);
  }
  txt(`NEXT BOSS IN: ${Math.max(0,Math.ceil(60-(gTime-lBoss)))}s`,20,boss?92:105,`13px monospace`,"#88aaee");
  const hp=Math.max(0,p.hp/p.mhp);
  ctx.fillStyle="rgba(255,255,255,.05)";ctx.fillRect(vw-210,25,190,22);
  ctx.fillStyle=hp>.35?"#00ffaa":"#ff2244";ctx.fillRect(vw-210,25,190*hp,22);
  ctx.strokeStyle="rgba(0,255,255,.4)";ctx.lineWidth=1;ctx.strokeRect(vw-210,25,190,22);
  ctx.textAlign="center";txt(`HULL MATRIX: ${Math.round(Math.max(0,p.hp))}%`,vw-115,40,`bold 11px monospace`,"#000",0);
  ctx.textAlign="left";txt(paused?"[ PLAY ]":"[ PAUSE ]",20,vh-20,`bold 14px monospace`,paused?"#00ffcc":"#ff5555");txt("[ MENU ]",170,vh-20,`bold 14px monospace`,"#88aaee");
  if(isWarp&&!over){ctx.textAlign="center";txt(`WARPING TO SECTOR 0${lvl+1}`,vw/2,vh/2,`bold 4vw monospace`,"#00ffcc",20,"#00ffcc");}
  drawCamPreview();
  if(over)overlay("CRITICAL CORE FAILURE","#ff2244",`TOTAL SCORE: ${score}`,"SYSTEM OFFLINE - CORES DESTROYED","PRESS “R” OR SPACE TO RETURN TO MENU");
  else if(paused)overlay("COMMAND INTERCEPT PAUSED","#00f0ff",`SECTOR LEVEL 0${lvl}`,`CURRENT SCORE: ${score}`,"PRESS “P”, “ESC” OR CLICK PAUSE TO RESUME");
}

/* ===== MAIN LOOP ===== */
function loop(){
  T++;
  const live=!(menu||keybindsMenu||paused||over);
  ambient(live);
  if(live)step();
  if(over&&(keys['r']||keys[' '])&&Date.now()-overAt>800){resetGame();menu=true;}
  shake*=.9;
  stepBg(live);
  stepFx();
  placeShip();
  placeCam();
  R.render(scene,camera);
  drawHUD();
  requestAnimationFrame(loop);
}
loop();
</script>
</body>
</html>
