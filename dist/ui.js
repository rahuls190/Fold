'use strict';
let INFO_EXTRA={};
/* Foldlight Studio · step-flow interface: Advanced switch, visual pattern picker, mount cards,
   colour swatches, section stack and the print-check pill. Geometry and state live in app.js. */
(function(){
const store={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}}};

/* ---------- Advanced switch ---------- */
const adv=$('advToggle');
const setAdv=on=>{document.body.classList.toggle('adv-on',on);adv.checked=on;store.set('foldlight.adv',on?'1':'0');};
setAdv(store.get('foldlight.adv')==='1');
adv.onchange=()=>setAdv(adv.checked);

/* ---------- steps ---------- */
const goStep=key=>{const b=document.querySelector('[data-tab="'+key+'"]');if(b)b.click();const p=$('panel');if(getComputedStyle(p).overflowY==='auto')p.scrollTop=0;else p.scrollIntoView({behavior:'smooth',block:'start'});};
document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>goStep(b.dataset.next));
document.querySelectorAll('[data-tab]').forEach(b=>{const old=b.onclick;b.onclick=e=>{old&&old(e);if(b.dataset.tab==='pattern'){closePicker();drawSummary();}};});

/* ---------- starting shapes: add the floor lamp as a card ---------- */
{const t=document.createElement('button');t.className='preset towercard';t.innerHTML='<svg viewBox="0 0 50 50" aria-hidden="true"><g fill="#c9d2bf" stroke="#7d9470" stroke-width="1"><rect x="17" y="35" width="16" height="12" rx="1"/><rect x="18" y="24" width="14" height="10" rx="1"/><rect x="18" y="13" width="14" height="10" rx="1"/><path d="M14 12 L36 12 L31 3 L19 3 Z"/></g></svg>';t.append(document.createTextNode('Floor lamp · 5 sections'));t.onclick=()=>$('towerPreset').click();$('presetList').append(t);}

/* ---------- colour swatches ---------- */
const COLOURS=[['#f1ece2','Ivory'],['#dcc7a7','Sand'],['#c29276','Terracotta'],['#e4cfc4','Blush'],['#a9b8a0','Sage'],['#7f8f86','Slate'],['#3a3f3b','Charcoal']];
const sw=$('swatches');
for(const [c,name] of COLOURS){const b=document.createElement('button');b.className='swatch';b.style.background=c;b.title=name;b.setAttribute('aria-label','Colour '+name);b.onclick=()=>mutate(()=>part().color=c);sw.append(b);}
sw.append($('colour'));
const syncSwatches=()=>{const c=(part().color||'').toLowerCase();sw.querySelectorAll('.swatch').forEach((b,i)=>b.classList.toggle('on',COLOURS[i][0]===c));};

/* ---------- pattern catalogue ---------- */
const CATS=[
 ['Folds',[['reverse','Reverse fold'],['pleats','Sharp pleats'],['flutes','Soft flutes'],['ripple','Rounded ribs'],['none','Plain']]],
 ['Relief textures',[['squares','Square grid'],['hexagon','Honeycomb'],['brick','Brick'],['dimples','Dimples'],['knurl','Diamond knurl'],['fishscale','Fish scale'],['basket','Basket weave'],['ripples','Diagonal ripples'],['waves','Waves'],['reeded','Reeded flutes'],['voronoi','Voronoi cells'],['cracked','Cracked earth'],['noise','Soft noise'],['wood','Wood grain']]],
 ['Cut-outs',[['pierced','Pierced holes'],['nervous','Voronoi lattice']]],
 ['Light',[['litho','Lithophane']]],
 ['Origami studies',[['yoshimura','Yoshimura'],['kresling','Kresling'],['miura','Miura'],['waterbomb','Waterbomb'],['resch','Ron Resch'],['curved','Curved crease'],['eggbox','Eggbox']]]];
