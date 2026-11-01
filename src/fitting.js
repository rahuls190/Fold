'use strict';
/* Foldlight Studio · light fitting preview: a lampholder and bulb drawn inside the shade, with size checks.
   Socket and bulb sizes are typical catalogue values; IKEA figures (height, base, cord, load, wattage) come
   from IKEA's product pages. Always confirm against the real part. */
(function(){
const BULBS={
 A60:{name:'A60 classic',D:60,L:108,shape:'A'},
 G80:{name:'G80 globe',D:80,L:120,shape:'G'},
 G95:{name:'G95 globe',D:95,L:138,shape:'G'},
 G125:{name:'G125 globe',D:125,L:172,shape:'G'},
 ST64:{name:'ST64 Edison',D:64,L:143,shape:'ST'},
 P45:{name:'P45 golf ball',D:45,L:80,shape:'G'},
 C35:{name:'C35 candle',D:35,L:98,shape:'C'}};
const CAPS={
 E27:{label:'E27 / E26',r:13.5,len:25,body:[40,65],ring:57,hole:41,bulbs:['A60','G80','G95','G125','ST64','P45']},
 E14:{label:'E14 / E12',r:7,len:20,body:[29,45],ring:42,hole:29,bulbs:['C35','P45']},
 B22:{label:'B22 bayonet',r:11,len:22,body:[40,65],ring:46,hole:27,bulbs:['A60','G95','P45']}};
const IK='https://www.ikea.com/ae/en/p/';
const FITS=[
 ['Standard lampholders',[
  {id:'e27',name:'E27 / E26 lampholder with shade ring',cap:'E27',kind:'socket'},
  {id:'e14',name:'E14 / E12 lampholder with shade ring',cap:'E14',kind:'socket'},
  {id:'b22',name:'B22 bayonet lampholder with shade ring',cap:'B22',kind:'socket'}]],
 ['IKEA pendant cord sets',[
  {id:'hemma',name:'HEMMA cord set · 1.8 m',cap:'E27',kind:'pendant',cord:1.8,load:1.8,watt:22,url:IK+'hemma-cord-set-white-10386577/'},
  {id:'sunneby',name:'SUNNEBY cord set · 1.8 m',cap:'E27',kind:'pendant',cord:1.8,load:1.8,watt:22,url:IK+'sunneby-cord-set-black-textile-90420129/'},
  {id:'havsdjup',name:'HAVSDJUP cord set · 1.4 m',cap:'E27',kind:'pendant',cord:1.4,load:1.5,watt:16,url:IK+'havsdjup-cord-set-white-40582124/'},
  {id:'jallby',name:'JÄLLBY cord set · 1.4 m',cap:'E27',kind:'pendant',cord:1.4,url:IK+'jaellby-cord-set-textile-brass-plated-80466368/'},
  {id:'skaftetcord',name:'SKAFTET cord set · 1.4 m',cap:'E27',kind:'pendant',cord:1.4,url:IK+'skaftet-cord-set-textile-nickel-plated-70466364/'}]],
 ['IKEA table lamp bases',[
  {id:'skaftet30',name:'SKAFTET table base · 30 cm',cap:'E14',kind:'base',height:300,foot:150,watt:8.6,url:IK+'skaftet-table-lamp-base-nickel-plated-10405953/'},
  {id:'skaftet38',name:'SKAFTET table base · 38 cm',cap:'E27',kind:'base',height:380,foot:290,watt:13,url:IK+'skaftet-table-lamp-base-nickel-plated-20405962/'}]],
 ['IKEA floor lamp bases',[
  {id:'skaftetfloor',name:'SKAFTET floor base · 130 cm',cap:'E27',kind:'base',height:1300,foot:290,watt:13,url:IK+'skaftet-floor-lamp-base-brass-colour-70405969/'},
  {id:'kryssmast',name:'KRYSSMAST floor base · 138 cm',cap:'E27',kind:'base',height:1380,foot:300,watt:13,url:IK+'kryssmast-floor-lamp-base-nickel-plated-80405718/'},
  {id:'skaftetarc',name:'SKAFTET arched floor base · 214 cm (hanging)',cap:'E27',kind:'pendant',arched:true,watt:13,url:IK+'skaftet-floor-lamp-base-arched-black-70405525/'}]]];
const BYID={};for(const [,list] of FITS)for(const f of list)BYID[f.id]=f;
const clean=x=>({id:BYID[x?.id]?x.id:'',bulb:BULBS[x?.bulb]?x.bulb:'',show:x?.show!==false,stand:!!x?.stand,xray:x?.xray!==false});
const st=()=>{project.fitting=clean(project.fitting);return project.fitting;};

/* ---------- panel controls ---------- */
const fs=$('fitSel'),bs=$('bulbSel');
{const o=document.createElement('option');o.value='';o.textContent='None · no bulb preview';fs.append(o);
 for(const [g,list] of FITS){const og=document.createElement('optgroup');og.label=g;for(const f of list){const o=document.createElement('option');o.value=f.id;o.textContent=f.name;og.append(o);}fs.append(og);}}
const fill=()=>{const F=st(),f=BYID[F.id];bs.replaceChildren();bs.disabled=!f;$('fitShow').disabled=!f;$('standShow').checked=F.stand;$('fitShow').checked=F.show;$('xrayShow').checked=F.xray;$('xrayShow').disabled=!f;
 $('standField').hidden=!f||f.kind==='socket';$('standShow').parentElement.lastChild.textContent=f&&f.kind==='base'?' Show the lamp base':' Show the cord';
 if(!f){const o=document.createElement('option');o.textContent='Choose a fitting first';bs.append(o);fs.value='';return;}
 for(const k of CAPS[f.cap].bulbs){const b=BULBS[k],o=document.createElement('option');o.value=k;o.textContent=b.name+' · Ø'+b.D+' × '+b.L+' mm';bs.append(o);}
 fs.value=F.id;bs.value=F.bulb;};
/* the section the fitting sits in: hanging fittings at the top of the stack, bases at the bottom */
function target(f){const P=project.parts;if(f.kind==='pendant')return P.length-1;if(f.kind==='base')return 0;let i=P.findIndex(m=>m.mount!=='none'&&m.pattern!=='hypar');return i<0?P.length-1:i;}
const orient=(f,m)=>f.kind==='base'||(f.kind==='socket'&&m.mount==='bottom')?'up':'down';
fs.onchange=()=>{const f=BYID[fs.value];mutate(()=>{const F=st();F.id=f?f.id:'';if(!f)return;if(!CAPS[f.cap].bulbs.includes(F.bulb))F.bulb=CAPS[f.cap].bulbs[0];F.show=true;
  const i=target(f),m=project.parts[i];if(m.pattern==='hypar')return;const want=f.kind==='pendant'?'top':f.kind==='base'?'bottom':(m.mount==='none'?'top':m.mount);m.mount=want;m.noHole=false;m.hole=CAPS[f.cap].hole;});
 if(f){const i=target(f),m=project.parts[i];toast('Section '+String(i+1).padStart(2,'0')+': '+(m.mount==='top'?'top':'bottom')+' plate with a Ø'+m.hole+' mm hole for the '+CAPS[f.cap].label+' shade ring. Undo restores the old plate.');}
 if(project.parts.length>1){mode='assembly';}setMode();};
bs.onchange=()=>mutate(()=>{st().bulb=bs.value;},false);
$('fitShow').onchange=()=>{mutate(()=>{st().show=$('fitShow').checked;},false);setMode();};
$('xrayShow').onchange=()=>{mutate(()=>{st().xray=$('xrayShow').checked;},false);};
$('standShow').onchange=()=>{mutate(()=>{st().stand=$('standShow').checked;},false);setMode();};

/* ---------- geometry ---------- */
/* bulb glass radius at t (0 = neck at the cap, 1 = tip) along a glass length Lg */
function glassR(b,t,rn,Lg){const R=b.D/2;
 if(b.shape==='G'){const z=t*Lg,c=Lg-R,rs=Math.sqrt(Math.max(0,R*R-(z-c)*(z-c)));return z<c?Math.max(rs,rn):rs;}
 if(b.shape==='C'){if(t<.06)return rn+(R-rn)*t/.06;if(t<.58)return R;return R*Math.pow(Math.max(0,1-(t-.58)/.42),.75);}
 const tm=b.shape==='ST'?.72:.6,t0=b.shape==='ST'?.18:0;if(t<t0)return rn;if(t<tm)return rn+(R-rn)*Math.sin(Math.PI/2*(t-t0)/(tm-t0));return R*Math.sqrt(Math.max(0,1-((t-tm)/(1-tm))**2));}
function layout(){const F=st(),f=BYID[F.id];if(!f||!F.bulb)return null;const i=target(f),m=project.parts[i],mesh=models[i];if(!m||!mesh)return null;
 const cap=CAPS[f.cap],b=BULBS[F.bulb],up=orient(f,m)==='up',H=m.height,plate=m.mount!=='none'?m.plate:0,P=up?plate:H-plate,Lg=b.L-cap.len;
 const sTop=up?P+20:P-20+cap.body[1],sBot=up?P+20-cap.body[1]:P-20,g0=up?P+20:P-20,dir=up?1:-1;
 return {F,f,i,m,mesh,cap,b,up,H,P,Lg,sTop,sBot,g0,dir};}
function clearance(L){const bins=new Map(),bw=2;for(const v of L.mesh.vertices){const k=Math.floor(v[2]/bw),r=Math.hypot(v[0],v[1]);const o=bins.get(k);if(o===undefined||r<o)bins.set(k,r);}
 let best=Infinity,at=0,out=0;const rn=L.cap.r+2;for(let s=0;s<=60;s++){const t=s/60,z=L.g0+L.dir*t*L.Lg,rb=glassR(L.b,t,rn,L.Lg);if(z<0||z>L.H){out=Math.max(out,z<0?-z:z-L.H);continue;}
  let rmin=Infinity;for(let d=-1;d<=1;d++){const o=bins.get(Math.floor(z/bw)+d);if(o!==undefined)rmin=Math.min(rmin,o);}if(rmin===Infinity)continue;const c=rmin-rb;if(c<best){best=c;at=z;}}
 return {mm:best,z:at,out};}

/* ---------- 3D ---------- */
let drawn=null;
function addFitting(){drawn=null;if(!renderer||!group)return;if(grid)grid.position.y=-.4;const L=layout();if(!L||!L.F.show)return;
 if(mode==='part'&&selected!==L.i)return;let y=0;if(mode!=='part')for(let k=0;k<L.i;k++)y+=project.parts[k].height+(mode==='exploded'?55:0);
 const T=THREE,G=new T.Group();G.name='light-fitting';G.position.y=y;
 const dark=new T.MeshStandardMaterial({color:0x2f3331,roughness:.55,metalness:.1}),metal=new T.MeshStandardMaterial({color:0xb8b6ad,roughness:.35,metalness:.7});
 const cyl=(r,y0,y1,mat,seg=40)=>{const g=new T.CylinderGeometry(r,r,Math.abs(y1-y0),seg);const o=new T.Mesh(g,mat);o.position.y=(y0+y1)/2;G.add(o);return o;};
 cyl(L.cap.body[0]/2,L.sBot,L.sTop,dark);
 if(L.m.mount!=='none'){const rz=L.up?L.P+1.5:L.P-1.5;cyl(L.cap.ring/2,rz-1.5,rz+1.5,dark);}
 cyl(L.cap.r,L.g0-L.dir*L.cap.len,L.g0,metal,28);
 const rn=L.cap.r+2,pts=[];for(let s=0;s<=48;s++){const t=s/48;pts.push(new T.Vector2(Math.max(.01,glassR(L.b,t,rn,L.Lg)),L.g0+L.dir*t*L.Lg));}if(!L.up)pts.reverse();
 const glass=new T.Mesh(new T.LatheGeometry(pts,48),new T.MeshStandardMaterial({color:0xfffbf2,transparent:true,opacity:lit?.85:.42,roughness:.12,metalness:0,emissive:lit?0xfff4dc:0x000000,emissiveIntensity:lit?2.2:0,side:T.DoubleSide,depthWrite:false}));glass.renderOrder=2;G.add(glass);
 let floorY=null;
 if(L.F.stand&&L.f.kind==='base'){const top=L.sBot,fl=L.sTop-L.f.height;cyl(6,fl+14,top,metal,20);cyl(L.f.foot/2,fl,fl+14,metal,64);floorY=y+fl;if(grid)grid.position.y=floorY-.4;}
 if(L.F.stand&&L.f.kind==='pendant'){if(L.f.arched){const arm=new T.Mesh(new T.TorusGeometry(260,6,10,48,Math.PI/2),metal);arm.rotation.z=0;arm.position.set(-260,L.sTop,0);G.add(arm);}else{cyl(3,L.sTop,L.sTop+420,dark,12);cyl(55,L.sTop+420,L.sTop+445,dark,48);}}
 if(L.F.xray)for(const o of group.children)if(o.isMesh&&o.name!=='joint-sleeve'&&o.material){o.material.transparent=true;o.material.opacity=.32;o.material.depthWrite=false;o.renderOrder=3;}
 group.add(G);drawn={floorY};}
const _render=renderScene;renderScene=function(){_render();addFitting();};
const _fit=fit;fit=function(){_fit();if(!drawn||!camera)return;const box=new THREE.Box3().setFromObject(group),h=box.max.y-box.min.y,d=Math.max(box.max.x-box.min.x,box.max.z-box.min.z);orbit.target=(box.max.y+box.min.y)/2;const tf=Math.tan(Math.PI*35/360);orbit.distance=Math.max(h/2/tf,d/2/(tf*(camera.aspect||1)))*1.3+d*.4;if(grid)grid.scale.setScalar(Math.max(d/500,h/900,1));};

/* ---------- checks and info ---------- */
const info=$('fitInfo');
function fitChecks(){const L=layout(),host=$('checkList');info.replaceChildren();if(!L){fill();return;}
 const c=clearance(L),add=(text,type)=>{const s=document.createElement('span');s.className='check '+type;s.textContent=(type==='ok'?'✓ ':'! ')+text;host.append(s);};
 const ct=c.mm<10?'bad':c.mm<25?'warn':'ok';if(Number.isFinite(c.mm))add('Bulb to shade wall '+c.mm.toFixed(0)+' mm'+(ct==='ok'?' · LED bulbs only':ct==='warn'?' · close, use a low-watt LED':' · too close for a printed shade'),ct);
 if(c.out>1)add('Bulb sticks out '+c.out.toFixed(0)+' mm '+(L.up?'above':'below')+' the shade','warn');
 if(L.m.mount==='none')add('No mounting plate on section '+String(L.i+1).padStart(2,'0')+' for the '+L.cap.label+' shade ring','warn');
 else if(!L.m.noHole&&Math.abs(L.m.hole-L.cap.hole)>2)add('Plate hole Ø'+L.m.hole+' mm · the '+L.cap.label+' shade ring needs about Ø'+L.cap.hole+' mm','warn');
 let grams=0;for(const mm of models)if(mm)grams+=mm.report.volume/1000*(project.printer.material==='PLA'?1.24:1.27);
 if(L.f.load){const kg=grams/1000;add('Shade '+(kg).toFixed(2)+' kg · cord set holds '+L.f.load+' kg',kg<=L.f.load*.8?'ok':kg<=L.f.load?'warn':'bad');}
 /* refresh the summary and the pill */
 const n=host.querySelectorAll('.check.warn,.check.bad').length;$('checkSummary').textContent=n?n+' item'+(n===1?'':'s')+' to review':'Basic checks passed';
 const row=(k,v)=>{const d=document.createElement('div');const b=document.createElement('b');b.textContent=k+': ';d.append(b,document.createTextNode(v));info.append(d);};
 row('Socket',L.cap.label+' · body Ø'+L.cap.body[0]+' × '+L.cap.body[1]+' mm · shade ring needs a Ø'+L.cap.hole+' mm hole');
 row('Bulb',L.b.name+' · Ø'+L.b.D+' × '+L.b.L+' mm, '+(L.up?'pointing up':'hanging down'));
 if(Number.isFinite(c.mm))row('Clearance','closest point '+c.mm.toFixed(0)+' mm from the inner wall, '+(c.z).toFixed(0)+' mm up section '+String(L.i+1).padStart(2,'0'));
 if(L.f.kind!=='socket'){const parts=[];if(L.f.height)parts.push('height '+L.f.height/10+' cm');if(L.f.foot)parts.push('base Ø'+L.f.foot/10+' cm');if(L.f.cord)parts.push('cord '+L.f.cord+' m');if(L.f.load)parts.push('max load '+L.f.load+' kg');if(L.f.watt)parts.push('max '+L.f.watt+' W');row('Product',parts.join(' · '));}
 const s=document.createElement('span');s.className='src';s.textContent='Socket and bulb sizes are typical values; check your actual parts. Keep printed shades to LED bulbs. ';if(L.f.url){const a=document.createElement('a');a.href=L.f.url;a.target='_blank';a.rel='noopener';a.textContent='Product page ↗';s.append(a);}info.append(s);
 fill();}
const _um=updateMetrics;updateMetrics=function(){_um();try{fitChecks();}catch(e){console.error(e);}window.uiAfterMetrics&&uiAfterMetrics();};
fill();renderScene();updateMetrics();
})();
