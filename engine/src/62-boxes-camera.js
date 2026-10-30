function norm(x,y){var L=Math.hypot(x,y)||1;return {x:x/L,y:y/L};}
function nodeBox(n){var t=badged(n)?26:0;return {x:n.x-nw(n)/2,y:n.y-nh(n)/2-t,w:nw(n)+(showsInner(n)?6:0),h:nh(n)+t+(showsInner(n)?6:0)};}
function groupBox(g,l){
  var m=l.nodes.filter(function(n){return n.group===g.id;});if(!m.length)return null;
  var x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  m.forEach(function(n){var b=nodeBox(n);x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h);});
  return {x:x0-28,y:y0-46,w:x1-x0+56,h:y1-y0+74};
}
function contentBox(l){
  var x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  function add(b){if(!b)return;x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h);}
  l.nodes.forEach(function(n){add(nodeBox(n));if(n.shape==='initial'||n.shape==='final'){if(n.label)add({x:n.x-60,y:n.y,w:120,h:nh(n)/2+26});}});
  if(isSeq(l)&&l.nodes.length){add({x:l.nodes[0].x,y:0,w:1,h:seqBottom(l)});l.edges.forEach(function(e){if(e.from===e.to){var a=findNode(e.from,l);if(a)add({x:a.x,y:0,w:60+(e.label||'').length*7,h:1});}});}
  l.groups.forEach(function(g){add(groupBox(g,l));});
  if(x0===Infinity)return {x:-400,y:-250,w:800,h:500};
  return {x:x0,y:y0,w:x1-x0,h:y1-y0};
}
function frameBox(l){var b=contentBox(l),p=40;return {x:b.x-p,y:b.y-p,w:b.w+2*p,h:b.h+2*p};}
function viewTarget(){
  var l=cur();
  if(!path.length){var b=contentBox(l);return {x:b.x-20,y:b.y-20,w:b.w+40,h:b.h+40};}
  var f=frameBox(l);return {x:f.x-16,y:f.y-56,w:f.w+32,h:f.h+72};
}
function insets(){
  var small=innerWidth<700;
  var aboutL=(aboutOpen&&mode==='view'&&!small&&innerWidth>900)?372:28;
  var tb=tour?(small?230:250):0;
  return {t:presenting?70:(small?100:118),b:Math.max(small?80:84,tb),l:mode==='edit'&&!small?120:(small?12:aboutL),r:small?12:28};
}
function fitTo(box,ins){
  ins=ins||insets();
  var vw=svg.clientWidth||innerWidth,vh=svg.clientHeight||innerHeight;
  var aw=Math.max(80,vw-ins.l-ins.r),ah=Math.max(80,vh-ins.t-ins.b);
  var s=Math.max(box.w/aw,box.h/ah,0.75);
  return {x:box.x-ins.l*s-(aw*s-box.w)/2,y:box.y-ins.t*s-(ah*s-box.h)/2,w:vw*s,h:vh*s};
}
function scaleBox(b,k){var cx=b.x+b.w/2,cy=b.y+b.h/2;return {x:cx-b.w*k/2,y:cy-b.h*k/2,w:b.w*k,h:b.h*k};}
function setCam(c){cam=c;svg.setAttribute('viewBox',c.x+' '+c.y+' '+c.w+' '+c.h);svg.style.setProperty('--pz',Math.max(1,c.w/(svg.clientWidth||c.w)).toFixed(3));placeOverlays();}
function pxToWorld(px){return px*cam.w/(svg.clientWidth||cam.w);}
var animToken=0;
function animateCam(to,dur){
  if(reduceMotion||!dur){setCam(to);return Promise.resolve();}
  var from={x:cam.x,y:cam.y,w:cam.w,h:cam.h},t0=performance.now(),tok=++animToken;
  return new Promise(function(res){
    function step(now){
      if(tok!==animToken)return res();
      var t=Math.min(1,(now-t0)/dur),e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
      var w=from.w*Math.pow(to.w/from.w,e),h=from.h*Math.pow(to.h/from.h,e);
      var cx=lerp(from.x+from.w/2,to.x+to.w/2,e),cy=lerp(from.y+from.h/2,to.y+to.h/2,e);
      setCam({x:cx-w/2,y:cy-h/2,w:w,h:h});
      if(t<1)requestAnimationFrame(step);else res();
    }
    requestAnimationFrame(step);
  });
}
function toWorld(e){var r=svg.getBoundingClientRect();return {x:cam.x+(e.clientX-r.left)/r.width*cam.w,y:cam.y+(e.clientY-r.top)/r.height*cam.h};}
function toScreen(x,y){var r=svg.getBoundingClientRect(),a=$('#app').getBoundingClientRect();return {x:r.left-a.left+(x-cam.x)/cam.w*r.width,y:r.top-a.top+(y-cam.y)/cam.h*r.height,k:r.width/cam.w};}
function fitView(dur){return animateCam(fitTo(viewTarget()),dur==null?420:dur);}