/* Nojima, tucks and Miura divots looked almost the same as their neighbours, so they are no longer offered; older projects still open */
INFO_EXTRA={nojima:'Nojima helix',tucks:'Tucks',divots:'Miura divots'};
const INFO={};for(const [cat,list] of CATS)for(const [k,n] of list)INFO[k]={cat,name:n};for(const [k,n] of Object.entries(INFO_EXTRA))INFO[k]={cat:'Origami studies',name:n};
const BASIC=['reverse','pleats','flutes','ripple','none'];
const pick=key=>{if(BASIC.includes(key))mutate(()=>{part().pattern=key;});else chooseFamily(key);closePicker();drawSummary();};

/* ---------- thumbnails ---------- */
const TW=120,TH=90,cache=new Map();
const L=(()=>{const v=[-.45,.55,.7],l=Math.hypot(...v);return v.map(x=>x/l);})();
function heightThumb(kind){const cv=document.createElement('canvas');cv.width=TW;cv.height=TH;const g=cv.getContext('2d'),img=g.createImageData(TW,TH),d=img.data;
 const src=kind==='squares'?'tiles':kind==='pierced'?'hexagon':kind==='nervous'?'webcells':kind==='litho'?'hexagon':kind,sx=src==='brick'?2.2:src==='tiles'?3:src==='reeded'?4:src==='wood'||src==='noise'?6:3.2,sy=sx*TH/TW;
 const W=TW+1,H=TH+1,h=new Float32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++)h[y*W+x]=E.texSample(src,1+x/TW*sx,1+(TH-y)/TH*sy,7);
 const pierce=kind==='pierced'||kind==='nervous',lit=kind==='litho',cut=.5;
 for(let y=0;y<TH;y++)for(let x=0;x<TW;x++){const i=y*W+x,v=h[i],o=4*(y*TW+x);let r,gg,b;
  if(pierce){const t=Math.min(1,Math.max(0,(v-cut)*12+.5));r=236+(58-236)*t;gg=231+(70-231)*t;b=219+(62-219)*t;}
  else if(lit){const t=v;r=120+t*135;gg=74+t*150;b=40+t*110;}
  else{const hx=(h[i+1]-v)*5,hb=(v-h[i+W])*5,l=Math.hypot(hx,hb,1),dot=Math.max(0,(hx*L[0]+hb*L[1]+L[2])/l),k=(.42+.62*dot)*(1-.16*v);r=238*k;gg=232*k;b=218*k;}
  d[o]=r;d[o+1]=gg;d[o+2]=b;d[o+3]=255;}
 g.putImageData(img,0,0);return cv;}
function meshThumb(kind){const cv=document.createElement('canvas');cv.width=TW;cv.height=TH;const g=cv.getContext('2d');g.fillStyle='#e9e6dc';g.fillRect(0,0,TW,TH);
 let m;try{const base={...copy(E.presets.drum),pattern:kind,count:8,rows:3,height:110,profile:kind==='reverse'?[[0,92],[.5,124],[1,92]]:[[0,104],[1,104]],depth:kind==='none'?0:9,crease:14,mount:'none',skew:.35,twist:0,rotation:0};m=E.build(base);}catch(e){return cv;}
 const V=m.vertices,th=.5,ph=.32,ct=Math.cos(th),st=Math.sin(th),cp=Math.cos(ph),sp=Math.sin(ph);
 const P=V.map(([x,y,z])=>{const X=x*ct-y*st,Y=x*st+y*ct,Z=z-55;return [X,Y*cp-Z*sp,Y*sp+Z*cp];});
 let mx=0,my=0;for(const p of P){mx=Math.max(mx,Math.abs(p[0]));my=Math.max(my,Math.abs(p[2]));}const sc=Math.min(TW*.44/mx,TH*.44/my);
 const tris=[];for(const f of m.faces){const [a,b,c]=f.map(i=>P[i]);const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;if(ny>0)continue;tris.push([a[1]+b[1]+c[1],a,b,c,nx,ny,nz]);}
 tris.sort((p,q)=>q[0]-p[0]);const Ld=[-.5,-.75,.45],ll=Math.hypot(...Ld);
 for(const [,a,b,c,nx,ny,nz] of tris){const dot=Math.max(0,(nx*Ld[0]+ny*Ld[1]+nz*Ld[2])/ll),k=.38+.66*dot,col='rgb('+Math.round(236*k)+','+Math.round(229*k)+','+Math.round(212*k)+')';g.fillStyle=col;g.strokeStyle=col;g.lineWidth=.6;g.beginPath();g.moveTo(TW/2+a[0]*sc,TH/2-a[2]*sc);g.lineTo(TW/2+b[0]*sc,TH/2-b[2]*sc);g.lineTo(TW/2+c[0]*sc,TH/2-c[2]*sc);g.closePath();g.fill();g.stroke();}
 return cv;}
