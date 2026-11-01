/* Deterministic, indexed, closed-shell lampshade geometry. All units are mm. */
(function(root){
'use strict';
if(typeof module!=='undefined'&&!root.VaseEngine)root.VaseEngine=require('./vase-engine.js');
const presets={
 reference:{name:'Reverse-fold shade',height:335,profile:[[0,140.699],[0.5,314.227],[1,140.699]],pattern:'reverse',count:32,depth:9.391,crease:20,twist:0,wall:1.6,mount:'none',hole:42,plate:3,color:'#dcc7a7'},
 drum:{name:'Pleated drum',height:220,profile:[[0,210],[1,210]],pattern:'pleats',count:48,depth:6,twist:0,wall:1.6,mount:'bottom',hole:42,plate:3,color:'#e4dac8'},
 cone:{name:'Tapered shade',height:250,profile:[[0,280],[1,120]],pattern:'flutes',count:40,depth:6,twist:0,wall:1.6,mount:'top',hole:42,plate:3,color:'#c29276'},
 hourglass:{name:'Hourglass',height:280,profile:[[0,200],[0.5,90],[1,200]],curve:'smooth',pattern:'pleats',count:40,depth:5,twist:0,wall:1.6,mount:'none',hole:42,plate:3,color:'#aab6a0'},
 globe:{name:'Lantern',height:270,profile:[[0,100],[0.15,180],[0.35,250],[0.5,270],[0.65,250],[0.85,180],[1,100]],curve:'smooth',pattern:'flutes',count:48,depth:5,twist:0,wall:1.6,mount:'bottom',hole:42,plate:3,color:'#dcc7a7'}
};
const copy=x=>JSON.parse(JSON.stringify(x));
function clean(m){
 if(!m||typeof m!=='object')throw Error('Invalid section');
 const num=(k,a,b)=>{if(!Number.isFinite(m[k])||m[k]<a||m[k]>b)throw Error(k+' must be between '+a+' and '+b);};
 num('height',40,800);num('count',8,96);num('depth',0,30);num('twist',-90,90);num('wall',0.6,6);num('hole',8,100);num('plate',1,12);
 if(!Number.isInteger(m.count))throw Error('Pleat count must be a whole number');
 if(!['none','pleats','flutes','ripple','reverse','vase',...Object.keys(families)].includes(m.pattern))throw Error('Unknown pattern');
 if(m.planar===undefined)m.planar=false;if(typeof m.planar!=='boolean')throw Error('Invalid panel mode');
 if(m.curve===undefined)m.curve='linear';if(!['linear','smooth'].includes(m.curve))throw Error('Profile line must be straight or smooth');
 if(m.crease===undefined)m.crease=20;num('crease',0,80);
 for(const [k,d,a,b] of [['rotation',0,-360,360],['rows',6,2,100],['skew',.35,0,.8]]){if(m[k]===undefined)m[k]=d;num(k,a,b);}if(!Number.isInteger(m.rows))throw Error('Rows must be a whole number');
 if(m.relief===undefined)m.relief='in';if(!['in','out','both'].includes(m.relief))throw Error('Tiles must go in, out or both');if(m.bevel===undefined)m.bevel=.5;num('bevel',.1,.9);if(m.noHole===undefined)m.noHole=false;if(typeof m.noHole!=='boolean')throw Error('No-hole must be on or off');
 if(m.subdiv===undefined)m.subdiv=0;num('subdiv',0,2);if(!Number.isInteger(m.subdiv))throw Error('Subdivision must be 0, 1 or 2');if(m.subAngle===undefined)m.subAngle=35;num('subAngle',5,90);
 for(const [k,d,lo,hi] of [['seed',1,0,999],['fade',0,0,1],['split',.5,.1,.9],['slope',85,20,85],['cutoff',.5,.1,.9],['round',0,0,2]]){if(m[k]===undefined)m[k]=d;num(k,lo,hi);}if(!Number.isInteger(m.seed))throw Error('Seed must be a whole number');
 if(m.imgRep===undefined)m.imgRep=1;num('imgRep',1,12);if(!Number.isInteger(m.imgRep))throw Error('Image repeats must be a whole number');if(m.imgInvert===undefined)m.imgInvert=false;if(typeof m.imgInvert!=='boolean')throw Error('Image invert must be on or off');
 if(m.image===undefined)m.image=null;if(m.image!==null&&!(m.image&&Number.isInteger(m.image.w)&&Number.isInteger(m.image.h)&&m.image.w>1&&m.image.h>1&&typeof m.image.d==='string'))throw Error('Image data is invalid');
 if(m.fadeTo===undefined)m.fadeTo='top';if(!['top','bottom'].includes(m.fadeTo))throw Error('Fade must go to the top or bottom');
 if(m.pattern2===undefined)m.pattern2='';if(m.pattern2!==''&&!TEX_SOURCES.includes(m.pattern2))throw Error('Unknown second pattern');
 if(m.source===undefined)m.source='hexagon';if(!TEX_SOURCES.includes(m.source))throw Error('Unknown texture source');
 if(!['none','bottom','top'].includes(m.mount))throw Error('Unknown mounting option');
 if(!Array.isArray(m.profile)||m.profile.length<2||m.profile.length>12)throw Error('Use 2–12 profile points');
 m.profile.forEach((p,i)=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>1||p[1]<30||p[1]>600||(i&&p[0]-m.profile[i-1][0]<0.015))throw Error('Profile points must rise in height, with diameters from 30 to 600 mm');});
 if(m.creaseFlips!==undefined&&(!Array.isArray(m.creaseFlips)||m.creaseFlips.length!==m.profile.length||m.creaseFlips.some(x=>typeof x!=='boolean')))throw Error('Crease directions must match the profile points');
 if(m.profile[0][0]!==0||m.profile.at(-1)[0]!==1)throw Error('Profile must start at 0% and end at 100%');
 if(typeof m.name!=='string'||m.name.length>80)throw Error('Section name is invalid');
 if(!/^#[0-9a-f]{6}$/i.test(m.color))m.color='#dcc7a7';
 if(m.pattern==='vase')root.VaseEngine.clean(m);return m;
}
function radius(m,z){const u=z/m.height;if(m.curve==='smooth'&&m.profile.length>2)return smoothRadius(m.profile,Math.max(0,Math.min(1,u)));let i=1;while(i<m.profile.length-1&&m.profile[i][0]<u)i++;const a=m.profile[i-1],b=m.profile[i],t=(u-a[0])/(b[0]-a[0]);return (a[1]+(b[1]-a[1])*t)/2;}
/* Smooth profile: monotone cubic through the points (same curve as the vessel designer's smooth spline).
   It never overshoots between two points, so a waist point stays the narrowest diameter. */
function smoothRadius(pts,u){let i=0;while(i<pts.length-2&&pts[i+1][0]<u)i++;const a=pts[i],b=pts[i+1],h=b[0]-a[0],t=Math.max(0,Math.min(1,(u-a[0])/h));
 const d=pts.slice(1).map((p,j)=>(p[1]-pts[j][1])/(p[0]-pts[j][0]));const slope=k=>{if(k===0)return d[0];if(k===pts.length-1)return d.at(-1);if(d[k-1]*d[k]<=0)return 0;const h0=pts[k][0]-pts[k-1][0],h1=pts[k+1][0]-pts[k][0],w0=2*h1+h0,w1=h1+2*h0;return (w0+w1)/(w0/d[k-1]+w1/d[k]);};
 return ((2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*h*slope(i)+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*h*slope(i+1))/2;}
function profileRadius(m,u){return radius(m,u*m.height);}
function rawBuild(input){
 const m=clean(copy(input));if(m.pattern==='vase')return root.VaseEngine.build(m,{inspect});if(m.pattern==='pleats'&&m.planar)return planarPleats(m);if(m.pattern==='reverse')return reverseFold(m);if(families[m.pattern])return studyShell(m);
 const n=m.count*(m.pattern==='pleats'?2:8),v=[],f=[];
 const waves=(i)=>m.pattern==='none'?0:m.pattern==='pleats'?(i%2):m.pattern==='ripple'?Math.pow((1-Math.cos(i/n*m.count*Math.PI*2))/2,2):(1-Math.cos(i/n*m.count*Math.PI*2))/2;
 const ring=(z,inner=false,fixed=null)=>{const ids=[];for(let i=0;i<n;i++){let r=fixed===null?radius(m,z)-m.depth*waves(i)-(inner?m.wall:0):fixed;if(r<=2)throw Error('Pleat depth and wall thickness leave no opening. Increase diameter.');let a=i/n*Math.PI*2+m.twist*Math.PI/180*z/m.height;ids.push(v.length);v.push([r*Math.cos(a),r*Math.sin(a),z]);}return ids;};
 const join=(a,b,flip=false)=>{for(let i=0;i<n;i++){let j=(i+1)%n;let t=[[a[i],a[j],b[j]],[a[i],b[j],b[i]]];for(let q of t)f.push(flip?q.reverse():q);}};
 const N=m.curve==='smooth'?96:48,levels=(lo,hi)=>{let z=[lo,hi];for(let i=1;i<N;i++){let h=m.height*i/N;if(h>lo&&h<hi)z.push(h);}for(let p of m.profile){let h=p[0]*m.height;if(h>lo&&h<hi)z.push(h);}return [...new Set(z)].sort((a,b)=>a-b);};
 const outer=levels(0,m.height).map(z=>ring(z));for(let i=1;i<outer.length;i++)join(outer[i-1],outer[i]);
 const lo=m.mount==='bottom'?m.plate:0,hi=m.mount==='top'?m.height-m.plate:m.height;
 const inside=levels(lo,hi).map(z=>ring(z,true));for(let i=1;i<inside.length;i++)join(inside[i-1],inside[i],true);
 if(m.mount==='none'){join(outer[0],inside[0],true);join(outer.at(-1),inside.at(-1));}
 else {
  const bottom=m.mount==='bottom',z0=bottom?0:m.height,z1=bottom?lo:hi;
  const min=Math.min(...[z0,z1].map(z=>radius(m,z)-m.depth-m.wall));
  if(!m.noHole&&m.hole/2+2>min)throw Error('Mounting hole is too large for this opening. Leave at least 2 mm around it.');
  if(m.noHole){const o=bottom?outer[0]:outer.at(-1),i=bottom?inside[0]:inside.at(-1),capc=(r,z,flip)=>{const c=v.length;v.push([0,0,z]);for(let q=0;q<r.length;q++){const t=[c,r[q],r[(q+1)%r.length]];f.push(flip?t.reverse():t);}};capc(o,z0,bottom);capc(i,z1,!bottom);if(bottom)join(outer.at(-1),inside.at(-1));else join(outer[0],inside[0],true);}
  else{const h0=ring(z0,false,m.hole/2),h1=ring(z1,false,m.hole/2);
  if(bottom){join(outer[0],h0,true);join(h0,h1,true);join(inside[0],h1);join(outer.at(-1),inside.at(-1));}
  else {join(outer.at(-1),h0);join(h1,h0,true);join(inside.at(-1),h1,true);join(outer[0],inside[0],true);}}
 }
 const report=inspect(v,f);if(report.volume<0){for(let t of f)t.reverse();report.volume=-report.volume;}
 return {vertices:v,faces:f,report,settings:m};
}
/* A crease row is a zigzag in height, not a horizontal corrugated ring.
   Alternating ridges and valleys exchange roles at each interior crease.
   The reference values reconstruct the measured 32-pleat outer vertex layout. */

// Homothetic polygon sections give genuinely planar pleat faces. Inner vertices
// satisfy offset half-planes from both adjacent profile bands, not radial wall guesses.
function planarPleats(m){
 if(m.twist!==0)throw Error('Straight panels require zero twist. Disable straight panels to use twist.');
 const n=m.count*2,maxR=Math.max(...m.profile.map(p=>p[1]))/2,shape=Array.from({length:n},(_,i)=>1-(i%2)*m.depth/maxR),v=[],f=[];
 const add=p=>(v.push(p),v.length-1),point=(z,i)=>{const a=i/n*2*Math.PI,r=radius(m,z)*shape[i];return [r*Math.cos(a),r*Math.sin(a),z];};
 const Z=m.profile.map(p=>p[0]*m.height);if(m.curve==='smooth'&&m.profile.length>2)for(let j=0;j<m.profile.length-1;j++)for(let k=1;k<16;k++)Z.push((m.profile[j][0]+(m.profile[j+1][0]-m.profile[j][0])*k/16)*m.height);Z.sort((a,b)=>a-b);
 const levels=(lo,hi)=>[lo,...Z.filter(z=>z>lo+1e-8&&z<hi-1e-8),hi];/* smooth: 16 flat bands per segment, every panel still planar */
 const zs=levels(0,m.height),normals=[];
 for(let j=0;j<zs.length-1;j++){
  const row=[];for(let i=0;i<n;i++){const a=point(zs[j],i),b=point(zs[j],(i+1)%n),c=point(zs[j+1],i),u=b.map((x,k)=>x-a[k]),w=c.map((x,k)=>x-a[k]),q=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],L=Math.hypot(...q);row.push(q.map(x=>x/L));}normals.push(row);
 }
 const offset=(z,i)=>{const a=i/n*2*Math.PI;let d=0;for(let j=0;j<normals.length;j++){if(z<zs[j]-1e-7||z>zs[j+1]+1e-7)continue;for(const k of [i,(i+n-1)%n]){const q=normals[j][k],dot=q[0]*Math.cos(a)+q[1]*Math.sin(a);if(dot<.025)throw Error('Pleats are too deep or steep for a stable wall offset.');d=Math.max(d,m.wall/dot);}}return d;};
 const ring=(z,inner=false)=>Array.from({length:n},(_,i)=>{const p=point(z,i);if(inner){const r=Math.hypot(p[0],p[1]),d=offset(z,i);if(r-d<=2)throw Error('Wall offset collapses the inner opening. Reduce depth/thickness or enlarge diameter.');p[0]*=(r-d)/r;p[1]*=(r-d)/r;}return add(p);});
 const join=(a,b,flip=false)=>{for(let i=0;i<n;i++){let k=(i+1)%n;for(let t of [[a[i],a[k],b[k]],[a[i],b[k],b[i]]])f.push(flip?t.reverse():t);}};
 const out=zs.map(z=>ring(z));for(let j=1;j<out.length;j++)join(out[j-1],out[j]);const outerFaceCount=f.length;
 const lo=m.mount==='bottom'?m.plate:0,hi=m.mount==='top'?m.height-m.plate:m.height,iz=levels(lo,hi),inn=iz.map(z=>ring(z,true));for(let j=1;j<inn.length;j++)join(inn[j-1],inn[j],true);
 const hole=z=>Array.from({length:n},(_,i)=>add([m.hole/2*Math.cos(i/n*2*Math.PI),m.hole/2*Math.sin(i/n*2*Math.PI),z]));
 if(m.mount==='none'){join(out[0],inn[0],true);join(out.at(-1),inn.at(-1));}else{
  const bottom=m.mount==='bottom',outer=bottom?out[0]:out.at(-1),inner=bottom?inn[0]:inn.at(-1);
  if(!m.noHole&&Math.min(...inner.map(i=>Math.hypot(v[i][0],v[i][1])))<m.hole/2+2)throw Error('Mounting hole leaves less than 2 mm of wall.');
  if(m.noHole){const capc=(r,z,flip)=>{const c=add([0,0,z]);for(let q=0;q<r.length;q++){const t=[c,r[q],r[(q+1)%r.length]];f.push(flip?t.reverse():t);}};capc(outer,bottom?0:m.height,bottom);capc(inner,bottom?lo:hi,!bottom);}
  else{const a=hole(bottom?0:m.height),b=hole(bottom?lo:hi);join(outer,a,bottom);join(a,b,bottom);join(inner,b,!bottom);}
  if(bottom)join(out.at(-1),inn.at(-1));else join(out[0],inn[0],true);
 }
 const mesh=finish(m,v,f);mesh.panelInfo={planar:true,outerFaceCount,minFaceOffset:m.wall};return mesh;
}

function reverseFold(m){
 const coarseN=2*m.count,n=coarseN*6,v=[],f=[],rows=m.profile.length;
 const outer=m.profile.map((p,j)=>Array.from({length:coarseN},(_,i)=>{
  const parity=i%2,endFlip=(j===0||j===rows-1)&&m.creaseFlips?.[j]?1:0,phase=((j===rows-1?Math.max(0,rows-2):j)%2)^endFlip;
  const interior=j>0&&j<rows-1;
  let z=p[0]*m.height+(interior?(parity?1:-1)*(j%2?1:-1)*(m.creaseFlips?.[j]?-1:1)*m.crease/2:0);
  const r=p[1]/2-(interior?0:(parity^phase)*m.depth),a=i/coarseN*Math.PI*2+m.twist*Math.PI/180*p[0];
  if(r-m.wall<=2)throw Error('The fold is too deep for this opening. Increase the diameter or reduce depth.');
  return [r*Math.cos(a),r*Math.sin(a),z];
 }));
 for(let j=1;j<rows;j++)for(let i=0;i<coarseN;i++)if(outer[j][i][2]-outer[j-1][i][2]<1)throw Error('Crease height overlaps another profile row. Reduce zigzag height or separate the points.');
 const inner=outer.map(row=>row.map(p=>{let r=Math.hypot(p[0],p[1]);return [p[0]*(1-m.wall/r),p[1]*(1-m.wall/r),p[2]];}));
 if(m.mount!=='none'){
  let j=m.mount==='bottom'?0:rows-1,k=m.mount==='bottom'?1:rows-2,z=m.mount==='bottom'?m.plate:m.height-m.plate;
  inner[j]=inner[j].map((p,i)=>{const q=inner[k][i],t=(z-p[2])/(q[2]-p[2]);if(t<=0||t>=1)throw Error('Mounting plate overlaps the first fold. Reduce plate thickness.');return p.map((x,c)=>x+(q[c]-x)*t);});
  if(!m.noHole&&Math.min(...inner[j].map(p=>Math.hypot(p[0],p[1])))<m.hole/2+2)throw Error('Mounting hole is too large. Leave at least 2 mm around it.');
 }
 const add=row=>row.map(p=>{v.push(p);return v.length-1;});
 const join=(a,b,flip=false)=>{for(let i=0;i<n;i++){let j=(i+1)%n;for(let t of [[a[i],a[j],b[j]],[a[i],b[j],b[i]]])f.push(flip?t.reverse():t);}};
 // Tessellate each ruled panel bilinearly. Two large triangles would flatten
 // the saddle-shaped panels and introduce a false diagonal fold.
 const lerp=(a,b,t)=>a.map((x,k)=>x+(b[k]-x)*t);
 const refine=coarse=>{const fine=[];for(let j=0;j<rows-1;j++)for(let t=0;t<16;t++)fine.push(coarse[j].map((p,i)=>lerp(p,coarse[j+1][i],t/16)));fine.push(coarse.at(-1));return fine;};
 const around=fine=>fine.map(row=>row.flatMap((p,i)=>Array.from({length:6},(_,k)=>lerp(p,row[(i+1)%coarseN],k/6))));
 const fo=refine(outer),fi=refine(inner);
 // Smooth profile: bend each panel row out to the smooth silhouette; the inner wall moves by the same radial amount.
 if(m.curve==='smooth'&&rows>2)for(let j=0;j<rows-1;j++)for(let t=1;t<16;t++){const row=j*16+t,u=m.profile[j][0]+(m.profile[j+1][0]-m.profile[j][0])*t/16,lin=(m.profile[j][1]+(m.profile[j+1][1]-m.profile[j][1])*t/16)/2,s=radius(m,u*m.height)/lin;
  for(let i=0;i<coarseN;i++){const o=fo[row][i],q=fi[row][i],dr=Math.hypot(o[0],o[1])*(s-1),rq=Math.hypot(q[0],q[1]),k=(rq+dr)/rq;fo[row][i]=[o[0]*s,o[1]*s,o[2]];fi[row][i]=[q[0]*k,q[1]*k,q[2]];}}
 const out=around(fo).map(add),inn=around(fi).map(add);for(let j=1;j<out.length;j++){join(out[j-1],out[j]);join(inn[j-1],inn[j],true);}
 const hole=z=>add(Array.from({length:n},(_,i)=>{let a=i/n*2*Math.PI+m.twist*Math.PI/180*z/m.height;return [m.hole/2*Math.cos(a),m.hole/2*Math.sin(a),z];}));
 if(m.mount==='none'){join(out[0],inn[0],true);join(out.at(-1),inn.at(-1));}
 else if(m.noHole){const capc=(r,z,flip)=>{const c=add([[0,0,z]])[0];for(let q=0;q<r.length;q++){const t=[c,r[q],r[(q+1)%r.length]];f.push(flip?t.reverse():t);}};if(m.mount==='bottom'){capc(out[0],0,true);capc(inn[0],m.plate,false);join(out.at(-1),inn.at(-1));}else{capc(out.at(-1),m.height,false);capc(inn.at(-1),m.height-m.plate,true);join(out[0],inn[0],true);}}
 else if(m.mount==='bottom'){const a=hole(0),b=hole(m.plate);join(out[0],a,true);join(a,b,true);join(inn[0],b);join(out.at(-1),inn.at(-1));}
 else {const a=hole(m.height),b=hole(m.height-m.plate);join(out.at(-1),a);join(b,a,true);join(inn.at(-1),b,true);join(out[0],inn[0],true);}
 const report=inspect(v,f);if(report.volume<0){f.forEach(t=>t.reverse());report.volume=-report.volume;}
 return {vertices:v,faces:f,report,settings:m,creaseVertices:outer.flat()};
}
function inspect(v,f){let volume=0,area=0,minArea=Infinity,edges=new Map(),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],down=0;
 for(let p of v)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}
 for(let t of f){const [a,b,c]=t.map(i=>v[i]),u=b.map((x,k)=>x-a[k]),w=c.map((x,k)=>x-a[k]);const normal=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],A=Math.hypot(...normal)/2;area+=A;minArea=Math.min(minArea,A);if(normal[2]<-A*1.414&&Math.max(a[2],b[2],c[2])>0.01)down+=A;
 volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
 for(let i=0;i<3;i++){let x=t[i],y=t[(i+1)%3],key=Math.min(x,y)+':'+Math.max(x,y),e=edges.get(key)||[0,0];e[0]++;e[1]+=x<y?1:-1;edges.set(key,e);}}
 let badEdges=0;for(let e of edges.values())if(e[0]!==2||e[1]!==0)badEdges++;
 return {volume,area,downArea:down,minArea,badEdges,triangles:f.length,dimensions:max.map((x,i)=>x-min[i]),closed:badEdges===0&&minArea>1e-8};
}
function stl(mesh){const {vertices:v,faces:f}=mesh,b=new ArrayBuffer(84+50*f.length),d=new DataView(b);new Uint8Array(b).set(new TextEncoder().encode('Foldlight Studio | millimetres'));d.setUint32(80,f.length,true);let o=84;for(let t of f){const [a,c,e]=t.map(i=>v[i]),u=c.map((x,k)=>x-a[k]),w=e.map((x,k)=>x-a[k]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n);for(let x of [...n.map(x=>x/l),...a,...c,...e]){d.setFloat32(o,x,true);o+=4;}d.setUint16(o,0,true);o+=2;}return b;}

