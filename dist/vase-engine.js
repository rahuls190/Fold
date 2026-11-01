/* Independent rotational vessel builder. Geometry and export use the same mesh. */
(function(root){
'use strict';
const defaults={cross:'circle',sides:6,lobes:12,amplitude:.12,custom:Array(16).fill(1),curve:'smooth',effect:'none',relief:2,density:24,bands:12,width:.3,spin:0,seed:1,output:'hollow',base:true,baseThickness:2,scaleX:1,scaleY:1,quality:'fine',finish:'matte'};
const clone=x=>JSON.parse(JSON.stringify(x));
function clean(m){const p=m.vase={...clone(defaults),...m.vase};for(const [k,list] of Object.entries({cross:['circle','polygon','wave','custom'],curve:['linear','smooth'],effect:['none','strip','double','voronoi','lowpoly'],output:['hollow','spiral'],quality:['standard','fine'],finish:['matte','silk','translucent']}))if(!list.includes(p[k]))throw Error('Unknown vessel '+k);
for(const [k,a,b,int] of [['sides',3,24,1],['lobes',3,32,1],['amplitude',0,.45],['relief',0,12],['density',4,64,1],['bands',3,32,1],['width',.25,.8],['spin',-360,360],['seed',1,9999,1],['baseThickness',.8,12],['scaleX',.25,2],['scaleY',.25,2]])if(!Number.isFinite(p[k])||p[k]<a||p[k]>b||(int&&!Number.isInteger(p[k])))throw Error('Vessel '+k+' is outside its allowed range');
if(typeof p.base!=='boolean'||!Array.isArray(p.custom)||p.custom.length!==16||p.custom.some(x=>!Number.isFinite(x)||x<.35||x>1.4))throw Error('Cross-section requires 16 radial values between 0.35 and 1.4');return p;}
function profile(m,u){const pts=m.profile;let i=0;while(i<pts.length-2&&pts[i+1][0]<u)i++;const a=pts[i],b=pts[i+1],h=b[0]-a[0],t=Math.max(0,Math.min(1,(u-a[0])/h));if(m.vase.curve==='linear')return (a[1]+(b[1]-a[1])*t)/2;
const d=pts.slice(1).map((p,j)=>(p[1]-pts[j][1])/(p[0]-pts[j][0]));const slope=k=>{if(k===0)return d[0];if(k===pts.length-1)return d.at(-1);if(d[k-1]*d[k]<=0)return 0;const h0=pts[k][0]-pts[k-1][0],h1=pts[k+1][0]-pts[k][0],w0=2*h1+h0,w1=h1+2*h0;return (w0+w1)/(w0/d[k-1]+w1/d[k]);};return ((2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*h*slope(i)+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*h*slope(i+1))/2;}
function cross(p,u){u=((u%1)+1)%1;if(p.cross==='polygon'){const a=2*Math.PI/p.sides;return Math.cos(Math.PI/p.sides)/Math.cos((u*2*Math.PI+a/2)%a-a/2);}if(p.cross==='wave')return 1-p.amplitude*(1-Math.cos(2*Math.PI*p.lobes*u))/2;if(p.cross==='custom'){const q=u*16,i=Math.floor(q),t=q-i;return p.custom[i%16]*(1-t)+p.custom[(i+1)%16]*t;}return 1;}
const hash=(x,y,s)=>{const q=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return q-Math.floor(q);};
function relief(p,u,t){if(p.effect==='none'||p.effect==='lowpoly')return 0;u-=p.spin/360*t;if(p.effect==='strip'||p.effect==='double'){const ridge=q=>{const d=Math.abs(((q+.5)%1+1)%1-.5);return d<p.width/2?(1+Math.cos(2*Math.PI*d/p.width))/2:0;};return p.relief*(p.effect==='strip'?ridge(u*p.density):Math.max(ridge(u*p.density),ridge((u+2*p.spin/360*t)*p.density)));}
const cols=Math.max(3,Math.round(Math.sqrt(p.density*2))),rows=p.bands,x=u*cols,y=t*rows;let a=Infinity,b=Infinity;for(let j=Math.floor(y)-1;j<=Math.floor(y)+1;j++)for(let i=Math.floor(x)-1;i<=Math.floor(x)+1;i++){const k=((i%cols)+cols)%cols,dx=i+.2+.6*hash(k,j,p.seed)-x,dy=j+.2+.6*hash(k,j,p.seed+1)-y,d=Math.hypot(dx,dy);if(d<a){b=a;a=d;}else b=Math.min(b,d);}return p.relief*Math.exp(-Math.pow((b-a)/(p.width*.35),2));}
function build(m,E){const p=clean(m),v=[],f=[];let n=p.quality==='fine'?256:128,steps=p.quality==='fine'?144:72;
if(p.cross==='polygon')n=Math.ceil(n/p.sides)*p.sides;if(p.cross==='custom')n=Math.ceil(n/16)*16;if(p.cross==='wave')n=Math.max(n,p.lobes*12);if(['strip','double'].includes(p.effect))n=Math.max(n,p.density*(p.quality==='fine'?16:8));if(p.effect==='lowpoly'){n=p.density;steps=p.bands;}
const add=a=>(v.push(a),v.length-1),radiusAt=(u,t)=>profile(m,t)*cross(p,u)+relief(p,u,t);
const ring=(z,inner=false,fixed=null)=>Array.from({length:n},(_,i)=>{const u=i/n,t=z/m.height,r=fixed===null?radiusAt(u,t)-(inner?m.wall:0):fixed;if(r<=1)throw Error('The wall collapses this cross-section. Enlarge it or reduce wall thickness.');const a=2*Math.PI*u+m.twist*Math.PI/180*t;return add([r*Math.cos(a),r*Math.sin(a),z]);});
const join=(a,b,flip=false)=>{for(let i=0;i<n;i++){const k=(i+1)%n;for(let t of [[a[i],a[k],b[k]],[a[i],b[k],b[i]]])f.push(flip?t.reverse():t);}};
const cap=(r,z,flip)=>{const c=add([0,0,z]);for(let i=0;i<n;i++){const t=[c,r[i],r[(i+1)%n]];f.push(flip?t.reverse():t);}};
const levels=(lo,hi)=>{const z=[lo,hi];for(let j=1;j<steps;j++){const h=m.height*j/steps;if(h>lo+1e-7&&h<hi-1e-7)z.push(h);}for(const q of m.profile){const h=q[0]*m.height;if(h>lo+1e-7&&h<hi-1e-7)z.push(h);}return [...new Set(z)].sort((a,b)=>a-b);};
const out=levels(0,m.height).map(z=>ring(z));for(let j=1;j<out.length;j++)join(out[j-1],out[j]);
if(p.output==='spiral'){cap(out[0],0,true);cap(out.at(-1),m.height,false);}else{
 const mount=m.mount!=='none',base=p.base&&!mount,lo=m.mount==='bottom'?m.plate:base?p.baseThickness:0,hi=m.mount==='top'?m.height-m.plate:m.height,inn=levels(lo,hi).map(z=>ring(z,true));for(let j=1;j<inn.length;j++)join(inn[j-1],inn[j],true);
 if(mount){const bottom=m.mount==='bottom',r=bottom?inn[0]:inn.at(-1);if(!m.noHole&&Math.min(...r.map(i=>Math.hypot(v[i][0],v[i][1])))<m.hole/2+2)throw Error('Mount hole is too large for this cross-section.');if(m.noHole){cap(bottom?out[0]:out.at(-1),bottom?0:m.height,bottom);cap(r,bottom?lo:hi,!bottom);}else{const a=ring(bottom?0:m.height,false,m.hole/2),b=ring(bottom?lo:hi,false,m.hole/2);join(bottom?out[0]:out.at(-1),a,bottom);join(a,b,bottom);join(r,b,!bottom);}if(bottom)join(out.at(-1),inn.at(-1));else join(out[0],inn[0],true);
 }else{join(out.at(-1),inn.at(-1));if(base){cap(out[0],0,true);cap(inn[0],lo,false);}else join(out[0],inn[0],true);}
}
for(const q of v){q[0]*=p.scaleX;q[1]*=p.scaleY;}let report=E.inspect(v,f);if(report.volume<0){f.forEach(t=>t.reverse());report=E.inspect(v,f);}return {vertices:v,faces:f,report,settings:m,vessel:true,spiralEnvelope:p.output==='spiral'};
}
root.VaseEngine={defaults,clean,profile,cross,relief,build};if(typeof module!=='undefined')module.exports=root.VaseEngine;
})(globalThis);