const TEXLIKE=k=>E.TEXKINDS.includes(k)||k==='squares';
function thumb(kind){if(!cache.has(kind))cache.set(kind,TEXLIKE(kind)?heightThumb(kind):meshThumb(kind));const src=cache.get(kind),cv=document.createElement('canvas');cv.width=TW;cv.height=TH;cv.getContext('2d').drawImage(src,0,0);return cv;}

/* ---------- summary card + picker ---------- */
const sum=$('patternSummary'),picker=$('patternPicker'),body=$('patternBody');
function drawSummary(){const k=part().pattern,info=INFO[k]||{name:k==='vase'?'Vessel (older project)':(E.families[k]?.name||k),cat:k==='vase'?'Vessel':'Pattern'};sum.replaceChildren();if(k!=='vase')sum.append(thumb(k));const t=document.createElement('div'),b=document.createElement('b'),s=document.createElement('small');b.textContent=info.name;s.textContent=info.cat;t.append(b,s);const c=document.createElement('button');c.textContent='Change';c.onclick=openPicker;sum.append(t,c);}
let built=false;
function buildPicker(){picker.replaceChildren();const head=document.createElement('div');head.className='pickhead';const hb=document.createElement('b');hb.textContent='Choose a pattern';const done=document.createElement('button');done.className='mini';done.textContent='Close';done.onclick=closePicker;head.append(hb,done);picker.append(head);
 const queue=[];
 for(const [cat,list] of CATS){const h=document.createElement('div');h.className='cat';h.textContent=cat;picker.append(h);const grid=document.createElement('div');grid.className='pgrid';
  for(const [k,n] of list){const b=document.createElement('button');b.className='pcard';b.dataset.k=k;b.title=E.families[k]?.description||n;const ph=document.createElement('canvas');ph.width=TW;ph.height=TH;const s=document.createElement('span');s.textContent=n;b.append(ph,s);b.onclick=()=>pick(k);grid.append(b);queue.push([b,k]);}
  picker.append(grid);}
 /* draw thumbnails a few at a time so the panel opens at once */
 const step=()=>{const t0=performance.now();while(queue.length&&performance.now()-t0<24){const [b,k]=queue.shift();b.querySelector('canvas').replaceWith(thumb(k));}if(queue.length)setTimeout(step,0);};step();built=true;}
function openPicker(){if(!built)buildPicker();picker.querySelectorAll('.pcard').forEach(b=>b.classList.toggle('on',b.dataset.k===part().pattern));sum.hidden=true;body.hidden=true;picker.hidden=false;document.querySelectorAll('#pattern>.next').forEach(n=>n.hidden=true);}
function closePicker(){picker.hidden=true;sum.hidden=false;body.hidden=false;document.querySelectorAll('#pattern>.next').forEach(n=>n.hidden=false);}

/* ---------- mounting cards ---------- */
const MOUNTS=[['none','Open both ends','<path d="M10 6 L34 6 L38 36 L6 36 Z" fill="#c9d2bf" stroke="#7d9470"/>'],['bottom','Plate at the bottom','<path d="M10 6 L34 6 L38 36 L6 36 Z" fill="#c9d2bf" stroke="#7d9470"/><rect x="6" y="33" width="32" height="4" fill="#355b44"/><rect x="18" y="33" width="8" height="4" fill="#f4f1e8"/>'],['top','Plate at the top','<path d="M10 6 L34 6 L38 36 L6 36 Z" fill="#c9d2bf" stroke="#7d9470"/><rect x="10" y="5" width="24" height="4" fill="#355b44"/><rect x="18" y="5" width="8" height="4" fill="#f4f1e8"/>']];
const mc=$('mountCards');
for(const [v,label,svg] of MOUNTS){const b=document.createElement('button');b.dataset.v=v;b.innerHTML='<svg viewBox="0 0 44 40" aria-hidden="true">'+svg+'</svg>';b.append(document.createTextNode(label));b.onclick=()=>{$('mountType').value=v;$('mountType').dispatchEvent(new Event('change'));};mc.append(b);}
const syncMount=()=>mc.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.v===part().mount);b.disabled=part().pattern==='hypar'&&b.dataset.v!=='none';});