// Fixed geometric studies: these constructors do not solve paper-fold compatibility.
const TEXKINDS=['nervous','hexagon','dimples','knurl','fishscale','basket','brick','ripples','waves','reeded','voronoi','cracked','noise','wood','litho','pierced'];
const families={
 yoshimura:{name:'Yoshimura diamonds',description:'Staggered triangular bands. Fixed diamond-shell study; no deployment simulation.',source:'https://origami.c.u-tokyo.ac.jp/~tachi/cg/FoldableCylinders_miura_tachi_ISISSymmetry2010.pdf'},
 miura:{name:'Cylindrical Miura study',description:'Zigzag quadrilateral lattice, triangulated for a fixed shell. Cylindrical closure is geometric, not an isometric Miura solution.',source:'https://www.nature.com/articles/srep33312'},
 kresling:{name:'Kresling tower',description:'Rotated polygon rings with diagonal triangular panels. Static shell; panel lengths are not preserved while editing.',source:'https://www.nature.com/articles/s41467-023-39980-7'},
 divots:{name:'Miura with divots study',description:'Zigzag lattice with recessed cell centres. Inspired by divot lampshades; not the published constrained construction.',source:'https://archive.bridgesmathart.org/2020/bridges2020-435.pdf'},
 nojima:{name:'Nojima helical study',description:'Helical triangular bands with alternating contractions. A fixed design study, not a Nojima folding solver.',source:'https://archive.bridgesmathart.org/2017/bridges2017-383.pdf'},
 waterbomb:{name:'Waterbomb study',description:'Six-triangle fans and recessed vertices. Fixed waterbomb-inspired lattice; folding branch and compatibility are not solved.',source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4950188/'},
 tucks:{name:'Axisymmetric tuck study',description:'Narrow radial valleys across alternating bands. Fixed tuck-inspired geometry, without a developability constraint.',source:'https://mitani.cs.tsukuba.ac.jp/ori_revo/'},
 curved:{name:'Curved-crease study',description:'Sampled curved bands on a rotational profile. Smooth panels with alternating ridges; not an exact developable reflection model.',source:'https://mitani.cs.tsukuba.ac.jp/ori_ref/'},
 resch:{name:'Ron Resch study',description:'Six-facet triangular cells with shared edge midpoints. Relief study; hidden tucks and Ron Resch compatibility are not solved.',source:'https://www.nature.com/articles/srep05979'},
 squares:{name:'Square grid relief',description:'Recessed square tiles separated by sharp grid lines. Depth sets how far each tile moves from the surface, in, out or alternating (checkerboard); bevel sets how far its walls slope (low is steep, high is gentle). The row next to a mounting plate stays flat. Use Make tiles square to match repeats to rows.',source:''},
 eggbox:{name:'Eggbox relief',description:'Alternating raised and recessed pyramid cells. Origami-inspired, nondevelopable fixed shell.',source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5312130/'},
 hexagon:{name:'Honeycomb relief',description:'Recessed or raised hexagon tiles with sharp walls between them. Use Make tiles regular so the hexagons come out even.',source:''},
 dimples:{name:'Dimples and hobnail',description:'Round dimples on a staggered grid. Set tiles to go out for raised hobnail studs.',source:''},
 knurl:{name:'Diamond knurl',description:'Diagonal pyramid grid like a knurled grip. Sharp diamond crests, depth sets the height.',source:''},
 fishscale:{name:'Fish scale shingle',description:'Overlapping round scales in staggered rows, each one grooved at its rim.',source:''},
 basket:{name:'Basket weave',description:'Alternating blocks of horizontal and vertical strands, with an over-and-under offset.',source:''},
 brick:{name:'Brick offset',description:'Staggered brick courses, each brick twice as wide as it is tall, separated by mortar lines.',source:''},
 ripples:{name:'Diagonal ripples',description:'Smooth sine ripples running diagonally around the shade.',source:''},
 waves:{name:'Flowing waves',description:'Horizontal wave bands that undulate around the shade.',source:''},
 reeded:{name:'Reeded flutes (random)',description:'Vertical flutes whose depth varies from flute to flute. Change the seed for a new random arrangement.',source:''},
 voronoi:{name:'Voronoi cells',description:'Irregular cells like cracked glaze, each recessed with a ridge between neighbours. Seed shuffles the cells.',source:''},
 cracked:{name:'Cracked earth',description:'Thin irregular cracks across the surface. Max slope keeps the cracks printable.',source:''},
 noise:{name:'Soft noise',description:'Smooth seeded organic undulation, like a hammered or windswept surface.',source:''},
 wood:{name:'Wood grain',description:'Flowing grain lines with seeded turbulence, running around the shade.',source:''},
 litho:{name:'Thickness map (lithophane)',description:'Smooth outside, wall thickness varies inside so light glows brighter through thin areas. Depth is how much the wall thins; it never goes below 0.8 mm (two nozzle widths).',source:''},
 nervous:{name:'Voronoi lattice (organic)',description:'Organic web of smooth, rounded struts around irregular open cells. Seed reshuffles the cells; hole closing sets strut width; edge rounding softens the cut edges. Check the web warning before printing.',source:''},
 pierced:{name:'Pierced holes',description:'Real cut-outs through the wall in the chosen shape. Hole size sets how much material remains between holes; the check warns if a web gets too thin to print.',source:''},
 hypar:{name:'Pleated hypar panel',description:'Square saddle with concentric pleats, triangulated as a solid panel. Experimental; not an exact paper fold or stackable tube.',source:'https://erikdemaine.org/papers/Hypar_GC/'}
};
/* Loop subdivision with sharp creases kept: an edge stays sharp when its two faces meet at more than `angle`
   degrees, or when either face is horizontal (rims and mounting plates stay flat). Crease vertices follow the
   curve rule, vertices on three or more creases stay fixed, everything else is smoothed. */
function subdivide(V,F,levels,angle,frozen){const cosT=Math.cos(angle*Math.PI/180);frozen=frozen||(()=>false);
 for(let L=0;L<levels;L++){const nV=V.length,nF=F.length,FN=new Float64Array(nF*3);
  for(let f=0;f<nF;f++){const [a,b,c]=F[f],A=V[a],B=V[b],C=V[c],ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2],wx=C[0]-A[0],wy=C[1]-A[1],wz=C[2]-A[2];let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz)||1;FN[3*f]=nx/l;FN[3*f+1]=ny/l;FN[3*f+2]=nz/l;}
  const E=new Map(),e0=[],e1=[],f0=[],f1=[],o0=[],o1=[],FE=new Int32Array(nF*3);
  for(let f=0;f<nF;f++)for(let k=0;k<3;k++){const a=F[f][k],b=F[f][(k+1)%3],c=F[f][(k+2)%3],lo=a<b?a:b,hi=a<b?b:a,key=lo*nV+hi;let e=E.get(key);if(e===undefined){e=e0.length;E.set(key,e);e0.push(lo);e1.push(hi);f0.push(f);f1.push(-1);o0.push(c);o1.push(-1);}else{f1[e]=f;o1[e]=c;}FE[3*f+k]=e;}
  const nE=e0.length,cr=new Uint8Array(nE),val=new Uint32Array(nV),sum=new Float64Array(nV*3),cc=new Uint8Array(nV),cn=new Int32Array(nV*2).fill(-1);
  for(let e=0;e<nE;e++){const g0=f0[e],g1=f1[e];let sharp=g1<0;if(!sharp){const d=FN[3*g0]*FN[3*g1]+FN[3*g0+1]*FN[3*g1+1]+FN[3*g0+2]*FN[3*g1+2];sharp=d<cosT||Math.abs(FN[3*g0+2])>.985||Math.abs(FN[3*g1+2])>.985;}cr[e]=sharp?1:0;
   const a=e0[e],b=e1[e];val[a]++;val[b]++;for(let k=0;k<3;k++){sum[3*a+k]+=V[b][k];sum[3*b+k]+=V[a][k];}
   if(sharp){if(cc[a]<2)cn[2*a+cc[a]]=b;cc[a]++;if(cc[b]<2)cn[2*b+cc[b]]=a;cc[b]++;}}
  const NV=new Array(nV+nE);
  const fz=new Uint8Array(nV);for(let v=0;v<nV;v++)fz[v]=frozen(V[v])?1:0;
  for(let v=0;v<nV;v++){const p=V[v];if(cc[v]>2||fz[v]){NV[v]=[p[0],p[1],p[2]];continue;}
   if(cc[v]===2){const A=V[cn[2*v]],B=V[cn[2*v+1]];NV[v]=[.75*p[0]+.125*(A[0]+B[0]),.75*p[1]+.125*(A[1]+B[1]),.75*p[2]+.125*(A[2]+B[2])];continue;}
   const n=val[v],be=n>3?3/(8*n):3/16,w=1-n*be;NV[v]=[w*p[0]+be*sum[3*v],w*p[1]+be*sum[3*v+1],w*p[2]+be*sum[3*v+2]];}
  for(let e=0;e<nE;e++){const A=V[e0[e]],B=V[e1[e]];if(cr[e]||o1[e]<0||fz[e0[e]]||fz[e1[e]]){NV[nV+e]=[(A[0]+B[0])/2,(A[1]+B[1])/2,(A[2]+B[2])/2];continue;}const C=V[o0[e]],D=V[o1[e]];NV[nV+e]=[.375*(A[0]+B[0])+.125*(C[0]+D[0]),.375*(A[1]+B[1])+.125*(C[1]+D[1]),.375*(A[2]+B[2])+.125*(C[2]+D[2])];}
  const NF=new Array(nF*4);for(let f=0;f<nF;f++){const [a,b,c]=F[f],ab=nV+FE[3*f],bc=nV+FE[3*f+1],ca=nV+FE[3*f+2];NF[4*f]=[a,ab,ca];NF[4*f+1]=[ab,b,bc];NF[4*f+2]=[ca,bc,c];NF[4*f+3]=[ab,bc,ca];}
  V=NV;F=NF;}
 return {vertices:V,faces:F};}
