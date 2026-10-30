/* ================= tree and timeline layouts ================= */
// Trees keep the order of their edges: siblings run in that order (left to right, or top to bottom), as a behaviour tree executes.
function treeLayout(l){
  var ns=l.nodes;if(!ns.length)return;
  var dir=levelDir(l),idx={},kids={},hasP={};ns.forEach(function(n,i){idx[n.id]=i;kids[n.id]=[];});
  l.edges.forEach(function(e){if(idx[e.from]==null||idx[e.to]==null||e.from===e.to||hasP[e.to])return;kids[e.from].push(e.to);hasP[e.to]=1;});
  var cross=dir==='TB'?function(n){return nw(n);}:function(n){return nh(n);},main=dir==='TB'?function(n){return nh(n);}:function(n){return nw(n);};
  var GS=dir==='TB'?36:22,GL=dir==='TB'?70:96,depthExt=[],size={},depth={},seen={};
  function measure(id,d){
    if(seen[id])return 0;seen[id]=1;var n=ns[idx[id]];depth[id]=d;depthExt[d]=Math.max(depthExt[d]||0,main(n));
    var t=0;kids[id].forEach(function(k,i){var s=measure(k,d+1);if(s)t+=s+(t?GS:0);});
    return size[id]=Math.max(cross(n),t);
  }
  var roots=ns.filter(function(n){return !hasP[n.id];});if(!roots.length)roots=[ns[0]];
  roots.forEach(function(r){measure(r.id,0);});
  ns.forEach(function(n){if(!seen[n.id]){roots.push(n);measure(n.id,0);}});
  var mainAt=[],m=0;depthExt.forEach(function(e,d){mainAt[d]=m+e/2;m+=e+GL;});
  function place(id,start){
    var n=ns[idx[id]],c=start+size[id]/2,ks=kids[id].filter(function(k){return depth[k]===depth[id]+1;}),t=0;
    ks.forEach(function(k){t+=size[k]+(t?GS:0);});
    var at=start+(size[id]-t)/2;ks.forEach(function(k){place(k,at);at+=size[k]+GS;});
    if(dir==='TB'){n.x=snap(c);n.y=snap(mainAt[depth[id]]);}else{n.y=snap(c);n.x=snap(mainAt[depth[id]]);}
  }
  var at=0;roots.forEach(function(r){place(r.id,at);at+=size[r.id]+GS*2;});
}
// Timelines: nodes in order (or by date when every node has one), alternating above and below the axis.
function timelineLayout(l){
  var ns=l.nodes.slice();if(!ns.length)return;
  if(ns.every(function(n){return n.date;}))ns.sort(function(a,b){return String(a.date)<String(b.date)?-1:String(a.date)>String(b.date)?1:0;});
  var x=0;ns.forEach(function(n,i){var w=nw(n);if(i)x+=w*.62+16;n.x=snap(x);n.y=(i%2?1:-1)*(nh(n)/2+64);x+=w*.62;});
}
function timelineMarkup(l){
  if(levelType(l)!=='timeline'||!l.nodes.length)return '';
  var xs=l.nodes.map(function(n){return n.x;}),x0=Math.min.apply(null,xs)-70,x1=Math.max.apply(null,xs)+70,s='<g class="tl-axis"><line x1="'+x0+'" x2="'+x1+'" y1="0" y2="0"/><path d="M'+(x1-10)+' -6 '+x1+' 0 '+(x1-10)+' 6"/>';
  l.nodes.forEach(function(n){var up=n.y<0,ey=up?n.y+nh(n)/2:n.y-nh(n)/2;s+='<line class="tl-stem" x1="'+n.x+'" x2="'+n.x+'" y1="0" y2="'+ey+'"/><circle class="tl-dot" cx="'+n.x+'" cy="0" r="6" style="--nc:'+colorVar(n.color)+'"/>'+(n.date?'<text class="tl-date" x="'+n.x+'" y="'+(up?22:-12)+'">'+esc(n.date)+'</text>':'');});
  return s+'</g>';
}
function classInner(n){
  var w=nw(n),X=-w/2,Y=-nh(n)/2,s='',y=Y,f=n.fields||[],m=n.methods||[];
  if(n.stereotype){s+='<text class="cl-st" x="0" y="'+(y+16)+'">\u00ab'+esc(n.stereotype)+'\u00bb</text>';y+=14;}
  s+='<text class="cl-name" x="0" y="'+(y+25)+'">'+esc(n.label)+'</text>';y+=36;
  s+='<line class="tb-rule" x1="'+X+'" x2="'+(w/2)+'" y1="'+y+'" y2="'+y+'"/>';
  function rows(list,ph){(list.length?list:['']).forEach(function(r,i){var t=String(r),max=Math.floor((w-24)/6.9);if(t.length>max)t=t.slice(0,max-1)+'\u2026';s+='<text class="cl-row'+(list.length?'':' ph')+'" x="'+(X+12)+'" y="'+(y+15+i*20)+'">'+esc(list.length?t:(mode==='edit'?ph:''))+'<title>'+esc(r)+'</title></text>';});y+=Math.max(1,list.length)*20+4;}
  rows(f,'fields in details');
  s+='<line class="tb-rule" x1="'+X+'" x2="'+(w/2)+'" y1="'+y+'" y2="'+y+'"/>';y+=2;
  rows(m,'methods in details');
  return s;
}