/* ---------- floor grid on / off (remembered on this device) ---------- */
{const b=$('gridBtn');let on=store.get('foldlight.grid')!=='0';const apply=()=>{if(grid)grid.visible=on;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));};
 b.onclick=()=>{on=!on;store.set('foldlight.grid',on?'1':'0');apply();};apply();}

/* ---------- mesh smoothing (Loop subdivision in the engine) ---------- */
$('subSel').onchange=()=>mutate(()=>{part().subdiv=+$('subSel').value;});
$('subMode').onchange=()=>mutate(()=>{part().subAngle=$('subMode').value==='round'?90:40;});
function syncSub(){const m=part();$('subSel').value=String(m.subdiv||0);$('subMode').value=(m.subAngle||35)>=85?'round':'sharp';$('subMode').disabled=!m.subdiv;const host=$('subControls');host.replaceChildren();if(m.subdiv){numControl('subControls','Sharp edge angle · °','subAngle',5,90,1);host.lastChild.classList.add('adv');}}
function subInfo(){const m=part(),mesh=models[selected],el=$('subInfo');if(!m.subdiv||!mesh){el.textContent='Subdivision rounds the surface for a smoother print. Rims and mounting plates stay flat.';return;}
 el.textContent=(mesh.subdivApplied<m.subdiv?'Limited to ×'+mesh.subdivApplied+' so the mesh stays under 600,000 triangles. ':'Smoothed ×'+mesh.subdivApplied+'. ')+mesh.report.triangles.toLocaleString()+' triangles. Rims and mounting plates stay flat; check the print check for any surface crossings.';}
/* while a slider or profile point is being dragged the preview skips smoothing; rebuild smoothed on release */
document.addEventListener('change',e=>{if(e.target&&e.target.type==='range'&&project.parts.some(p=>p.subdiv>0))changed();});
$('profile').addEventListener('pointerup',()=>{if(project.parts.some(p=>p.subdiv>0))setTimeout(changed,0);});

/* ---------- export shortcuts ---------- */
$('quickStl').onclick=()=>$('stl').click();
$('moreExport').onclick=()=>$('exportBtn').click();

/* ---------- print-check pill ---------- */
const pill=$('checkPill');
pill.onclick=()=>goStep('print');
function afterMetrics(){subInfo();const list=$('checkList'),bad=list.querySelectorAll('.check.bad').length,warn=list.querySelectorAll('.check.warn').length,pend=list.querySelectorAll('.check.pending').length;
 pill.className='pill'+(bad?' bad':warn?' warn':pend?' pending':'');$('pillText').textContent=bad?'Fix before printing':warn?warn+' to review':pend?'Checking…':'Ready to print';
 $('quickStl').disabled=$('stl').disabled;}

/* ---------- sections ---------- */
$('addSection2').onclick=()=>$('addPart').click();
function afterParts(){$('modeButtons').hidden=project.parts.length<2;$('multiTools').hidden=project.parts.length<2;$('addSection2').disabled=project.parts.length>=12;if(project.parts.length<2&&mode!=='part'){mode='part';setMode();}}

/* ---------- hooks into app.js renders ---------- */
const _editor=renderEditor,_metrics=updateMetrics,_parts=renderParts;
renderEditor=function(){_editor();afterEditor();};
updateMetrics=function(){_metrics();afterMetrics();};
renderParts=function(){_parts();afterParts();};
function afterEditor(){syncSwatches();syncMount();syncSub();if(!$('pattern').hidden&&picker.hidden)drawSummary();if(!picker.hidden)openPicker();}
window.uiAfterMetrics=afterMetrics;
afterEditor();afterMetrics();afterParts();drawSummary();
})();