function build(input){const mesh=rawBuild(input),a=mesh.settings.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);if(a)mesh.vertices=mesh.vertices.map(([x,y,z])=>[x*c-y*s,x*s+y*c,z]);const old=mesh.report||{};let lev=mesh.vessel?0:(mesh.settings.subdiv|0);while(lev>0&&mesh.faces.length*Math.pow(4,lev)>600000)lev--;if(lev>0){const S=mesh.settings,zone=S.plate*1.3+2,lo=S.mount==='bottom'?zone:3,hi=S.mount==='top'?S.height-zone:S.height-3;const sd=subdivide(mesh.vertices,mesh.faces,lev,S.subAngle,p=>p[2]<=lo||p[2]>=hi);mesh.vertices=sd.vertices;mesh.faces=sd.faces;}mesh.subdivApplied=lev;mesh.report=inspect(mesh.vertices,mesh.faces);if(old.pierce)mesh.report.pierce=old.pierce;if(old.litho)mesh.report.litho=old.litho;return mesh;}
function studyShell(m){
 if(m.pattern==='hypar')return hypar(m);
 if(TEXKINDS.includes(m.pattern))return texShell(m);
 const n=m.count*2,R=m.rows,v=[],f=[],rings=[],kind=m.pattern;
 const add=p=>(v.push(p),v.length-1);
 const tri=(a,b,c)=>f.push([a,b,c]);
 // End rings remain planar for measurable section interfaces. Interior rows
 // belong to the cell lattice; triangles share indices across every boundary.
 const bot=m.mount==='bottom',tp=m.mount==='top',slim=['squares','yoshimura','kresling','nojima','tucks'].includes(kind)&&R>=3&&(bot||tp);
 const zlo=bot?m.plate*1.3:0,zhi=tp?m.height-m.plate*1.3:m.height,jb=bot?1:0,jt=tp?R-1:R;
 const zAt=j=>!slim?j/R*m.height:(j<jb?0:j>jt?m.height:zlo+(j-jb)*(zhi-zlo)/(jt-jb));
 for(let j=0;j<=R;j++){
  const end=j===0||j===R,ring=[],zj=zAt(j),u=zj/m.height;
  for(let i=0;i<n;i++){
   const parity=i%2,sign=parity?1:-1;
   let z=zj,r=radius(m,z),shift=0;
   if(kind==='yoshimura'){shift=(j%2)*.5;r-=end?0:(j%2)*m.depth;}
   if(['miura','divots'].includes(kind)&&!end){z+=sign*(j%2?1:-1)*Math.min(m.crease/2,m.height/R*.22);r-=parity*m.depth;shift=(j%2)*m.skew;}
   if(kind==='kresling'){shift=j*m.skew;if(!end)r-=parity*m.depth;}
   if(kind==='nojima'){shift=j*m.skew;r-=end?0:(j%2)*m.depth;}
   if(kind==='waterbomb'&&!end){r-=((i+j)%2)*m.depth;z+=sign*(j%2?1:-1)*Math.min(m.crease/3,m.height/R*.18);}
   if(kind==='tucks'&&!end){r-=parity*m.depth*(j%2?.35:1);shift=(j%2)*m.skew*.3;}
   if(kind==='curved'&&!end){z+=Math.sin(i/n*2*Math.PI*3)*Math.min(m.crease/2,m.height/R*.2);r-=j%2?m.depth:0;}
   if(kind==='resch'){shift=(j%2)*.5;r-=end?0:(i+j)%3===0?m.depth*.3:0;}
   if(kind==='eggbox'&&!end)r-=((i+j)%2)*m.depth*.25;
   const a=(i+shift)/n*2*Math.PI+m.twist*Math.PI/180*u;
   if(r-m.depth-m.wall<3)throw Error('Cell depth leaves no inner opening. Reduce depth or enlarge the profile.');
   ring.push(add([r*Math.cos(a),r*Math.sin(a),z]));
  }rings.push(ring);
 }
 const mids=new Map(),mid=(a,b)=>{const key=[Math.min(a,b),Math.max(a,b)].join(':');if(!mids.has(key))mids.set(key,add(v[a].map((x,k)=>(x+v[b][k])/2)));return mids.get(key);};
 for(let j=0;j<R;j++)for(let i=0;i<n;i++){
  const k=(i+1)%n,[a,b,c,d]=[rings[j][i],rings[j][k],rings[j+1][k],rings[j+1][i]];
  if(['divots','waterbomb','eggbox'].includes(kind)){
   let p=[0,1,2].map(k=>(v[a][k]+v[b][k]+v[c][k]+v[d][k])/4),r=Math.hypot(p[0],p[1]);
   let dip=kind==='eggbox'?((i+j)%2?1:-1)*m.depth:kind==='waterbomb'?((i+j)%2?1:.2)*m.depth:m.depth;
   p[0]*=(r-dip)/r;p[1]*=(r-dip)/r;const q=add(p);if(kind==='waterbomb'){const ab=mid(a,b),cd=mid(c,d);tri(a,ab,q);tri(ab,b,q);tri(b,c,q);tri(c,cd,q);tri(cd,d,q);tri(d,a,q);}else{tri(a,b,q);tri(b,c,q);tri(c,d,q);tri(d,a,q);}
  }else if(kind==='squares'&&!((m.mount==='bottom'&&j===0)||(m.mount==='top'&&j===R-1))){
   const cen=[0,1,2].map(k=>(v[a][k]+v[b][k]+v[c][k]+v[d][k])/4),dip=m.relief==='out'?-m.depth:m.relief==='both'?((i+j)%2?-m.depth:m.depth):m.depth,inset=P=>{const p=P.map((x,k)=>x+(cen[k]-x)*m.bevel),r=Math.hypot(p[0],p[1]);p[0]*=(r-dip)/r;p[1]*=(r-dip)/r;return add(p);};
   const A=inset(v[a]),B=inset(v[b]),C=inset(v[c]),D=inset(v[d]);
   tri(a,b,B);tri(a,B,A);tri(b,c,C);tri(b,C,B);tri(c,d,D);tri(c,D,C);tri(d,a,A);tri(d,A,D);tri(A,B,C);tri(A,C,D);
  }else if(kind==='resch'){
   const fan=(a,b,c)=>{let p=[0,1,2].map(k=>(v[a][k]+v[b][k]+v[c][k])/3),r=Math.hypot(p[0],p[1]);p[0]*=(r-m.depth)/r;p[1]*=(r-m.depth)/r;let q=add(p),ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);for(const [x,y] of [[a,ab],[ab,b],[b,bc],[bc,c],[c,ca],[ca,a]])tri(x,y,q);};fan(a,b,c);fan(a,c,d);
  }else if((i+j)%2&&kind!=='kresling'&&kind!=='nojima'){tri(a,b,d);tri(b,c,d);}else{tri(a,b,c);tri(a,c,d);}
 }
 for(const j of [0,R])if(['waterbomb','resch'].includes(kind)){rings[j]=rings[j].flatMap((a,i)=>[a,mid(a,rings[j][(i+1)%n])]);}
 const count=v.length,outerFaces=f.map(t=>t.slice());
 for(let p of v.slice()){let r=Math.hypot(p[0],p[1]);v.push([p[0]*(1-m.wall/r),p[1]*(1-m.wall/r),p[2]]);}
 const bottom=m.mount==='bottom',top=m.mount==='top';
 if(bottom||top){const j=bottom?0:R,k=bottom?1:R-1,z=bottom?m.plate:m.height-m.plate;for(let i=0;i<rings[j].length;i++){let idx=rings[j][i]+count,p=v[idx],q=['waterbomb','resch'].includes(kind)?[p[0],p[1],p[2]+(bottom?1:-1)*m.height/R]:v[rings[k][i]+count],t=(z-p[2])/(q[2]-p[2]);if(t<=0||t>=.8)throw Error('Mount overlaps a pattern row. Reduce plate thickness or row count.');v[idx]=p.map((x,c)=>x+(q[c]-x)*t);if(!m.noHole&&Math.hypot(...v[idx].slice(0,2))<m.hole/2+2)throw Error('Mount hole leaves insufficient material.');}}
 for(const t of outerFaces)f.push(t.map(i=>i+count).reverse());
 const join=(a,b,flip=false)=>{for(let i=0;i<a.length;i++){let k=(i+1)%a.length;for(let t of [[a[i],a[k],b[k]],[a[i],b[k],b[i]]])f.push(flip?t.reverse():t);}};
 for(const j of [0,R]){const out=rings[j],inn=out.map(i=>i+count),isBottom=j===0;if((isBottom&&bottom)||(!isBottom&&top)){const z=isBottom?0:m.height,z1=isBottom?m.plate:m.height-m.plate;const hole=z=>out.map(i=>{let a=Math.atan2(v[i][1],v[i][0]);return add([m.hole/2*Math.cos(a),m.hole/2*Math.sin(a),z]);});if(m.noHole){const capc=(r,zz,flip)=>{const c=add([0,0,zz]);for(let q=0;q<r.length;q++){const t=[c,r[q],r[(q+1)%r.length]];f.push(flip?t.reverse():t);}};capc(out,z,isBottom);capc(inn,z1,!isBottom);}else{const a=hole(z),b=hole(z1);join(out,a,isBottom);join(a,b,isBottom);join(inn,b,!isBottom);}}else join(out,inn,isBottom);}
 return finish(m,v,f);
}
// ---- Texture families: height-field relief, thickness maps and pierced holes ----
const HASH=(x,y,s)=>{let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1274126177)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;};
const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const frac=x=>x-Math.floor(x);
const smin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
const lin=(a,b,x)=>Math.min(1,Math.max(0,(x-a)/(b-a)));
function voroSite(cx,cy,P,s,jit){const wx=((cx%P)+P)%P;return [cx+.5+(HASH(wx,cy,s)-.5)*jit,cy+.5+(HASH(wx,cy,s+7919)-.5)*jit,wx+','+cy];}
function voroNear(a,b,P,s,jit){const ia=Math.floor(a),ib=Math.floor(b),r=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const q=voroSite(ia+dx,ib+dy,P,s,jit);r.push([Math.hypot(a-q[0],b-q[1]),q[2],q[0],q[1]]);}r.sort((x,y)=>x[0]-y[0]);return r;}
function noise2(x,y,P,s){const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,q=t=>t*t*t*(t*(t*6-15)+10),ux=q(fx),uy=q(fy),g=(i,j)=>HASH(((i%P)+P)%P,j,s);return (g(x0,y0)*(1-ux)+g(x0+1,y0)*ux)*(1-uy)+(g(x0,y0+1)*(1-ux)+g(x0+1,y0+1)*ux)*uy;}
function voro(a,b,P,s,jit){const ia=Math.floor(a),ib=Math.floor(b);let f1=9,f2=9;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=ia+dx,cy=ib+dy,wx=((cx%P)+P)%P,px=cx+.5+(HASH(wx,cy,s)-.5)*jit,py=cy+.5+(HASH(wx,cy,s+7919)-.5)*jit,d=Math.hypot(a-px,b-py);if(d<f1){f2=f1;f1=d;}else if(d<f2)f2=d;}return [f1,f2];}
// Each texture returns [h, parity]: h in 0..1 is how deep the surface goes (1 = deepest), parity (+1/-1/0) drives the checkerboard option.
const TEX={
 tiles:(a,b,m,w)=>{const s=Math.max(Math.abs(frac(a)-.5),Math.abs(frac(b)-.5))*2;return [1-sm(1-w,1,s),(Math.floor(a)+Math.floor(b))%2?1:-1];},
 hexagon:(a,b,m,w)=>{let best=9,id=0;const r0=Math.floor(b-.5);for(let rr=r0-1;rr<=r0+1;rr++){const off=((rr%2)+2)%2*.5,k0=Math.floor(a-off);for(let k=k0;k<=k0+1;k++){const dx=Math.abs(a-(k+off)),dy=Math.abs(b-(rr+.5)),nm=Math.max(dx,.5*dx+.75*dy);if(nm<best){best=nm;id=(k+rr)%2?1:-1;}}}return [1-sm(1-w,1,best*2),id];},
 dimples:(a,b,m,w)=>{let best=9,id=0;const r0=Math.floor(b-.5);for(let rr=r0-1;rr<=r0+1;rr++){const off=((rr%2)+2)%2*.5,k0=Math.floor(a-off);for(let k=k0;k<=k0+1;k++){const d=Math.hypot(a-(k+off),(b-(rr+.5))*.866)*2;if(d<best){best=d;id=(k+rr)%2?1:-1;}}}return [best<1?1-best*best:0,id];},
 knurl:(a,b)=>{const fu=frac(a+b)-.5,fv=frac(a-b)-.5;return [1-2*Math.max(Math.abs(fu),Math.abs(fv)),0];},
 fishscale:(a,b,m,w)=>{const r0=Math.floor(2*b);let h=1;for(let rr=r0-2;rr<=r0+2;rr++){const off=((rr%2)+2)%2*.5,cy=rr*.5,k0=Math.floor(a-off);for(let k=k0;k<=k0+1;k++){const d=Math.hypot(a-(k+off),b-cy)/.5,t=lin(0,.2,1-d);if(t>0){const hs=Math.max(lin(1-w,1,d),.35*d*d);h=h*(1-t)+hs*t;}}}return [h,0];},
 basket:(a,b)=>{const ia=Math.floor(a),ib=Math.floor(b),par=(ia+ib)%2?1:0,t=frac(par?a:b)*3,s=Math.sin(Math.PI*frac(t));return [Math.min(1,.7*(1-Math.pow(s,.6))+.3*par),par?1:-1];},
 brick:(a,b,m,w)=>{const rr=Math.floor(b*2),off=((rr%2)+2)%2*.5,lx=frac(a-off),ly=frac(b*2),s=Math.max(Math.abs(lx-.5),Math.abs(ly-.5))*2;return [1-sm(1-w,1,s),Math.floor(a-off)%2?1:-1];},
 ripples:(a,b)=>[.5+.5*Math.sin(2*Math.PI*(a+b)),0],
 reeded:(a,b,m)=>{const k=Math.floor(a),r=.35+.65*HASH(((k%m_P)+m_P)%m_P,0,m.seed);return [r*Math.sin(Math.PI*frac(a)),k%2?1:-1];},
 voronoi:(a,b,m,w)=>{const [f1,f2]=voro(a,b,m_P,m.seed,.85);return [lin(0,.05+w,f2-f1),0];},
 cracked:(a,b,m,w)=>{const [f1,f2]=voro(a*.5,b*.5,Math.max(1,m_P/2),m.seed,1);return [1-lin(0,.03+w*.5,f2-f1),0];},
 webcells:(a,b,m)=>{const [f1,f2]=voro(a,b,m_P,m.seed,.9);return [Math.min(1,(f2-f1)*2),0];},
 noise:(a,b,m)=>{const P=Math.max(1,Math.round(m_P/2)),x=a*P/m_P;return [.65*noise2(x,b*.5,P,m.seed)+.35*noise2(x*2,b,P*2,m.seed+3),0];},
 wood:(a,b,m)=>{const P=Math.max(1,Math.round(m_P/3)),warp=noise2(a*P/m_P,b*.12,P,m.seed)*2.2+noise2(a*P/m_P*3,b*.4,P*3,m.seed+9)*.3,d=a/2+warp*.5,s=.5+.5*Math.sin(2*Math.PI*d);return [Math.pow(s,1.6),0];}
};
let m_P=2;
TEX.waves=(a,b)=>[.5+.5*Math.sin(2*Math.PI*(b*1.5+.3*Math.sin(2*Math.PI*a/m_P*Math.round(m_P/2)))),0];
let IMG=null,IMGKEY=null;
const b64=t=>typeof atob==='function'?Uint8Array.from(atob(t),c=>c.charCodeAt(0)):new Uint8Array(Buffer.from(t,'base64'));
function loadImage(m){if(!m.image){IMG=null;IMGKEY=null;return;}if(IMGKEY===m.image.d)return;const px=b64(m.image.d);if(px.length<m.image.w*m.image.h)throw Error('Image data is incomplete');IMG={w:m.image.w,h:m.image.h,p:px};IMGKEY=m.image.d;}
TEX.image=(a,b,m)=>{if(!IMG)return [.5,0];const {w,h,p}=IMG,x=frac(a/m_P*m.imgRep)*w,y=Math.min(1,Math.max(0,1-b/m.rows))*(h-1),x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,g=(i,j)=>p[Math.min(h-1,j)*w+((i%w)+w)%w]/255,v=(g(x0,y0)*(1-fx)+g(x0+1,y0)*fx)*(1-fy)+(g(x0,y0+1)*(1-fx)+g(x0+1,y0+1)*fx)*fy;return [m.imgInvert?1-v:v,0];};
// Crease lines per texture, found near a grid edge (a0,b0)-(a1,b1): a Map of key -> signed function whose zero set is the crease.
function creaseSource(src,m,w,nc){
 const seed=m.seed;
 if(src==='voronoi'||src==='cracked'){const sc=src==='cracked'?.5:1,P=src==='cracked'?Math.max(1,nc/2):nc,jit=src==='cracked'?1:.85,lvl=src==='cracked'?.03+w*.5:.05+w;
  const memo=new Map(),near2=(x,y)=>{const k=x.toFixed(7)+','+y.toFixed(7);let r=memo.get(k);if(!r){r=voroNear(x,y,P,seed,jit).slice(0,2);memo.set(k,r);}return r;};
  return (a0,b0,a1,b1)=>{const out=new Map(),sites=new Map();for(const [a,b] of [[a0,b0],[a1,b1]])for(const s of near2(a*sc,b*sc))if(!sites.has(s[1]))sites.set(s[1],s);
   const L=[...sites.values()];for(let x=0;x<L.length;x++)for(let y=x+1;y<L.length;y++){const [p,q]=L[x][1]<L[y][1]?[L[x],L[y]]:[L[y],L[x]];out.set('v'+p[1]+'|'+q[1],(a,b)=>Math.hypot(a*sc-p[2],b*sc-p[3])-Math.hypot(a*sc-q[2],b*sc-q[3]));}
   out.set('plateau',(a,b)=>{const [f1,f2]=voro(a*sc,b*sc,P,seed,jit);return f2-f1-lvl;});return out;};}
 if(src==='dimples')return (a0,b0,a1,b1)=>{const out=new Map();for(const [a,b] of [[a0,b0],[a1,b1]]){let best=9,cx=0,cy=0,key='';const r0=Math.floor(b-.5);for(let rr=r0-1;rr<=r0+1;rr++){const off=((rr%2)+2)%2*.5,k0=Math.floor(a-off);for(let k=k0;k<=k0+1;k++){const d=Math.hypot(a-(k+off),(b-(rr+.5))*.866)*2;if(d<best){best=d;cx=k+off;cy=rr+.5;key='d'+(((k%nc)+nc)%nc)+','+rr;}}}if(!out.has(key))out.set(key,(x,y)=>Math.hypot(x-cx,(y-cy)*.866)*2-1);}return out;};
 if(src==='fishscale'){const c=.35*w,dstar=c>1e-6?(1-Math.sqrt(Math.max(0,1-4*c*(1-w))))/(2*c):1-w,radii=[1,.8];void dstar;
  return (a0,b0,a1,b1)=>{const out=new Map(),la=Math.min(a0,a1),ha=Math.max(a0,a1),lb=Math.min(b0,b1),hb=Math.max(b0,b1);for(let rr=Math.floor(2*lb)-2;rr<=Math.ceil(2*hb)+2;rr++){const off=((rr%2)+2)%2*.5,cy=rr*.5;for(let k=Math.floor(la-off)-1;k<=Math.ceil(ha-off)+1;k++){const cx=k+off,dx=Math.max(la-cx,0,cx-ha),dy=Math.max(lb-cy,0,cy-hb);if(Math.hypot(dx,dy)>.51)continue;for(const R of radii)out.set('f'+rr+','+(((k%nc)+nc)%nc)+','+R.toFixed(4),(x,y)=>Math.hypot(x-cx,y-cy)/.5-R);}}return out;};}
 return ()=>new Map();
}
const HF_KINDS=Object.keys(TEX).filter(k=>k!=='tiles');
const INVERT=['fishscale','basket','cracked'];
const TEX_SOURCES=Object.keys(TEX);

// Analytic hexagon relief: each tile is one floor polygon plus one bevel strip per side, so the mesh holds only the edges a designer would draw.
function hexShell(m){
 const nc=m.count*2,R0=m.rows,H=m.height,bottom=m.mount==='bottom',top=m.mount==='top';
 const zlo=bottom?m.plate*1.3:1,zhi=H-(top?m.plate*1.3:1),unit=(zhi-zlo)/(R0+1/3);
 if(unit<=0)throw Error('Mount overlaps a pattern row. Reduce plate thickness or row count.');
 const zOf=b=>zlo+(b+1/6)*unit,w=Math.min(.9,Math.max(.05,m.bevel)),N2=2*nc;
 const v=[],f=[],ids=new Map(),add=p=>(v.push(p),v.length-1);
 const pos=(x2,b6,dep)=>{const z=zOf(b6/6),u=z/H,r=radius(m,z)-dep,ang=x2/2/nc*2*Math.PI+m.twist*Math.PI/180*u;if(r-Math.abs(m.depth)-m.wall<3)throw Error('Cell depth leaves no inner opening. Reduce depth or enlarge the profile.');return [r*Math.cos(ang),r*Math.sin(ang),z];};
 const bv=(x2,b6)=>{x2=((x2%N2)+N2)%N2;const key=x2+','+b6;let id=ids.get(key);if(id===undefined){id=add(pos(x2,b6,0));ids.set(key,id);}return id;};
 const OFF=[[0,-4],[1,-2],[1,2],[0,4],[-1,2],[-1,-2]];
 for(let rr=0;rr<R0;rr++){const o=rr%2,cb=6*rr+3,u=zOf(cb/6)/H;let fade=1;if(m.fade>0){const t=m.fadeTo==='top'?u:1-u;fade=1-m.fade*sm(0,1,t);}
  for(let k=0;k<nc;k++){const cx=2*k+o,par=(k+rr)%2?1:-1,dep=(m.relief==='in'?1:m.relief==='out'?-1:par)*m.depth*fade;
   const V=OFF.map(([dx,db])=>bv(cx+dx,cb+db)),I=OFF.map(([dx,db])=>add(pos(cx+dx*(1-w),cb+db*(1-w),dep)));
   f.push([I[0],I[1],I[2]],[I[0],I[2],I[3]],[I[0],I[3],I[4]],[I[0],I[4],I[5]]);
   for(let q=0;q<6;q++){const j=(q+1)%6;f.push([V[q],V[j],I[j]],[V[q],I[j],I[q]]);}}}
 const ringAt=(z,u)=>{const out=[];for(let x=0;x<N2;x++){const r=radius(m,z),a=x/2/nc*2*Math.PI+m.twist*Math.PI/180*u;out.push(add([r*Math.cos(a),r*Math.sin(a),z]));}return out;};
 const Rb=ringAt(0,0),Rt=ringAt(H,1),ot=(R0-1)%2;
 for(let x=0;x<N2;x++){const y=(x+1)%N2,zb=q=>bv(q,q%2===0?-1:1),zt=q=>bv(q,(q%2===ot)?6*R0+1:6*R0-1);
  f.push([Rb[x],Rb[y],zb(y)],[Rb[x],zb(y),zb(x)]);f.push([zt(x),zt(y),Rt[y]],[zt(x),Rt[y],Rt[x]]);}
 const count=v.length,outerFaces=f.map(t=>t.slice());
 for(let x=0;x<count;x++){const p=v[x],r=Math.hypot(p[0],p[1]);v.push([p[0]*(1-m.wall/r),p[1]*(1-m.wall/r),p[2]]);}
 for(const [ring,on,isB] of [[Rb,bottom,true],[Rt,top,false]])if(on){const z=isB?m.plate:H-m.plate;for(const i of ring){const p=v[i],a=Math.atan2(p[1],p[0]),r=radius(m,z)-m.wall;v[i+count]=[r*Math.cos(a),r*Math.sin(a),z];if(!m.noHole&&r<m.hole/2+2)throw Error('Mount hole leaves insufficient material.');}}
 for(const t of outerFaces)f.push(t.map(i=>i+count).reverse());
 const join=(a,b,flip=false)=>{for(let i=0;i<a.length;i++){const k=(i+1)%a.length;for(const t of [[a[i],a[k],b[k]],[a[i],b[k],b[i]]])f.push(flip?t.reverse():t);}};
 for(const [out,on,isBottom] of [[Rb,bottom,true],[Rt,top,false]]){const inn=out.map(i=>i+count);if(on){const z=isBottom?0:H,z1=isBottom?m.plate:H-m.plate;
   if(m.noHole){const capc=(r,zz,flip)=>{const c=add([0,0,zz]);for(let q=0;q<r.length;q++){const t=[c,r[q],r[(q+1)%r.length]];f.push(flip?t.reverse():t);}};capc(out,z,isBottom);capc(inn,z1,!isBottom);}
   else{const hr=zz=>out.map(i=>{const an=Math.atan2(v[i][1],v[i][0]);return add([m.hole/2*Math.cos(an),m.hole/2*Math.sin(an),zz]);});const a=hr(z),b=hr(z1);join(out,a,isBottom);join(a,b,isBottom);join(inn,b,!isBottom);}}else join(out,inn,isBottom);}
 return finish(m,v,f);
}
function texShell(m){
 if(m.pattern==='hexagon'&&!m.pattern2)return hexShell(m);
 const kind=m.pattern,nc=m.count*2,R0=m.rows,pierced=kind==='pierced'||kind==='nervous',litho=kind==='litho';
 const SHARP=['tiles','hexagon','brick','voronoi','cracked','fishscale','basket','knurl'],srcK=kind==='nervous'?'webcells':pierced||litho?m.source:kind,budget=pierced?110000:130000,base=Math.max(3,Math.min(pierced?20:SHARP.includes(srcK)?10:12,Math.floor(Math.sqrt(budget/(nc*R0)))));
 // Grid aligned to the tile lattice, so tile edges, bevel lines and diagonals fall exactly on mesh edges.
 let Kx=base,Ky=base,wq=0;
 if(srcK==='hexagon'){let mm=Math.floor(Math.sqrt(budget/(6*nc*R0)));mm=Math.max(2,Math.min(pierced?6:4,mm-(mm%2)));Kx=2*mm;Ky=3*mm;wq=1/mm;}
 else if(srcK==='brick'){let kx=Math.floor(Math.sqrt(budget/(2*nc*R0)));kx=Math.max(4,Math.min(pierced?8:8,kx-(kx%4)));Kx=kx;Ky=2*kx;wq=2/kx;}
 else if(srcK==='tiles'){Kx=Ky=Math.max(4,base-(base%2));wq=2/Kx;}
 else if(srcK==='knurl'){Kx=Ky=Math.max(4,base-(base%2));}
 else if(srcK==='basket'){Kx=Ky=Math.max(6,Math.round(base/6)*6);}
 if((litho||pierced)&&m.source==='image'){loadImage(m);const rm0=radius(m,m.height/2),sz=Math.max(.7,Math.sqrt(2*Math.PI*rm0*m.height/70000));Kx=Math.max(1,Math.round(2*Math.PI*rm0/nc/sz));Ky=Math.max(1,Math.round(m.height/R0/sz));wq=0;}
 if(!pierced&&!litho&&!m.pattern2&&['voronoi','cracked','dimples','fishscale'].includes(srcK)){const cap=srcK==='dimples'?5:4;Kx=Ky=Math.max(3,Math.min(cap,Math.floor(Math.sqrt(90000/(nc*R0)))));}
 const n=nc*Kx,R=R0*Ky,K=Ky;
 m_P=nc;
 const src=kind==='nervous'?'webcells':pierced||litho?m.source:kind,fn=TEX[src]||TEX.hexagon,fn2=m.pattern2&&TEX[m.pattern2]?TEX[m.pattern2]:null,w=wq?Math.min(.9,Math.max(wq,Math.round(m.bevel/wq)*wq)):m.bevel;
 const cutMode=!pierced&&!litho&&!fn2&&['voronoi','cracked','dimples','fishscale'].includes(src);
 const bottom=m.mount==='bottom',top=m.mount==='top';
 let kk=0;if(bottom||top){while(kk<K*3&&kk*m.height/R<m.plate*1.3)kk++;if(kk>=R/2)throw Error('Mount overlaps a pattern row. Reduce plate thickness or row count.');}
 const rowsIdx=[];for(let j=0;j<=R;j++){if(bottom&&j>0&&j<kk)continue;if(top&&j<R&&j>R-kk)continue;rowsIdx.push(j);}
 const wt=j=>{let lo=bottom?sm(kk,kk+K,j):sm(0,K,j),hi=top?sm(kk,kk+K,R-j):sm(0,K,R-j);return Math.min(lo,hi);};
 const slopeLim=Math.tan(m.slope*Math.PI/180),H=m.height;
 // depth field (mm; + = recess)
 const val=(a,b,ww)=>{const u=b/R0;let fade=1;if(m.fade>0){const t=m.fadeTo==='top'?u:1-u;fade=1-m.fade*sm(0,1,t);}
  let [h,par]=fn(a,b,m,w);if(fn2){const blend=sm(m.split-.07,m.split+.07,u),q=fn2(a,b,m,w);h=h*(1-blend)+q[0]*blend;par=blend>.5?q[1]:par;}
  let d;if(pierced)d=INVERT.includes(src)?1-h:h;else if(litho)d=h;else if(m.relief==='in')d=h;else if(m.relief==='out')d=-h;else d=par?par*h:(2*h-1);return d*ww*fade;};
 const D=[];
 for(const j of rowsIdx){const row=new Float64Array(n),ww=wt(j);for(let i=0;i<n;i++)row[i]=val(i/Kx,j/Ky,ww);D.push(row);}
 const nrow=D.length,rz=rowsIdx.map(j=>j/R*H);
 let depthMM=null;
 if(!pierced&&!litho){depthMM=D.map(r=>Float64Array.from(r,x=>x*m.depth));
  if(m.slope<84&&!cutMode){const rm=radius(m,H/2),ds=2*Math.PI*rm/n;for(let pass=0;pass<2;pass++){
   for(let j=1;j<nrow;j++){const L=slopeLim*(rz[j]-rz[j-1]);for(let i=0;i<n;i++)depthMM[j][i]=Math.min(depthMM[j-1][i]+L,Math.max(depthMM[j-1][i]-L,depthMM[j][i]));}
   for(let j=nrow-2;j>=0;j--){const L=slopeLim*(rz[j+1]-rz[j]);for(let i=0;i<n;i++)depthMM[j][i]=Math.min(depthMM[j+1][i]+L,Math.max(depthMM[j+1][i]-L,depthMM[j][i]));}
   const L=slopeLim*ds;for(let j=0;j<nrow;j++){const r=depthMM[j];for(let t=0;t<2*n;t++){const i=t%n,p=(i+n-1)%n;r[i]=Math.min(r[p]+L,Math.max(r[p]-L,r[i]));}for(let t=2*n-1;t>=0;t--){const i=t%n,q=(i+1)%n;r[i]=Math.min(r[q]+L,Math.max(r[q]-L,r[i]));}}}}
 }
 const v=[],f=[],rings=[],add=p=>(v.push(p),v.length-1);
 for(let jj=0;jj<nrow;jj++){const j=rowsIdx[jj],u=j/R,z=rz[jj],r0=radius(m,z),ring=[];
  for(let i=0;i<n;i++){const r=r0-(depthMM?depthMM[jj][i]:0);if(r-m.depth-m.wall<3&&!litho&&!pierced)throw Error('Cell depth leaves no inner opening. Reduce depth or enlarge the profile.');const ang=i/n*2*Math.PI+m.twist*Math.PI/180*u;ring.push(add([r*Math.cos(ang),r*Math.sin(ang),z]));}
  rings.push(ring);}
 const place=(a,b)=>{const u=b/R0,z=u*H,r=radius(m,z),ang=a/nc*2*Math.PI+m.twist*Math.PI/180*u;return [r*Math.cos(ang),r*Math.sin(ang),z];};
 const outerFaces0=[],walls=[],crossSet=new Set();let openFrac=0,ribs=false;
 if(pierced){
  const F=D.map(r=>Float64Array.from(r));
  {const T=F.map(r=>Float64Array.from(r));for(let jj=1;jj<nrow-1;jj++)for(let i=0;i<n;i++){const p=(i+n-1)%n,q=(i+1)%n;F[jj][i]=(T[jj][p]+2*T[jj][i]+T[jj][q])/4;}const T2=F.map(r=>Float64Array.from(r));for(let jj=1;jj<nrow-1;jj++)for(let i=0;i<n;i++)F[jj][i]=(T2[jj-1][i]+2*T2[jj][i]+T2[jj+1][i])/4;}
  /* solid rim band with a straight edge, blended into the holes with a small fillet */
  {const bandMM=Math.min(8,Math.max(3,.3*H/R0));for(let jj=0;jj<nrow;jj++){const pr=m.cutoff*Math.min(rz[jj],H-rz[jj])/bandMM;if(pr<1.5)for(let i=0;i<n;i++)F[jj][i]=smin(F[jj][i],pr,.12);}}
  for(let i=0;i<n;i++){F[0][i]=0;F[nrow-1][i]=0;}
  const cut=m.cutoff,kept=(jj,i)=>F[jj][i]<cut;
  // Connectivity: material must join both rims. If the holes would split the shade into separate rings
  // (wave or grain bands) or strand large islands, add smooth vertical ribs so it prints as one piece.
  const flood=both=>{const seen=new Uint8Array(nrow*n),st=[];const seed=x=>{if(!seen[x]&&F[(x/n)|0][x%n]<cut){seen[x]=1;st.push(x);}};for(let i=0;i<n;i++){seed(i);if(both)seed((nrow-1)*n+i);}
   while(st.length){const x=st.pop(),j=(x/n)|0,i=x%n;for(const [dj,di] of [[1,0],[-1,0],[0,1],[0,-1]]){const jj=j+dj,ii=(i+di+n)%n;if(jj<0||jj>=nrow)continue;const y=jj*n+ii;if(!seen[y]&&kept(jj,ii)){seen[y]=1;st.push(y);}}}return seen;};
  const islandCells=seen=>{let c=0;for(let jj=0;jj<nrow;jj++)for(let i=0;i<n;i++)if(!seen[jj*n+i]&&F[jj][i]<cut)c++;return c;};
  {let seen=flood(true);const split=!flood(false)[(nrow-1)*n];
   if(split||islandCells(seen)>.01*nrow*n){const rm=radius(m,H/2),tileW=2*Math.PI*rm/nc,half=Math.max(1.2,.08*tileW)/tileW,step=nc%2?1:2;
    for(let i=0;i<n;i++){const a=i/Kx,dd=Math.abs(a-Math.round(a/step)*step),pr=cut*dd/half;if(pr<1.5)for(let jj=0;jj<nrow;jj++)F[jj][i]=smin(F[jj][i],pr,.12);}
    ribs=true;seen=flood(true);}
   let open=0;for(let jj=0;jj<nrow;jj++)for(let i=0;i<n;i++){if(!seen[jj*n+i]&&F[jj][i]<cut){F[jj][i]=cut+(cut-F[jj][i])+.02;}if(F[jj][i]>=cut)open++;}openFrac=open/(nrow*n);}
  const cross=new Map(),cx=(key,j1,i1,a1,b1,a2,b2,f1,f2)=>{if(cross.has(key))return cross.get(key);const t=Math.min(.97,Math.max(.03,(cut-f1)/(f2-f1))),q=place(a1+(a2-a1)*t,b1+(b2-b1)*t),id=add(q);crossSet.add(id);cross.set(key,id);return id;};
  const bj=jj=>rowsIdx[jj]/Ky;
  for(let jj=0;jj<nrow-1;jj++)for(let i=0;i<n;i++){const k=(i+1)%n,fv=[F[jj][i],F[jj][k],F[jj+1][k],F[jj+1][i]],kf=fv.map(x=>x<cut),r4=[rings[jj][i],rings[jj][k],rings[jj+1][k],rings[jj+1][i]];
   const nk=kf[0]+kf[1]+kf[2]+kf[3];if(nk===0)continue;
   if(nk===4){if((i+jj)%2)outerFaces0.push([r4[0],r4[1],r4[3]],[r4[1],r4[2],r4[3]]);else outerFaces0.push([r4[0],r4[1],r4[2]],[r4[0],r4[2],r4[3]]);continue;}
   // corner coordinates (a,b) and edge crossing ids
   const co=[[i/Kx,bj(jj)],[(i+1)/Kx,bj(jj)],[(i+1)/Kx,bj(jj+1)],[i/Kx,bj(jj+1)]];
   const ek=[ 'h'+(jj*n+i),'v'+(jj*n+k),'h'+((jj+1)*n+i),'v'+(jj*n+i)];
   const X=q=>{const n2=(q+1)%4;const [p1,p2]=kf[q]?[q,n2]:[n2,q];return cx(ek[q],0,0,co[p1][0],co[p1][1],co[p2][0],co[p2][1],fv[p1],fv[p2]);};
   const saddle=nk===2&&kf[0]===kf[2];
   const emit=poly=>{for(let t=1;t<poly.length-1;t++)outerFaces0.push([poly[0].v,poly[t].v,poly[t+1].v]);for(let t=0;t<poly.length;t++){const A=poly[t],B=poly[(t+1)%poly.length];if(A.c&&B.c)walls.push([A.v,B.v]);}};
   if(saddle){for(let q=0;q<4;q++)if(kf[q])emit([{v:X((q+3)%4),c:1},{v:r4[q],c:0},{v:X(q),c:1}]);}
   else{const poly=[];for(let q=0;q<4;q++){const n2=(q+1)%4;if(kf[q])poly.push({v:r4[q],c:0});if(kf[q]!==kf[n2])poly.push({v:X(q),c:1});}emit(poly);}}
 }else{
  // Crease cutting: every grid edge first gets a vertex wherever a crease line crosses it (found by bisection on the
  // analytic texture), so neighbouring cells share the same boundary. Each cell is then split along the crease chords
  // and ear-clipped, so sharp edges are true lines instead of stair steps and the shell stays closed.
  const creasesFor=cutMode?creaseSource(src,m,w,nc):null,EX=new Map(),ON=new Map();
  const mkV=(a,b)=>{const ww=wt(b*Ky),dep=val(a,b,ww)*m.depth,u=b/R0,z=u*H,r=radius(m,z)-dep;if(r-m.depth-m.wall<3)throw Error('Cell depth leaves no inner opening. Reduce depth or enlarge the profile.');const ang=a/nc*2*Math.PI+m.twist*Math.PI/180*u;return add([r*Math.cos(ang),r*Math.sin(ang),z]);};
  const bis=(g,a0,b0,a1,b1)=>{const s0=g(a0,b0)>0;let lo=0,hi=1;for(let it=0;it<26;it++){const t=(lo+hi)/2;if((g(a0+(a1-a0)*t,b0+(b1-b0)*t)>0)===s0)lo=t;else hi=t;}return (lo+hi)/2;};
  const onAdd=(id,key)=>{let s2=ON.get(id);if(!s2)ON.set(id,s2=new Set());s2.add(key);};
  const edgeCross=(key,P,Q)=>{/* P,Q: {id,a,b}; returns sorted crossings from P to Q */let L=EX.get(key);if(L)return L;L=[];
   for(const [ck,g] of creasesFor(P.a,P.b,Q.a,Q.b)){const gp=g(P.a,P.b),gq=g(Q.a,Q.b);if((gp>0)===(gq>0))continue;const t=bis(g,P.a,P.b,Q.a,Q.b);
    if(t<2e-3){onAdd(P.id,ck);continue;}if(t>1-2e-3){onAdd(Q.id,ck);continue;}
    const hit=L.find(x=>Math.abs(x.t-t)<2e-3);if(hit){hit.on.add(ck);continue;}const a=P.a+(Q.a-P.a)*t,b=P.b+(Q.b-P.b)*t;L.push({t,id:mkV(a,b),a,b,on:new Set([ck])});}
   L.sort((x,y)=>x.t-y.t);EX.set(key,L);return L;};
  const node=(jj,i)=>({id:rings[jj][((i%n)+n)%n],a:i/Kx,b:rowsIdx[jj]/Ky});
  if(cutMode){for(let jj=0;jj<nrow;jj++)for(let i=0;i<n;i++){if(jj===0||jj===nrow-1)EX.set('h'+jj+','+i,[]);else edgeCross('h'+jj+','+i,node(jj,i),node(jj,i+1));if(jj<nrow-1){if(jj===0||jj===nrow-2)EX.set('v'+jj+','+i,[]);else edgeCross('v'+jj+','+i,node(jj,i),node(jj+1,i));}}}
  const area2=(P,Q,R)=>(Q.a-P.a)*(R.b-P.b)-(Q.b-P.b)*(R.a-P.a);
  const earclip=V=>{const L=V.length;if(L<3)return;let col=false;for(let q=0;q<L;q++)if(Math.abs(area2(V[(q+L-1)%L],V[q],V[(q+1)%L]))<1e-10){col=true;break;}
   if(!col){for(let q=1;q<L-1;q++)outerFaces0.push([V[0].id,V[q].id,V[q+1].id]);return;}
   /* collinear points on a side: fan from an interior point so no triangle collapses */let ca=0,cb=0;for(const p of V){ca+=p.a;cb+=p.b;}const C={id:mkV(ca/L,cb/L)};for(let q=0;q<L;q++){const P=V[q],Q=V[(q+1)%L];if(P.id!==Q.id)outerFaces0.push([C.id,P.id,Q.id]);}};
  const XC=new Map();let cellPts=[];
  /* vertices put on interior chords of this cell; any chord piece that passes through one gets it, so both sides match */
  const onSeg=(P,Q,out)=>{const dx=Q.a-P.a,dy=Q.b-P.b,L2=dx*dx+dy*dy;if(!L2){out.push(Q);return;}const hits=[];for(const X of cellPts){if(X.id===P.id||X.id===Q.id)continue;const t=((X.a-P.a)*dx+(X.b-P.b)*dy)/L2;if(t<=1e-6||t>=1-1e-6)continue;const ex=P.a+dx*t-X.a,ey=P.b+dy*t-X.b;if(ex*ex+ey*ey<1e-12)hits.push([t,X]);}hits.sort((u,v)=>u[0]-v[0]);for(const [,X] of hits)out.push(X);out.push(Q);};
  /* every vertex inserted on an interior chord is recorded, so the polygon on the other side of the chord gets it too */
  const polyArea=P=>{let A=0;for(let q=0;q<P.length;q++){const u=P[q],w2=P[(q+1)%P.length];A+=u.a*w2.b-w2.a*u.b;}return A/2;};
  const splitBy=(poly,key,g,cellA)=>{const V=poly.v,T=poly.t,L=V.length,zero=new Set(),SG=p=>{if(zero.has(p.id)||(p.on&&p.on.has(key))||(ON.get(p.id)?.has(key)&&p.node))return 0;const x=g(p.a,p.b);return Math.abs(x)<5e-5?0:x>0?1:-1;},sg=V.map(SG);
   if(!sg.includes(1)||!sg.includes(-1))return [poly];
   /* insert crossings on interior chords; a sign change on a cell-boundary edge without a vertex blocks this cut */
   const W=[],WT=[];for(let q=0;q<L;q++){W.push(V[q]);const nq=(q+1)%L;if(sg[q]&&sg[nq]&&sg[q]!==sg[nq]){if(T[q])return [poly];const P=V[q],Q=V[nq],ck=(P.id<Q.id?P.id+'_'+Q.id:Q.id+'_'+P.id)+'|'+key;let x=XC.get(ck);
     if(!x){const t=bis(g,P.a,P.b,Q.a,Q.b);if(t<1e-3)x={snap:P.id};else if(t>1-1e-3)x={snap:Q.id};else{const a=P.a+(Q.a-P.a)*t,b=P.b+(Q.b-P.b)*t;const near=cellPts.find(y=>Math.hypot(y.a-a,y.b-b)<1e-6);if(near)x={id:near.id,a:near.a,b:near.b};else{x={id:mkV(a,b),a,b};cellPts.push(x);}}XC.set(ck,x);}
     if(x.snap!==undefined){zero.add(x.snap);WT.push(null);continue;}
     let a=x.a;if(a-cellA>nc/2)a-=nc;else if(cellA-a>nc/2)a+=nc;WT.push(null);W.push({id:x.id,a,b:x.b,on:new Set([key])});WT.push(null);}else WT.push(T[q]);}
   const s2=W.map(SG),cuts=[];for(let q=0;q<W.length;q++)if(s2[q]===0)cuts.push(q);
   if(cuts.length!==2)return [poly];const [c1,c2]=cuts,M=W.length;if((c2-c1)<2&&(c1+M-c2)<2)return [poly];
   const A={v:[],t:[]},B={v:[],t:[]};for(let q=c1;q<=c2;q++){A.v.push(W[q]);A.t.push(q<c2?WT[q]:null);}for(let q=c2;q<=c1+M;q++){B.v.push(W[q%M]);B.t.push(q<c1+M?WT[q%M]:null);}
   if(A.v.length<3||B.v.length<3||Math.abs(polyArea(A.v))<1e-9||Math.abs(polyArea(B.v))<1e-9)return [poly];return [A,B];};
  for(let jj=0;jj<nrow-1;jj++)for(let i=0;i<n;i++){const k=(i+1)%n,a=rings[jj][i],b=rings[jj][k],c=rings[jj+1][k],d=rings[jj+1][i];let flip=(i+jj)%2;if(!litho){const j0=rowsIdx[jj],j1=rowsIdx[jj+1],hc=val((i+.5)/Kx,(j0+j1)/2/Ky,wt((j0+j1)/2)),e1=Math.abs(hc-(D[jj][i]+D[jj+1][k])/2),e2=Math.abs(hc-(D[jj][k]+D[jj+1][i])/2);if(Math.abs(e1-e2)>1e-6)flip=e2<e1;}if(!cutMode){if(flip){outerFaces0.push([a,b,d],[b,c,d]);}else{outerFaces0.push([a,b,c],[a,c,d]);}continue;}
   const b0=rowsIdx[jj]/Ky,b1=rowsIdx[jj+1]/Ky,a0=i/Kx,a1=(i+1)/Kx,cA=(a0+a1)/2,N=(id,a,b)=>({id,a,b,node:true});
   const fix=x=>{let a=x.a;if(a-cA>nc/2)a-=nc;else if(cA-a>nc/2)a+=nc;return {id:x.id,a,b:x.b,on:x.on};};
   const eb=EX.get('h'+jj+','+i),er=EX.get('v'+jj+','+k),et=EX.get('h'+(jj+1)+','+i),el=EX.get('v'+jj+','+i);
   const V=[N(a,a0,b0),...eb.map(fix),N(b,a1,b0),...er.map(fix),N(c,a1,b1),...et.slice().reverse().map(fix),N(d,a0,b1),...el.slice().reverse().map(fix)];
   if(V.length===4){if(flip){outerFaces0.push([a,b,d],[b,c,d]);}else{outerFaces0.push([a,b,c],[a,c,d]);}continue;}
   const crs=new Map();for(const [pa,pb,qa,qb] of [[a0,b0,a1,b0],[a0,b1,a1,b1],[a0,b0,a0,b1],[a1,b0,a1,b1]])for(const [key,g] of creasesFor(pa,pb,qa,qb))if(!crs.has(key))crs.set(key,g);
   cellPts=[];let polys=[{v:V,t:V.map(()=>'B')}];
   for(const key of [...crs.keys()].sort()){const g=crs.get(key),nx=[];for(const p of polys)nx.push(...splitBy(p,key,g,cA));polys=nx;}
   for(const p of polys){const out=[];for(let q=0;q<p.v.length;q++){const P=p.v[q],Q=p.v[(q+1)%p.v.length];if(p.t[q]===null)onSeg(P,Q,out);else out.push(Q);}const fin=[];for(const x of out)if(!fin.length||fin.at(-1).id!==x.id)fin.push(x);if(fin.length>1&&fin[0].id===fin.at(-1).id)fin.pop();earclip(fin);}}
 }
 for(const t of outerFaces0)f.push(t);
 const count=v.length,outerFaces=f.map(t=>t.slice());
 // inner shell
 let tmin=Math.max(.8,m.wall-m.depth);
 if(pierced){for(let x=0;x<count;x++){const p=v[x],r=Math.hypot(p[0],p[1]);v.push([p[0]*(1-m.wall/r),p[1]*(1-m.wall/r),p[2]]);}
  const drop=Math.min(m.round,.35*m.wall,Math.max(0,(m.wall-.8)/2));if(drop>0)for(const x of crossSet){const p=v[x],r=Math.hypot(p[0],p[1]);v[x]=[p[0]*(r-drop)/r,p[1]*(r-drop)/r,p[2]];v[x+count]=[p[0]*(1-(m.wall-drop)/r),p[1]*(1-(m.wall-drop)/r),p[2]];}}
 else if(litho)for(let jj=0;jj<nrow;jj++)for(let i=0;i<n;i++){const p=v[rings[jj][i]],r=Math.hypot(p[0],p[1]);const t=tmin+(m.wall-tmin)*(1-D[jj][i]);v.push([p[0]*(1-t/r),p[1]*(1-t/r),p[2]]);}
 else for(let x=0;x<count;x++){const p=v[x],r=Math.hypot(p[0],p[1]);v.push([p[0]*(1-m.wall/r),p[1]*(1-m.wall/r),p[2]]);}
 if(bottom||top){const jj=bottom?0:nrow-1,kq=bottom?1:nrow-2,z=bottom?m.plate:m.height-m.plate;for(let i=0;i<n;i++){const idx=rings[jj][i]+count,p=v[idx],q=v[rings[kq][i]+count],t=(z-p[2])/(q[2]-p[2]);if(t<=0||t>=.8)throw Error('Mount overlaps a pattern row. Reduce plate thickness or row count.');v[idx]=p.map((x,c)=>x+(q[c]-x)*t);if(!m.noHole&&Math.hypot(v[idx][0],v[idx][1])<m.hole/2+2)throw Error('Mount hole leaves insufficient material.');}}
 for(const t of outerFaces)f.push(t.map(i=>i+count).reverse());
 for(const [u,w2] of walls)f.push([w2,u,u+count],[w2,u+count,w2+count]);
 const join=(a,b,flip=false)=>{for(let i=0;i<a.length;i++){const k=(i+1)%a.length;for(const t of [[a[i],a[k],b[k]],[a[i],b[k],b[i]]])f.push(flip?t.reverse():t);}};
 for(const jj of [0,nrow-1]){const out=rings[jj],inn=out.map(i=>i+count),isBottom=jj===0;if((isBottom&&bottom)||(!isBottom&&top)){const z=isBottom?0:m.height,z1=isBottom?m.plate:m.height-m.plate;
   if(m.noHole){const capc=(r,zz,flip)=>{const c=add([0,0,zz]);for(let q=0;q<r.length;q++){const t=[c,r[q],r[(q+1)%r.length]];f.push(flip?t.reverse():t);}};capc(out,z,isBottom);capc(inn,z1,!isBottom);}
   else{const hr=zz=>out.map(i=>{const an=Math.atan2(v[i][1],v[i][0]);return add([m.hole/2*Math.cos(an),m.hole/2*Math.sin(an),zz]);});const a=hr(z),b=hr(z1);join(out,a,isBottom);join(a,b,isBottom);join(inn,b,!isBottom);}}else join(out,inn,isBottom);}
 const mesh=finish(m,v,f);
 if(pierced){const rm=radius(m,H/2),tw=2*Math.PI*rm/nc,th=H/R0;mesh.report.pierce={holeFraction:openFrac,tileMm:[tw,th],ribs};}
 if(litho)mesh.report.litho={thinnest:tmin,thickest:m.wall};
 return mesh;
}
function finish(m,v,f){let report=inspect(v,f);if(report.volume<0){f.forEach(t=>t.reverse());report=inspect(v,f);}return {settings:m,vertices:v,faces:f,report};}
function hypar(m){
 if(m.mount!=='none')throw Error('Hypar is a panel. Select open ends; annular mounts apply to tube patterns.');
 const n=m.rows*4,v=[],f=[],size=Math.max(...m.profile.map(p=>p[1])),idx=(i,j)=>j*(n+1)+i;
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
  const x=2*i/n-1,y=2*j/n-1,q=Math.max(Math.abs(x),Math.abs(y))*m.rows,pleat=1-Math.abs(q%2-1);
  v.push([x*size/2,y*size/2,x*y+pleat*m.depth/Math.max(1,m.height)]);
 }
 let lo=Math.min(...v.map(p=>p[2])),hi=Math.max(...v.map(p=>p[2]));v.forEach(p=>p[2]=(p[2]-lo)/(hi-lo)*(m.height-m.wall)+m.wall);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=idx(i,j),b=idx(i+1,j),c=idx(i+1,j+1),d=idx(i,j+1);f.push([a,b,c],[a,c,d]);}
 const N=v.length,faces=f.map(t=>t.slice());v.push(...v.map(p=>[p[0],p[1],p[2]-m.wall]));f.push(...faces.map(t=>t.map(i=>i+N).reverse()));
 const boundary=[];for(let i=0;i<n;i++)boundary.push(idx(i,0));for(let j=0;j<n;j++)boundary.push(idx(n,j));for(let i=n;i>0;i--)boundary.push(idx(i,n));for(let j=n;j>0;j--)boundary.push(idx(0,j));
 for(let k=0;k<boundary.length;k++){const a=boundary[k],b=boundary[(k+1)%boundary.length];f.push([a,a+N,b+N],[a,b+N,b]);}return finish(m,v,f);
}
function endPhase(m,top){const fl=m.pattern==='reverse'&&Array.isArray(m.creaseFlips)?m.creaseFlips:null;if(!top)return (m.rotation||0)+(fl&&fl[0]?180/m.count:0);let phase=m.rotation||0;phase+=m.twist;if(m.pattern==='reverse')phase+=(((m.profile.length-2)%2)^(fl&&fl.at(-1)?1:0))*180/m.count;if(['kresling','nojima'].includes(m.pattern))phase+=m.rows*m.skew*180/m.count;if(['yoshimura','resch'].includes(m.pattern))phase+=(m.rows%2)*90/m.count;return phase;}
function matchBelow(lower,upper){
 lower=clean(copy(lower));upper=clean(copy(upper));
 if(lower.pattern==='vase'||upper.pattern==='vase')throw Error('Vessel interfaces vary with cross-section and surface. Match these manually; automatic matching is for fold families.');
 if(lower.pattern==='hypar'||upper.pattern==='hypar')throw Error('Hypar panels cannot be joined as cylindrical sections.');
 if(lower.mount==='top'||upper.mount==='bottom')throw Error('Remove the mounting plate at this joint before matching.');
 if(lower.pattern!==upper.pattern)throw Error('Choose the same pattern on adjacent sections before matching their rims.');
 upper.planar=lower.planar;if(upper.planar)upper.twist=0;upper.count=lower.count;upper.depth=lower.depth;upper.wall=lower.wall;upper.profile[0][1]=lower.profile.at(-1)[1];upper.rotation=(((endPhase(lower,true)-(upper.pattern==='reverse'&&upper.creaseFlips?.[0]?180/upper.count:0))%360)+360)%360;
 // Straight panels scale pleat depth with each section's widest diameter, so equal rims need equal depth/width ratios.
 if(upper.planar&&upper.pattern==='pleats'){const wl=Math.max(...lower.profile.map(p=>p[1])),wu=Math.max(...upper.profile.map(p=>p[1]));upper.depth=+(lower.depth*wu/wl).toFixed(6);if(upper.depth>30)throw Error('Matching this rim needs straight-panel pleats deeper than 30 mm. Reduce the upper section’s widest diameter or the lower pleat depth.');}
 const report=seam(build(lower),build(upper));if(report.maxGap>.02)throw Error('These rims cannot be matched automatically; check endpoint geometry.');return upper;
}
// Compare actual polygon boundaries, including both inner and outer contours.
function rim(mesh,top){const z=top?mesh.settings.height:0,groups=new Map();for(const p of mesh.vertices){if(Math.abs(p[2]-z)>1e-6)continue;const a=(Math.atan2(p[1],p[0])+2*Math.PI)%(2*Math.PI),key=a.toFixed(8),r=Math.hypot(p[0],p[1]);let q=groups.get(key);if(q){q.lo=Math.min(q.lo,r);q.hi=Math.max(q.hi,r);}else groups.set(key,{a,lo:r,hi:r});}return [...groups.values()].sort((a,b)=>a.a-b.a);}
function radial(poly,a,key){let j=poly.findIndex(p=>p.a>a);if(j<0)j=0;let q=poly[j],p=poly[(j+poly.length-1)%poly.length],ax=p[key]*Math.cos(p.a),ay=p[key]*Math.sin(p.a),bx=q[key]*Math.cos(q.a),by=q[key]*Math.sin(q.a),dx=bx-ax,dy=by-ay;return (ax*dy-ay*dx)/(Math.cos(a)*dy-Math.sin(a)*dx);}
function seam(lower,upper){if(lower.settings.pattern==='hypar'||upper.settings.pattern==='hypar')return {maxGap:Infinity,matched:false};const a=rim(lower,true),b=rim(upper,false);if(a.length<3||b.length<3)return {maxGap:Infinity,matched:false};let maxGap=0;const angles=[...a,...b].map(p=>p.a).concat(Array.from({length:720},(_,i)=>i/720*2*Math.PI));for(const angle of angles)for(const k of ['lo','hi'])maxGap=Math.max(maxGap,Math.abs(radial(a,angle,k)-radial(b,angle,k)));return {maxGap,matched:maxGap<=.02};}

function texSample(kind,a,b,seed){m_P=8;const m={seed:seed||1,rows:4,imgRep:1,imgInvert:false};return (TEX[kind]||TEX.hexagon)(a,b,m,.4)[0];}
root.ShadeEngine={texSample,TEXKINDS,TEX_SOURCES,presets,copy,clean,build,inspect,stl,radius,profileRadius,families,matchBelow,seam};
if(typeof module!=='undefined')module.exports=root.ShadeEngine;
})(globalThis);
