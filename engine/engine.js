/*! unfold engine 0.4.0 | MIT License */
(function(){
'use strict';
var NS='http://www.w3.org/2000/svg';
var VERSION='0.4.0';
var SNAP=10;
var FONT_LINKS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">';
var reduceMotion=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ================= vocabulary ================= */
//@@ICONS@@
var UI={
  edit:['M4 20h4L20 8l-4-4L4 16z','M14 6l4 4'],export:['M12 4v12','M7 11l5 5 5-5','M4 20h16'],
  save:['M5 3h11l3 3v15H5z','M8 3v5h7V3','M8 21v-7h8v7'],plus:['M12 5v14M5 12h14'],minus:['M5 12h14'],
  fit:['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'],close:['M6 6l12 12M18 6 6 18'],back:['M19 12H5','M11 6l-6 6 6 6'],
  undo:['M9 14 4 9l5-5','M4 9h11a5 5 0 0 1 0 10h-3'],redo:['M15 14l5-5-5-5','M20 9H9a5 5 0 0 0 0 10h3'],
  trash:['M4 7h16','M9 7V4h6v3','M6 7l1 13h10l1-13'],copy:['r 8 8 12 12 2','M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2'],
  nest:['r 3 3 18 18 3','r 8 8 8 8 2'],open:['M15 3h6v6','M10 14 21 3','M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  group:['r 3 5 18 14 3','M7 9h5'],ungroup:['r 3 5 18 14 3','M3 9h18'],info:['c 12 12 9','M12 11v6','M12 7.5h.01'],
  bold:['M7 5h6a3.5 3.5 0 0 1 0 7H7z','M7 12h7a3.5 3.5 0 0 1 0 7H7z'],italic:['M10 5h8','M6 19h8','M14 5l-4 14'],
  tidy:['r 3 4 6 5 1','r 15 4 6 5 1','r 9 15 6 5 1','M6 9v2h12V9','M12 11v4'],reverse:['M7 7h13l-4-4','M17 17H4l4 4'],
  chev:['M6 9l6 6 6-6'],help:['c 12 12 9','M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7','M12 17h.01'],
  arrowR:['M4 12h16','M14 6l6 6-6 6'],arrowB:['M4 12h16','M14 6l6 6-6 6','M10 6l-6 6 6 6'],arrowN:['M4 12h16'],
  lineFlow:['M3 12h3M9 12h3M15 12h3'],lineSolid:['M3 12h18'],lineDot:['M4 12h.01M9 12h.01M14 12h.01M19 12h.01'],
  dirLR:['M3 12h14','M13 8l4 4-4 4','r 18 9 3 6 1'],dirTB:['M12 3v14','M8 13l4 4 4-4','r 9 18 6 3 1'],
  textsize:['M4 18 9 6l5 12','M6 14h6','M15 18l3-7 3 7','M16 16h4'],
  image:['r 3 4 18 16 2','c 9 10 2','M21 16l-5-5-9 9'],play:['M8 5l11 7-11 7z'],about:['c 12 12 9','M12 16v-4','M12 8h.01'],
  up:['M12 19V5','M6 11l6-6 6 6'],down:['M12 5v14','M6 13l6 6 6-6'],
  link:['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1','M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  'route-curved':['M4 19C12 19 12 5 20 5','c 4 19 1.5','c 20 5 1.5'],'route-orthogonal':['M4 19h8V5h8','c 4 19 1.5','c 20 5 1.5'],'route-straight':['M4 19 20 5','c 4 19 1.5','c 20 5 1.5']
};
var ROUTE_NAMES={curved:'Curved',orthogonal:'Elbow',straight:'Straight'};
var SHAPES={
  rounded:{name:'Component',w:176,h:116},
  rect:{name:'Process step',w:168,h:72},
  pill:{name:'Start / end',w:156,h:58},
  diamond:{name:'Decision',w:196,h:120},
  parallelogram:{name:'Data in / out',w:184,h:72},
  cylinder:{name:'Database / store',w:150,h:108},
  document:{name:'Document / file',w:164,h:92},
  hexagon:{name:'Preparation',w:176,h:80},
  cloud:{name:'External service',w:184,h:112},
  circle:{name:'Circle / event',w:100,h:100},
  triangle:{name:'Triangle',w:136,h:112},
  text:{name:'Text',w:180,h:40},
  table:{name:'Table / entity',w:250,h:120},
  image:{name:'Image or video',w:240,h:170},
  initial:{name:'Initial state',w:30,h:30},
  final:{name:'Final state',w:34,h:34},
  class:{name:'Class',w:240,h:120},
  person:{name:'Person',w:132,h:132},
  node3d:{name:'Server / device',w:184,h:112}
};
var SHAPE_ORDER=['rounded','rect','pill','diamond','parallelogram','cylinder','document','hexagon','cloud','table','class','person','node3d','image','circle','initial','final','triangle','text'];
var TYPE_NAMES={architecture:'Architecture',process:'Process',sequence:'Sequence',state:'State machine',data:'Data model',class:'Class diagram',c4:'C4',deployment:'Deployment',dependency:'Dependencies',tree:'Tree / mind map',behaviour:'Behaviour tree',timeline:'Timeline'};
var TYPE_HINTS={architecture:'Parts and how data moves between them',process:'Steps and decisions in order',sequence:'Who calls whom, in time order',state:'States and the events that move between them',data:'Entities, their fields and relations',
  class:'Classes, their members, inheritance and ownership',c4:'People, systems and containers, with their technology',deployment:'What runs where: machines, devices, containers',dependency:'Which module depends on which',
  tree:'A hierarchy, children in order',behaviour:'A behaviour tree: sequences, selectors and actions, run left to right',timeline:'Events in order along a time axis'};
var BT_GLYPH={sequence:'\u2192',selector:'?',parallel:'\u21c9',decorator:'\u25c7'};
var BT_NAMES={sequence:'Sequence: runs children in order until one fails',selector:'Selector: tries children in order until one succeeds',parallel:'Parallel: runs children together',decorator:'Decorator: changes its child\u2019s result',action:'Action',condition:'Condition'};
var REL={inherits:{st:'solid',end:'tri'},implements:{st:'dashed',end:'tri'},composition:{st:'solid',start:'dia'},aggregation:{st:'solid',start:'odia'},association:{st:'solid',end:'open'},dependency:{st:'dashed',end:'open'}};
var SEQ={gap:70,first:84,step:54};
var COLORS=['blue','teal','amber','rose','violet','slate','neutral'];
var KIND_TO_COLOR={core:'blue',data:'teal',infra:'amber',interface:'rose',external:'slate'};
var FS={s:12.5,m:14.5,l:18};

function shapes(spec){
  return spec.map(function(s){
    var p=s.split(' ');
    if(p[0]==='c')return '<circle cx="'+p[1]+'" cy="'+p[2]+'" r="'+p[3]+'"/>';
    if(p[0]==='r')return '<rect x="'+p[1]+'" y="'+p[2]+'" width="'+p[3]+'" height="'+p[4]+'" rx="'+(p[5]||0)+'"/>';
    if(p[0]==='e')return '<ellipse cx="'+p[1]+'" cy="'+p[2]+'" rx="'+p[3]+'" ry="'+p[4]+'"/>';
    return '<path d="'+s+'"/>';
  }).join('');
}
function uiIcon(name,size){size=size||18;var spec=UI[name]||ICONS[name];return '<svg class="ui-i" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" aria-hidden="true">'+(spec?shapes(spec):'')+'</svg>';}
function shapeIcon(shape,size){
  size=size||26;var n={shape:shape,w:SHAPES[shape].w,h:SHAPES[shape].h};
  var k=Math.min((size-4)/n.w,(size-4)/n.h)*(shape==='text'?1:1);
  if(shape==='text')return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" aria-hidden="true"><text x="12" y="17" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">T</text></svg>';
  return '<svg viewBox="'+(-size/2)+' '+(-size/2)+' '+size+' '+size+'" width="'+size+'" height="'+size+'" aria-hidden="true"><g transform="scale('+k+')" class="ps-wrap">'+shapeSVG(n,'ps',1.5/k)+'</g></svg>';
}

/* ================= helpers ================= */
function $(s,r){return (r||document).querySelector(s);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36);}
function slug(s){return (String(s||'unfold').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'unfold');}
function snap(v,free){return free?Math.round(v):Math.round(v/SNAP)*SNAP;}
function clone(o){return JSON.parse(JSON.stringify(o));}
function nw(n){return n.w||(SHAPES[n.shape]||SHAPES.rounded).w;}
function nh(n){if(n.h)return n.h;if(n.shape==='table')return 46+Math.max(1,(n.fields||[]).length)*24;if(n.shape==='class')return 44+Math.max(1,(n.fields||[]).length)*20+Math.max(1,(n.methods||[]).length)*20+(n.stereotype?14:0);return (SHAPES[n.shape]||SHAPES.rounded).h;}
function colorVar(c){return COLORS.indexOf(c)>=0?'var(--c-'+c+')':(/^#[0-9a-f]{3,8}$/i.test(c||'')?c:'var(--c-blue)');}
function roleVar(r){return r==='input'?'var(--in)':r==='output'?'var(--out)':'transparent';}
function levelType(l){return TYPE_NAMES[l&&l.type]?l.type:'architecture';}
function levelDir(l){return l.direction==='TB'||l.direction==='LR'?l.direction:({process:1,class:1,behaviour:1,dependency:1}[levelType(l)]?'TB':'LR');}
function defShape(l){return {process:'rect',state:'pill',data:'table',class:'class',deployment:'node3d',dependency:'rect',tree:'pill',behaviour:'rect'}[levelType(l)]||'rounded';}
function defStyle(l){var t=levelType(l);return t==='architecture'||t==='process'||t==='c4'?'flow':'solid';}
function defArrow(l){return {data:1,tree:1,behaviour:1,timeline:1}[levelType(l)]?'none':'end';}
function isTree(l){var t=levelType(l);return t==='tree'||t==='behaviour';}
// every level type has one layout: sequences by order, trees by hierarchy, timelines along an axis, the rest layered
function layoutAny(l){var t=levelType(l);if(t==='sequence')seqLayout(l);else if(isTree(l))treeLayout(l);else if(t==='timeline')timelineLayout(l);else autoLayout(l);}
function isSeq(l){return levelType(l)==='sequence';}
function mediaType(m){if(!m||!m.src)return null;if(m.type)return m.type;var s=String(m.src);if(/^data:video\/|\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(s))return 'video';if(/youtube\.com|youtu\.be|vimeo\.com|\/embed\//i.test(s))return 'embed';return 'image';}
// a node holds one media item (an object) or several (an array); strings are shorthand for {src}
function mediaList(n){var m=n&&n.media;if(!m)return [];return (Array.isArray(m)?m:[m]).map(function(x){return typeof x==='string'?{src:x}:x;}).filter(function(x){return x&&typeof x.src==='string'&&x.src;});}
function setMedia(n,list){if(!list.length)delete n.media;else n.media=list.length===1?list[0]:list;}
function firstSentence(t,max){t=String(t||'').trim();var m=t.match(/^[\s\S]*?[.!?](\s|$)/);t=(m?m[0]:t).trim();return t.length>max?t.slice(0,max-1)+'\u2026':t;}

/* ================= state ================= */
var data,originalJSON,draftKey;
var path=[],cam={x:0,y:0,w:1000,h:600};
var mode='view';
var sel={nodes:[],edge:null,group:null};
var pop=null,detailId=null,traceId=null;
var busy=false,dirty=false,spaceDown=false;
var undoStack=[],redoStack=[],clipboard=null;
var artifactCap=null,downloadsCap=null,readOnly=false;
var svg,scene,overlay,inlineEd=null;

function levelAt(p){
  var l=data.root;
  for(var i=0;i<p.length;i++){
    var n=l.nodes.find(function(x){return x.id===p[i];});
    if(!n||!n.children)return null;l=n.children;
  }
  return l;
}
function cur(){return levelAt(path);}
function findNode(id,l){l=l||cur();return l.nodes.find(function(n){return n.id===id;});}
function hasInner(n){return !!(n&&n.children&&n.children.nodes&&n.children.nodes.length);}
function showsInner(n){return hasInner(n)||(mode==='edit'&&n&&!!n.children);}
function pathLabels(p){
  var out=[],l=data.root;
  for(var i=0;i<p.length;i++){var n=l.nodes.find(function(x){return x.id===p[i];});if(!n)break;out.push(n.label);if(!n.children)break;l=n.children;}
  return out;
}
function uid(l,base){
  base=slug(base||'n').slice(0,18)||'n';var id=base,i=2;
  while(l.nodes.some(function(n){return n.id===id;}))id=base+'-'+(i++);
  return id;
}
function hasSel(){return sel.nodes.length||sel.edge!=null||sel.group!=null;}
function setSel(s){sel={nodes:s.nodes||[],edge:s.edge==null?null:s.edge,group:s.group||null};pop=null;renderScene();renderToolbar();}

/* ================= normalize & migrate ================= */
function normalize(d){
  if(!d||typeof d!=='object')throw new Error('Data must be an object.');
  d.meta=d.meta||{};if(!d.meta.title)d.meta.title='Untitled system';
  d.root=d.root||{nodes:[],edges:[]};
  var legacyKinds=d.kinds||{};
  normLevel(d.root,legacyKinds,true);
  delete d.kinds;
  d.version=2;
  return d;
}
function normLevel(l,kinds,isRoot){
  l.nodes=Array.isArray(l.nodes)?l.nodes:[];l.edges=Array.isArray(l.edges)?l.edges:[];l.groups=Array.isArray(l.groups)?l.groups:[];
  if(!TYPE_NAMES[l.type])l.type='architecture';
  var ids={};
  // v1 groups were rectangles: convert to membership
  l.groups.forEach(function(g,i){
    if(!g.id)g.id='g'+(i+1);
    if(!g.color&&g.kind){g.color=KIND_TO_COLOR[g.kind]||'slate';}
    if(isFinite(g.w)&&isFinite(g.h)){
      l.nodes.forEach(function(n){if(!n.group&&n.x>=g.x&&n.x<=g.x+g.w&&n.y>=g.y&&n.y<=g.y+g.h)n.group=g.id;});
    }
    delete g.x;delete g.y;delete g.w;delete g.h;delete g.kind;
  });
  var gids={};l.groups.forEach(function(g){gids[g.id]=1;});
  l.nodes.forEach(function(n){
    if(!n.id||ids[n.id])n.id=uid({nodes:l.nodes.filter(function(x){return x!==n;})},n.label||'n');
    ids[n.id]=1;
    if(n.label==null)n.label=n.id;
    if(!SHAPES[n.shape])n.shape=levelType(l)==='behaviour'&&n.bt==='condition'?'pill':defShape(l);
    if(typeof n.fields==='string')n.fields=n.fields.split('\n');
    if(typeof n.methods==='string')n.methods=n.methods.split('\n');
    if(n.media!=null)setMedia(n,mediaList(n));
    if(isSeq(l)&&['rounded','rect','pill','parallelogram','hexagon','cylinder','cloud','document'].indexOf(n.shape)>=0){if(!n.h)n.h=n.icon?92:60;if(!n.w)n.w=Math.max(124,Math.min(176,String(n.label).length*8.4+40));}
    if(!n.color&&n.kind){var kc=kinds[n.kind]&&kinds[n.kind].color;n.color=kc||KIND_TO_COLOR[n.kind]||'blue';}
    delete n.kind;delete n.stats;
    if(typeof n.source==='string')n.source=[n.source];
    if(n.group&&!gids[n.group])delete n.group;
    if(n.role!=='input'&&n.role!=='output')delete n.role;
    if(n.children)normLevel(n.children,kinds,false);
  });
  l.edges=l.edges.filter(function(e){return e&&ids[e.from]&&ids[e.to]&&(e.from!==e.to||isSeq(l));});
  var missing=l.nodes.some(function(n){return !isFinite(n.x)||!isFinite(n.y)||n.x===null||n.y===null;});
  if(isSeq(l))seqLayout(l);else if(missing)layoutAny(l);
}

/* ================= sequence layout ================= */
function seqTop(l){return Math.max.apply(null,[30].concat(l.nodes.map(function(n){return nh(n)/2;})));}
function seqY(l,i){return seqTop(l)+SEQ.first+i*SEQ.step;}
function seqBottom(l){return seqY(l,Math.max(0,l.edges.length))+10;}
function seqLayout(l){
  var x=0;
  l.nodes.forEach(function(n,i){var w=nw(n);if(i)x+=SEQ.gap+w/2;n.x=snap(x);n.y=0;x+=w/2;});
}
/* ================= layered auto-layout ================= */
// With no direction set, try both and keep the one that fits a landscape screen best.
function autoLayout(l){
  var dirs=(l.direction==='LR'||l.direction==='TB')?[l.direction]:['LR','TB'];
  var pref=l.direction||(levelType(l)==='process'?'TB':'LR'),best=null;
  dirs.forEach(function(d){
    for(var k=1;k<=3;k++){
      l.direction=d;var L=layoutLevel(l,k);if(k>1&&(L<7||L<=k*3))break;
      var b=contentBox(l),sc=Math.min(1400/Math.max(b.w,1),760/Math.max(b.h,1))*(d===pref?1.25:1)*Math.pow(.85,k-1);
      if(!best||sc>best.s)best={s:sc,d:d,pos:l.nodes.map(function(n){return [n.x,n.y];})};
    }
  });
  l.direction=best.d;l.nodes.forEach(function(n,i){n.x=best.pos[i][0];n.y=best.pos[i][1];});
}
// Pack items along a line in their given order: each wants a centre, neighbours keep a gap, all stay in [lo,hi].
// Least-squares fit by pooling adjacent violators.
function packLine(want,size,gap,lo,hi){
  var n=want.length,off=[0],i;
  for(i=1;i<n;i++)off[i]=off[i-1]+(size[i-1]+size[i])/2+gap[i];
  var bl=[];
  for(i=0;i<n;i++){bl.push({s:want[i]-off[i],c:1});while(bl.length>1&&bl[bl.length-2].s/bl[bl.length-2].c>bl[bl.length-1].s/bl[bl.length-1].c){var t=bl.pop();bl[bl.length-1].s+=t.s;bl[bl.length-1].c+=t.c;}}
  var L=lo+size[0]/2,H=hi-size[n-1]/2-off[n-1],out=[],k=0;
  bl.forEach(function(b){var v=clamp(b.s/b.c,L,Math.max(L,H));for(var j=0;j<b.c;j++,k++)out.push(v+off[k]);});
  return out;
}
function layoutLevel(l,chunks){
  var ns=l.nodes,N=ns.length;if(!N)return 0;chunks=chunks||1;
  var dir=levelDir(l),idx={};ns.forEach(function(n,i){idx[n.id]=i;});
  var out=ns.map(function(){return [];});
  // inheritance points from child to parent, but parents sit first
  l.edges.forEach(function(e){var a=idx[e.from],b=idx[e.to];if(a==null||b==null||a===b)return;if(e.rel==='inherits'||e.rel==='implements'){var t=a;a=b;b=t;}if(out[a].indexOf(b)<0)out[a].push(b);});
  // break cycles with a DFS that starts from inputs, then sources
  var hasIn=new Array(N).fill(false);out.forEach(function(vs){vs.forEach(function(v){hasIn[v]=true;});});
  var order=[];ns.forEach(function(n,i){if(n.role==='input')order.push(i);});
  ns.forEach(function(n,i){if(order.indexOf(i)<0&&!hasIn[i])order.push(i);});
  ns.forEach(function(n,i){if(order.indexOf(i)<0)order.push(i);});
  var st=new Array(N).fill(0),dag=ns.map(function(){return [];}),seen=[];
  function dfs(u){st[u]=1;seen.push(u);out[u].forEach(function(v){if(st[v]===1){if(dag[v].indexOf(u)<0)dag[v].push(u);}else{if(dag[u].indexOf(v)<0)dag[u].push(v);if(!st[v])dfs(v);}});st[u]=2;}
  order.forEach(function(u){if(!st[u])dfs(u);});
  var pred=ns.map(function(){return [];});dag.forEach(function(vs,u){vs.forEach(function(v){pred[v].push(u);});});
  // longest-path layering (Kahn)
  var indeg=pred.map(function(p){return p.length;}),layer=new Array(N).fill(0),q=[];
  for(var i=0;i<N;i++)if(!indeg[i])q.push(i);
  while(q.length){var u=q.shift();dag[u].forEach(function(v){layer[v]=Math.max(layer[v],layer[u]+1);if(--indeg[v]===0)q.push(v);});}
  // pull plain sources (not marked inputs) right, next to their first consumer
  for(var pass=0;pass<2;pass++)ns.forEach(function(n,i){if(!pred[i].length&&dag[i].length){var m=Math.min.apply(null,dag[i].map(function(v){return layer[v];}));layer[i]=Math.max(layer[i],m-1);}});
  var maxL=Math.max.apply(null,layer);
  ns.forEach(function(n,i){if(n.role==='output'&&!dag[i].length)layer[i]=Math.max(layer[i],maxL);});
  // an edge that skips layers gets a placeholder in each layer it crosses: ordering then sees it, and a lane is kept free for its route
  var S=dag.map(function(v){return v.slice();}),P=pred.map(function(v){return v.slice();}),grp=ns.map(function(n){return n.group||'';}),M=N,gr={};
  ns.forEach(function(n,i){var k=grp[i],r=gr[k]=gr[k]||{a:Infinity,b:-Infinity};r.a=Math.min(r.a,layer[i]);r.b=Math.max(r.b,layer[i]);});
  function within(k,L){var r=gr[k];return !!r&&L>=r.a&&L<=r.b;}
  for(var u0=0;u0<N;u0++)dag[u0].forEach(function(v){
    var span=layer[v]-layer[u0];if(span<2)return;
    S[u0].splice(S[u0].indexOf(v),1);P[v].splice(P[v].indexOf(u0),1);
    var prev=u0;
    for(var k=1;k<span;k++){var d=M++,L1=layer[u0]+k;layer[d]=L1;grp[d]=within(grp[u0],L1)?grp[u0]:within(grp[v],L1)?grp[v]:'';S[d]=[];P[d]=[prev];S[prev].push(d);prev=d;}
    S[prev].push(v);P[v].push(prev);
  });
  var layers=[];for(var L=0;L<=maxL;L++)layers.push([]);
  seen.forEach(function(u){layers[layer[u]].push(u);});
  for(var d0=N;d0<M;d0++)layers[layer[d0]].push(d0);
  var pos=new Array(M).fill(0);
  layers.forEach(function(ly){ly.forEach(function(u,k){pos[u]=k-(ly.length-1)/2;});});
  var gOrder={};l.groups.forEach(function(g,k){gOrder[g.id]=k;});
  function sweep(down){
    var seq=down?layers.slice(1):layers.slice(0,-1).reverse();
    seq.forEach(function(ly){
      var bc={};
      ly.forEach(function(u){
        var nb=down?P[u]:S[u];
        bc[u]=nb.length?nb.reduce(function(s,v){return s+pos[v];},0)/nb.length:pos[u];
      });
      // cluster by group so members stay together
      var clusters={},keys=[];
      ly.forEach(function(u){var k=grp[u]?'g:'+grp[u]:'n:'+u;if(!clusters[k]){clusters[k]=[];keys.push(k);}clusters[k].push(u);});
      keys.forEach(function(k){clusters[k].sort(function(a,b){return bc[a]-bc[b];});});
      var cb={};keys.forEach(function(k){cb[k]=clusters[k].reduce(function(s,u){return s+bc[u];},0)/clusters[k].length;});
      keys.sort(function(a,b){return cb[a]-cb[b];});
      var res=[];keys.forEach(function(k){res=res.concat(clusters[k]);});
      ly.length=0;Array.prototype.push.apply(ly,res);
      ly.forEach(function(u,k){pos[u]=k-(ly.length-1)/2;});
    });
  }
  for(var it=0;it<8;it++)sweep(it%2===0);
  // coordinates: each group gets its own band across the cross axis, so group boxes never overlap
  var GAPM=dir==='LR'?110:80,GAPC=dir==='LR'?56:64,BAND=l.groups.length?120:GAPC,LANE=14;
  var main=function(u){return u>=N?0:dir==='LR'?nw(ns[u]):nh(ns[u]);};
  var crossS=function(u){return u>=N?LANE:dir==='LR'?nh(ns[u]):nw(ns[u]);};
  var gapOf=function(a,b){return a>=N||b>=N?22:GAPC;};
  var bands={},bkeys=[];
  layers.forEach(function(ly,li){ly.forEach(function(u){var k=grp[u];if(!bands[k]){bands[k]={sum:0,c:0,size:0,a:li,b:li};bkeys.push(k);}var B=bands[k];B.sum+=pos[u];B.c++;B.a=Math.min(B.a,li);B.b=Math.max(B.b,li);});});
  bkeys.sort(function(a,b){return bands[a].sum/bands[a].c-bands[b].sum/bands[b].c;});
  function span(mem){var t=0;mem.forEach(function(u,i){t+=crossS(u)+(i?gapOf(mem[i-1],u):0);});return t;}
  var perLayer=layers.map(function(ly){
    var m={};bkeys.forEach(function(k){m[k]=ly.filter(function(u){return grp[u]===k;}).sort(function(a,b){return pos[a]-pos[b];});});
    bkeys.forEach(function(k){bands[k].size=Math.max(bands[k].size,span(m[k]));});
    return m;
  });
  // bands only need their own cross-axis room where their layers overlap; groups that follow one another share a line
  var placed=[],lo0=Infinity,hi0=-Infinity;
  bkeys.forEach(function(k){
    var B=bands[k],c=0,clash=placed.filter(function(o){return o.a<=B.b&&B.a<=o.b;});
    if(clash.length){
      var cand=[0];clash.forEach(function(o){cand.push(o.c+(o.size+B.size)/2+BAND,o.c-(o.size+B.size)/2-BAND);});
      cand=cand.filter(function(x){return clash.every(function(o){return Math.abs(x-o.c)>=(o.size+B.size)/2+BAND-1;});});
      cand.sort(function(x,y){return Math.abs(x)-Math.abs(y)||y-x;});c=cand[0];
    }
    B.c=c;B.start=c-B.size/2;placed.push(B);lo0=Math.min(lo0,B.start);hi0=Math.max(hi0,B.start+B.size);
  });
  var total=hi0-lo0;bkeys.forEach(function(k){bands[k].start-=lo0+total/2;bands[k].c-=lo0+total/2;});
  // long flows wrap into several columns (TB) or rows (LR)
  var R=Math.ceil(layers.length/chunks),CH=140,mpos=0,mainAt=[],coffAt=[],cr=new Array(M);
  layers.forEach(function(ly,li){
    if(li%R===0)mpos=0;
    coffAt[li]=Math.floor(li/R)*(total+CH);
    var ext=ly.length?Math.max.apply(null,ly.map(main)):0;
    mainAt[li]=mpos+ext/2;
    bkeys.forEach(function(k){
      var mem=perLayer[li][k];if(!mem.length)return;
      var c=bands[k].start+(bands[k].size-span(mem))/2;
      mem.forEach(function(u,i){if(i)c+=gapOf(mem[i-1],u);var sz=crossS(u);cr[u]=c+sz/2;c+=sz;});
    });
    if(ly.length)mpos+=ext+GAPM;
  });
  // straighten: pull each item to the median of its neighbours, keeping the order, the gaps and its group band
  function median(a){a=a.slice().sort(function(x,y){return x-y;});var m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;}
  for(var it2=0;it2<8;it2++){
    var down=it2%2===0,lis=layers.map(function(_,i){return i;});if(!down)lis.reverse();
    lis.forEach(function(li){
      bkeys.forEach(function(k){
        var mem=perLayer[li][k];if(!mem.length)return;
        // real nodes line up with real neighbours first, so a chain stays straight even when long edges pass beside it
        var want=mem.map(function(u){var nb=(down?P[u]:S[u]).concat(it2>3?(down?S[u]:P[u]):[]),rn=u<N?nb.filter(function(v){return v<N;}):nb;if(rn.length)nb=rn;return nb.length?median(nb.map(function(v){return cr[v];})):cr[u];});
        var got=packLine(want,mem.map(crossS),mem.map(function(u,i){return i?gapOf(mem[i-1],u):0;}),bands[k].start,bands[k].start+bands[k].size);
        mem.forEach(function(u,i){cr[u]=got[i];});
      });
    });
  }
  layers.forEach(function(ly,li){ly.forEach(function(u){if(u>=N)return;var c=cr[u]+coffAt[li];if(dir==='LR'){ns[u].x=snap(mainAt[li]);ns[u].y=snap(c);}else{ns[u].y=snap(mainAt[li]);ns[u].x=snap(c);}});});
  return layers.length;
}

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

/* ================= geometry ================= */
function wavH(h){return Math.min(14,h*.16);}
function shapeSVG(n,cls,sw){
  var w=nw(n),h=nh(n),X=-w/2,Y=-h/2,c=cls||'sh',st=sw?' stroke-width="'+sw+'"':'',k;
  switch(n.shape){
    case 'rect':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="4"'+st+'/>';
    case 'pill':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="'+h/2+'"'+st+'/>';
    case 'diamond':return '<polygon class="'+c+'" points="0,'+Y+' '+w/2+',0 0,'+h/2+' '+X+',0"'+st+'/>';
    case 'parallelogram':k=Math.min(26,w*.16);return '<polygon class="'+c+'" points="'+(X+k)+','+Y+' '+w/2+','+Y+' '+(w/2-k)+','+h/2+' '+X+','+h/2+'"'+st+'/>';
    case 'circle':return '<ellipse class="'+c+'" cx="0" cy="0" rx="'+w/2+'" ry="'+h/2+'"'+st+'/>';
    case 'triangle':return '<polygon class="'+c+'" points="0,'+Y+' '+w/2+','+h/2+' '+X+','+h/2+'"'+st+'/>';
    case 'hexagon':k=Math.min(24,w*.16);return '<polygon class="'+c+'" points="'+(X+k)+','+Y+' '+(w/2-k)+','+Y+' '+w/2+',0 '+(w/2-k)+','+h/2+' '+(X+k)+','+h/2+' '+X+',0"'+st+'/>';
    case 'cylinder':k=Math.min(14,h*.14);
      return '<path class="'+c+'" d="M'+X+','+(Y+k)+' V'+(h/2-k)+' A'+w/2+','+k+' 0 0 0 '+w/2+','+(h/2-k)+' V'+(Y+k)+' A'+w/2+','+k+' 0 0 0 '+X+','+(Y+k)+'Z"'+st+'/>'+
        '<ellipse class="'+(c==='sh'?'sh-top':c)+'" cx="0" cy="'+(Y+k)+'" rx="'+w/2+'" ry="'+k+'"'+st+'/>';
    case 'document':k=wavH(h);
      return '<path class="'+c+'" d="M'+X+','+Y+' H'+w/2+' V'+(h/2-k)+' C'+(w/4)+','+(h/2+k*.7)+' '+(-w/4)+','+(h/2-k*2.3)+' '+X+','+(h/2-k*.6)+'Z"'+st+'/>';
    case 'cloud':
      var P=function(u,v){return (X+u*w).toFixed(1)+','+(Y+v*h).toFixed(1);};
      var A=function(r,u,v){return ' A'+(r*w).toFixed(1)+','+(r*h*1.25).toFixed(1)+' 0 0 1 '+P(u,v);};
      return '<path class="'+c+'" d="M'+P(.24,.9)+A(.17,.09,.56)+A(.2,.3,.2)+A(.22,.66,.14)+A(.19,.92,.46)+A(.17,.76,.9)+'Z"'+st+'/>';
    case 'text':return '<rect class="'+(c==='sh'?'sh-hit':c)+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="6"/>';
    case 'initial':return '<circle class="'+c+' fill-solid" cx="0" cy="0" r="'+w/2+'"'+st+'/>';
    case 'final':return '<circle class="'+c+'" cx="0" cy="0" r="'+w/2+'"'+st+'/><circle class="'+(c==='sh'?'sh fill-solid':c)+'" cx="0" cy="0" r="'+(w/2-6)+'"/>';
    case 'table':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="10"'+st+'/>'+
      '<path class="'+(c==='sh'?'sh-top':c)+'" d="M'+X+','+(Y+40)+' V'+(Y+10)+' Q'+X+','+Y+' '+(X+10)+','+Y+' H'+(w/2-10)+' Q'+w/2+','+Y+' '+w/2+','+(Y+10)+' V'+(Y+40)+'Z"'+st+'/>';
    case 'image':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="12"'+st+'/>';
    case 'class':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="6"'+st+'/>';
    case 'person':k=Math.min(w,h)*.17;
      return '<circle class="'+c+'" cx="0" cy="'+(Y+k+1)+'" r="'+k+'"'+st+'/><rect class="'+c+'" x="'+X+'" y="'+(Y+2*k+6)+'" width="'+w+'" height="'+(h-2*k-6)+'" rx="'+Math.min(28,w*.22)+'"'+st+'/>';
    case 'node3d':k=Math.min(14,w*.08);
      return '<path class="'+c+'" d="M'+X+','+(Y+k)+' L'+(X+k)+','+Y+' H'+(w/2)+' V'+(h/2-k)+' L'+(w/2-k)+','+(h/2)+' H'+X+' Z"'+st+'/>'+
        '<path class="'+(c==='sh'?'sh-top':c)+'" d="M'+X+','+(Y+k)+' L'+(X+k)+','+Y+' H'+(w/2)+' L'+(w/2-k)+','+(Y+k)+' Z M'+(w/2-k)+','+(Y+k)+' L'+(w/2)+','+Y+' V'+(h/2-k)+' L'+(w/2-k)+','+(h/2)+' Z"'+st+'/>';
    default:return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="16"'+st+'/>';
  }
}
function textBox(n){
  // usable width factor and vertical centre offset for each shape
  var w=nw(n),h=nh(n),f=1,dy=0;
  switch(n.shape){
    case 'diamond':f=.56;break;case 'triangle':f=.5;dy=h*.18;break;case 'circle':f=.72;break;
    case 'hexagon':f=.8;break;case 'parallelogram':f=.8;break;case 'cloud':f=.66;dy=h*.05;break;
    case 'cylinder':dy=Math.min(14,h*.14)*.6;break;case 'document':dy=-wavH(h)*.4;break;case 'pill':f=.86;break;
  }
  if(n.shape==='image')return {w:w-24,h:30,dy:h/2-19};
  if(n.shape==='person'){var hk=Math.min(w,h)*.17,top=-h/2+2*hk+6;return {w:w-24,h:(h/2-top)*.86,dy:(top+h/2)/2};}
  if(n.shape==='node3d'){var dk=Math.min(14,w*.08);return {w:w-24-dk,h:(h-dk)*.82,dy:dk/2};}
  return {w:Math.max(30,(w-24)*f),h:h*(n.shape==='diamond'||n.shape==='triangle'?.55:.82),dy:dy};
}
function wrapText(text,maxc){
  var out=[];
  String(text||'').split('\n').forEach(function(par){
    var words=par.split(/\s+/).filter(Boolean),cur='';
    if(!words.length){out.push('');return;}
    words.forEach(function(w){
      while(w.length>maxc){if(cur){out.push(cur);cur='';}out.push(w.slice(0,maxc));w=w.slice(maxc);}
      if(!cur)cur=w;else if((cur+' '+w).length<=maxc)cur+=' '+w;else{out.push(cur);cur=w;}
    });
    if(cur)out.push(cur);
  });
  return out;
}
function iconShown(n){return !!n.icon&&nh(n)>=88&&['diamond','triangle','text','table','class','person','image','initial','final'].indexOf(n.shape)<0;}
function port(n,side){
  var w=nw(n),h=nh(n),ix=w/2,iy=h/2,ext=showsInner(n)?6:0;
  if(n.shape==='parallelogram')ix=w/2-Math.min(26,w*.16)/2;
  if(n.shape==='triangle')ix=w/4;
  var by=iy;if(n.shape==='document')by=iy-wavH(h)*.35;
  if(side==='l')return {x:n.x-ix,y:n.y,dx:-1,dy:0};
  if(side==='r')return {x:n.x+ix+ext,y:n.y,dx:1,dy:0};
  if(side==='t')return {x:n.x,y:n.y-iy-(n.tag?0:0),dx:0,dy:-1};
  return {x:n.x,y:n.y+by+ext,dx:0,dy:1};
}
function sides(a,b,dir){
  var dx=b.x-a.x,dy=b.y-a.y,horiz;
  if(dir==='LR'){
    if(dx<-20&&Math.abs(dy)<(nh(a)+nh(b))*.75)return ['t','t'];
    horiz=Math.abs(dx)*100*1.6>Math.abs(dy)*170;
  }else{
    if(dy<-20&&Math.abs(dx)<(nw(a)+nw(b))*.5)return ['r','r'];
    if(dy<-20)return dx>=0?['r','l']:['l','r'];
    horiz=Math.abs(dx)*100*.6>Math.abs(dy)*170;
  }
  if(horiz)return dx>=0?['r','l']:['l','r'];
  return dy>=0?['b','t']:['t','b'];
}
function sideToward(n,p){var dx=(p.x-n.x)/(nw(n)/2),dy=(p.y-n.y)/(nh(n)/2);return Math.abs(dx)>=Math.abs(dy)?(dx>=0?'r':'l'):(dy>=0?'b':'t');}
// a port moved o along its side, kept on the outline of slanted and round shapes
function portAt(n,side,o){
  var p=port(n,side);if(!o)return p;
  var h=nh(n),w=nw(n),hz=side==='l'||side==='r',half=hz?h/2:w/2,k;
  if(hz){
    p.y+=o;
    if(n.shape==='diamond')p.x=n.x+(p.x-n.x)*(1-Math.abs(o)/half);
    else if(n.shape==='circle')p.x=n.x+(p.x-n.x)*Math.sqrt(Math.max(0,1-o*o/(half*half)));
    else if(n.shape==='parallelogram'){k=Math.min(26,w*.16);p.x=n.x+(side==='l'?-w/2+k*(.5-o/h):w/2-k*(.5+o/h));}
    else if(n.shape==='hexagon'){k=Math.min(24,w*.16);p.x=n.x+(side==='l'?-1:1)*(w/2-k*Math.abs(o)/half);}
  }else{
    p.x+=o;
    if(n.shape==='diamond')p.y=n.y+(p.y-n.y)*(1-Math.abs(o)/half);
    else if(n.shape==='circle')p.y=n.y+(p.y-n.y)*Math.sqrt(Math.max(0,1-o*o/(half*half)));
  }
  return p;
}
function spreadOf(n,side,m){
  if(m<2||['initial','final','triangle'].indexOf(n.shape)>=0)return 0;
  var len=(side==='l'||side==='r'?nh(n):nw(n))*(n.shape==='diamond'||n.shape==='circle'?.4:.66);
  return Math.min(18,len/(m-1));
}
function levelRoute(l){return l.route==='orthogonal'||l.route==='straight'||l.route==='curved'?l.route:({tree:1,behaviour:1,class:1}[levelType(l)]?'orthogonal':'curved');}
function edgeRoute(e,l){return e.route==='orthogonal'||e.route==='straight'||e.route==='curved'?e.route:levelRoute(l);}
function edgeGeom(e,l){var i=l.edges.indexOf(e);return i<0?null:levelRoutes(l)[i]||null;}
// All edges of a level are routed together: ends sharing a node side are spread along it, routes go around
// other nodes, and each route pays to reuse a lane an earlier one took, so parallel edges stay apart.
var routeMemo={key:null,res:null};
function levelRoutes(l){
  var key=JSON.stringify([mode,l.route,l.direction,l.nodes.map(function(n){return [n.id,n.x,n.y,n.w,n.h,n.shape,n.role,n.tag,!!n.children];}),l.edges.map(function(e){return [e.from,e.to,e.route,e.points];})]);
  if(routeMemo.key===key&&routeMemo.l===l)return routeMemo.res;
  var dir=levelDir(l),ends=[],slots={},res=[];
  var obs=l.nodes.map(function(n){var b=nodeBox(n),P=14;return {id:n.id,x0:b.x-P,y0:b.y-P,x1:b.x+b.w+P,y1:b.y+b.h+P};});
  l.edges.forEach(function(e,i){
    var a=findNode(e.from,l),b=findNode(e.to,l);if(!a||!b||a===b)return;
    var pts=Array.isArray(e.points)?e.points.filter(function(p){return Array.isArray(p)&&isFinite(p[0])&&isFinite(p[1]);}).map(function(p){return {x:+p[0],y:+p[1]};}):[];
    var up=e.rel==='inherits'||e.rel==='implements',rt=edgeRoute(e,l),sd=pts.length?[sideToward(a,pts[0]),sideToward(b,pts[pts.length-1])]:rt==='straight'?[sideToward(a,b),sideToward(b,a)]:up?sides(b,a,dir).reverse():sides(a,b,dir);
    // a route that has to go around things leaves from whichever pair of sides gives the cheapest way round
    if(!pts.length&&rt!=='straight'&&(rt==='orthogonal'||!clearOf(bezier(port(a,sd[0]),port(b,sd[1]),sd).samples,obs,a.id,b.id))){
      var best=null;sideCands(a,b,sd).forEach(function(c){var r=orthRoute(port(a,c[0]),port(b,c[1]),obs,{});if(r&&(!best||r.cost<best.cost))best={cost:r.cost,sd:c};});
      if(best)sd=best.sd;
    }
    ends[i]={a:a,b:b,pts:pts,sd:sd};
    [[a,sd[0],pts.length?pts[0]:b],[b,sd[1],pts.length?pts[pts.length-1]:a]].forEach(function(t,j){var k=t[0].id+'|'+t[1];(slots[k]=slots[k]||[]).push({i:i,j:j,o:t[2]});});
  });
  Object.keys(slots).forEach(function(k){
    var list=slots[k],n=list[0].j?ends[list[0].i].b:ends[list[0].i].a,side=k.slice(k.lastIndexOf('|')+1),hz=side==='l'||side==='r';
    list.sort(function(p,q){return (hz?p.o.y-q.o.y:p.o.x-q.o.x)||(p.i-q.i);});
    var sp=spreadOf(n,side,list.length);
    list.forEach(function(s,r){ends[s.i][s.j?'ob':'oa']=(r-(list.length-1)/2)*sp;});
  });
  var used={},order=ends.map(function(x,i){return i;}).filter(function(i){return ends[i];});
  order.sort(function(i,j){var p=ends[i],q=ends[j];return (Math.abs(p.a.x-p.b.x)+Math.abs(p.a.y-p.b.y))-(Math.abs(q.a.x-q.b.x)+Math.abs(q.a.y-q.b.y));});
  order.forEach(function(i){
    var x=ends[i],e=l.edges[i],pa=portAt(x.a,x.sd[0],x.oa||0),pb=portAt(x.b,x.sd[1],x.ob||0),rt=edgeRoute(e,l);
    if(x.pts.length)res[i]=throughPoints(pa,pb,x.pts,rt);
    else if(rt==='straight')res[i]=polyGeom([pa,pb],0);
    else{
      var bz=bezier(pa,pb,x.sd);
      if(rt==='curved'&&clearOf(bz.samples,obs,x.a.id,x.b.id))res[i]=bz;
      else{var pl=orthRoute(pa,pb,obs,used);res[i]=pl?polyGeom(pl.pts,rt==='curved'?36:10):bz;}
    }
  });
  routeMemo={key:key,l:l,res:res};
  return res;
}
function bezier(pa,pb,sd){
  var dist=Math.hypot(pb.x-pa.x,pb.y-pa.y),k=sd[0]===sd[1]?Math.max(70,dist*.3):Math.min(140,dist*.45);
  var c1={x:pa.x+pa.dx*k,y:pa.y+pa.dy*k},c2={x:pb.x+pb.dx*k,y:pb.y+pb.dy*k},sm=[];
  for(var t=0;t<=1.0001;t+=1/24)sm.push(cubicAt(pa,c1,c2,pb,t));
  var m=cubicAt(pa,c1,c2,pb,.5);
  return {d:'M'+pa.x+' '+pa.y+'C'+c1.x+' '+c1.y+' '+c2.x+' '+c2.y+' '+pb.x+' '+pb.y,mx:m.x,my:m.y,samples:sm,mids:[{x:m.x,y:m.y,k:0}]};
}
function cubicAt(p0,p1,p2,p3,t){var u=1-t;return {x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y};}
function clearOf(pts,obs,ida,idb){
  return !pts.some(function(p,k){if(k<2||k>pts.length-3)return false;return obs.some(function(o){if(o.id===ida||o.id===idb)return false;return p.x>o.x0+10&&p.x<o.x1-10&&p.y>o.y0+10&&p.y<o.y1-10;});});
}
// Orthogonal route on the grid of obstacle borders and the lanes between them (A*, bends and reused lanes cost extra).
function orthRoute(pa,pb,obs,used){
  function stub(p){
    var o=null;obs.forEach(function(b){if(p.x>=b.x0-1&&p.x<=b.x1+1&&p.y>=b.y0-1&&p.y<=b.y1+1){var d=p.dx>0?b.x1-p.x:p.dx<0?p.x-b.x0:p.dy>0?b.y1-p.y:p.y-b.y0;if(!o||d>o)o=d;}});
    var d=Math.max(16,(o||0)+2);return {x:p.x+p.dx*d,y:p.y+p.dy*d};
  }
  var s=stub(pa),t=stub(pb),xs=[s.x,t.x],ys=[s.y,t.y],lo={x:Math.min(s.x,t.x),y:Math.min(s.y,t.y)},hi={x:Math.max(s.x,t.x),y:Math.max(s.y,t.y)};
  obs.forEach(function(b){xs.push(b.x0,b.x1);ys.push(b.y0,b.y1);lo.x=Math.min(lo.x,b.x0);lo.y=Math.min(lo.y,b.y0);hi.x=Math.max(hi.x,b.x1);hi.y=Math.max(hi.y,b.y1);});
  xs.push(lo.x-30,hi.x+30);ys.push(lo.y-30,hi.y+30);
  function lanes(v){v=v.map(function(z){return Math.round(z);}).sort(function(a,b){return a-b;}).filter(function(z,i,a){return !i||z!==a[i-1];});var r=[];v.forEach(function(z,i){if(i&&z-v[i-1]>24)r.push(Math.round((z+v[i-1])/2));r.push(z);});return r;}
  xs=lanes(xs);ys=lanes(ys);
  var X=xs.length,Y=ys.length,ix=xs.indexOf(Math.round(s.x)),iy=ys.indexOf(Math.round(s.y)),tx=xs.indexOf(Math.round(t.x)),ty=ys.indexOf(Math.round(t.y));
  if(ix<0||iy<0||tx<0||ty<0)return null;
  function inside(x,y){for(var k=0;k<obs.length;k++){var b=obs[k];if(x>b.x0&&x<b.x1&&y>b.y0&&y<b.y1)return true;}return false;}
  var DX=[1,-1,0,0],DY=[0,0,1,-1],BEND=40,CROSS=45;
  var d0=pa.dx>0?0:pa.dx<0?1:pa.dy>0?2:3,dEnd=pb.dx>0?1:pb.dx<0?0:pb.dy>0?3:2;
  var cost=new Float64Array(X*Y*4).fill(Infinity),from=new Int32Array(X*Y*4).fill(-1),heap=[];
  function push(st,c){heap.push([c,st]);var i=heap.length-1;while(i){var p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;var tmp=heap[p];heap[p]=heap[i];heap[i]=tmp;i=p;}}
  function pop(){var top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;var i=0;for(;;){var a=2*i+1,b=a+1,m=i;if(a<heap.length&&heap[a][0]<heap[m][0])m=a;if(b<heap.length&&heap[b][0]<heap[m][0])m=b;if(m===i)break;var tmp=heap[m];heap[m]=heap[i];heap[i]=tmp;i=m;}}return top;}
  function hcost(x,y){return Math.abs(xs[x]-xs[tx])+Math.abs(ys[y]-ys[ty]);}
  var s0=(iy*X+ix)*4+d0;cost[s0]=0;push(s0,hcost(ix,iy));
  var goal=-1,guard=0;
  while(heap.length&&guard++<60000){
    var it=pop(),st=it[1],c=cost[st],dd=st%4,cell=(st-dd)/4,cx=cell%X,cy=(cell-cx)/X;
    if(it[0]>c+hcost(cx,cy)+1e-6)continue;
    if(cx===tx&&cy===ty){goal=st;break;}
    for(var nd=0;nd<4;nd++){
      if((nd^1)===dd&&nd>>1===dd>>1)continue;
      var nx=cx+DX[nd],ny=cy+DY[nd];if(nx<0||ny<0||nx>=X||ny>=Y)continue;
      var mx=(xs[cx]+xs[nx])/2,my=(ys[cy]+ys[ny])/2;if(inside(mx,my))continue;
      var seg=nd<2?'h'+Math.min(cx,nx)+','+cy:'v'+cx+','+Math.min(cy,ny);
      var vk=nx+','+ny,nc=c+Math.abs(xs[nx]-xs[cx])+Math.abs(ys[ny]-ys[cy])+(nd!==dd?BEND:0)+(used[seg]||0)*60+((nd<2?used['V'+vk]:used['H'+vk])?CROSS:0);
      if(nx===tx&&ny===ty&&nd!==dEnd)nc+=BEND;
      var ns2=(ny*X+nx)*4+nd;if(nc<cost[ns2]){cost[ns2]=nc;from[ns2]=st;push(ns2,nc+hcost(nx,ny));}
    }
  }
  if(goal<0)return null;
  var cells=[];for(var g=goal;g>=0;g=from[g])cells.push((g-g%4)/4);cells.reverse();
  // remember the lanes and crossing points this route took, so later routes avoid running on it or across it
  for(var q=1;q<cells.length;q++){
    var a1=cells[q-1],b1=cells[q],ax=a1%X,ay=(a1-ax)/X,bx=b1%X,by=(b1-bx)/X,hz=ay===by,key=hz?'h'+Math.min(ax,bx)+','+ay:'v'+ax+','+Math.min(ay,by);
    used[key]=(used[key]||0)+1;used[(hz?'H':'V')+ax+','+ay]=1;used[(hz?'H':'V')+bx+','+by]=1;
  }
  var pts=[{x:pa.x,y:pa.y}];cells.forEach(function(c){var x=c%X;pts.push({x:xs[x],y:ys[(c-x)/X]});});pts.push({x:pb.x,y:pb.y});
  // the stubs leave the ports straight; keep the port's own coordinate so the first and last legs are exact
  pts[1]=pa.dx?{x:pts[1].x,y:pa.y}:{x:pa.x,y:pts[1].y};pts[pts.length-2]=pb.dx?{x:pts[pts.length-2].x,y:pb.y}:{x:pb.x,y:pts[pts.length-2].y};
  return {pts:simplify(pts),cost:cost[goal]};
}
function sideCands(a,b,sd){
  var hz=Math.abs(b.x-a.x)/(nw(a)+nw(b))>=Math.abs(b.y-a.y)/(nh(a)+nh(b)),fa=sideToward(a,b),fb=sideToward(b,a);
  var pa=hz?(b.y>=a.y?'b':'t'):(b.x>=a.x?'r':'l'),pb=hz?(a.y>=b.y?'b':'t'):(a.x>=b.x?'r':'l');
  var out=[];[sd,[fa,fb],[pa,fb],[fa,pb],[pa,pb]].forEach(function(c){if(!out.some(function(o){return o[0]===c[0]&&o[1]===c[1];}))out.push(c);});
  return out;
}
function simplify(pts){
  var out=[pts[0]];
  for(var i=1;i<pts.length;i++){
    var p=pts[i],a=out[out.length-1];if(Math.abs(p.x-a.x)<.5&&Math.abs(p.y-a.y)<.5)continue;
    if(out.length>1){var b=out[out.length-2];if((Math.abs(b.x-a.x)<.5&&Math.abs(a.x-p.x)<.5)||(Math.abs(b.y-a.y)<.5&&Math.abs(a.y-p.y)<.5)){out[out.length-1]=p;continue;}}
    out.push(p);
  }
  return out;
}
// a polyline with rounded corners; its label sits halfway along it
function polyGeom(pts,R){
  var d='M'+pts[0].x+' '+pts[0].y;
  for(var i=1;i<pts.length;i++){
    var p=pts[i];
    if(i<pts.length-1&&R){
      var a=pts[i-1],b=pts[i+1],la=Math.hypot(p.x-a.x,p.y-a.y),lb=Math.hypot(b.x-p.x,b.y-p.y),r=Math.min(R,la/2,lb/2);
      d+=' L'+(p.x+(a.x-p.x)*r/la)+' '+(p.y+(a.y-p.y)*r/la)+' Q'+p.x+' '+p.y+' '+(p.x+(b.x-p.x)*r/lb)+' '+(p.y+(b.y-p.y)*r/lb);
    }else d+=' L'+p.x+' '+p.y;
  }
  var m=alongPoly(pts,.5);
  return {d:d,mx:m.x,my:m.y,poly:pts,mids:[{x:m.x,y:m.y,k:0}]};
}
function alongPoly(pts,f){
  var L=0,i;for(i=1;i<pts.length;i++)L+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  var want=L*f;for(i=1;i<pts.length;i++){var s=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);if(want<=s&&s>0){var t=want/s;return {x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*t};}want-=s;}
  return pts[pts.length-1];
}
// a route through bend points the user placed
function throughPoints(pa,pb,pts,rt){
  var C=[pa].concat(pts,[pb]),mids=[],g;
  if(rt==='curved'){
    var d='M'+pa.x+' '+pa.y,seg=[];
    for(var i=0;i<C.length-1;i++){
      var p0=C[i-1]||null,p1=C[i],p2=C[i+1],p3=C[i+2]||null,L=Math.hypot(p2.x-p1.x,p2.y-p1.y)/3;
      var t1=p0?norm(p2.x-p0.x,p2.y-p0.y):{x:pa.dx,y:pa.dy},t2=p3?norm(p3.x-p1.x,p3.y-p1.y):{x:-pb.dx,y:-pb.dy};
      var c1={x:p1.x+t1.x*L,y:p1.y+t1.y*L},c2={x:p2.x-t2.x*L,y:p2.y-t2.y*L};
      d+='C'+c1.x+' '+c1.y+' '+c2.x+' '+c2.y+' '+p2.x+' '+p2.y;
      var m=cubicAt(p1,c1,c2,p2,.5);mids.push({x:m.x,y:m.y,k:i});seg.push(m);
    }
    var mm=seg[(seg.length-1)>>1];
    return {d:d,mx:mm.x,my:mm.y,mids:mids};
  }
  if(rt==='orthogonal'){
    var P=[pa],hz=!!pa.dx;
    for(var j=1;j<C.length;j++){
      var a=P[P.length-1],b=C[j];
      if(Math.abs(a.x-b.x)>.5&&Math.abs(a.y-b.y)>.5){var el=hz?{x:b.x,y:a.y}:{x:a.x,y:b.y};P.push(el);mids.push({x:el.x,y:el.y,k:j-1});hz=!hz;}
      else mids.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,k:j-1});
      P.push(b);
    }
    g=polyGeom(simplify(P),10);g.mids=mids;return g;
  }
  g=polyGeom(C,6);g.mids=C.slice(1).map(function(b,j){return {x:(C[j].x+b.x)/2,y:(C[j].y+b.y)/2,k:j};});return g;
}
function norm(x,y){var L=Math.hypot(x,y)||1;return {x:x/L,y:y/L};}
function nodeBox(n){var t=(n.role||n.tag)?26:0;return {x:n.x-nw(n)/2,y:n.y-nh(n)/2-t,w:nw(n)+(showsInner(n)?6:0),h:nh(n)+t+(showsInner(n)?6:0)};}
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

/* ================= rendering ================= */
function worldIcon(icon,label,size,cx,cy){
  if(icon&&ICONS[icon]){var k=size/24;return '<g class="ic" transform="translate('+(cx-size/2)+' '+(cy-size/2)+') scale('+k+')">'+shapes(ICONS[icon])+'</g>';}
  var t=(icon&&icon.trim())||((label||'?').trim().charAt(0).toUpperCase());
  return '<text class="ic-text" x="'+cx+'" y="'+(cy+size*.36)+'" font-size="'+size+'">'+esc(t)+'</text>';
}
function nodeMarkup(n,l){
  var inner=showsInner(n),w=nw(n),h=nh(n),X=-w/2,Y=-h/2;
  var isSel=sel.nodes.indexOf(n.id)>=0;
  var cls='node t-'+n.shape+(inner?' has-inner':'')+(isSel?' sel':'')+(n.role?' role-'+n.role:'')+(DIFF_TEXT[n.diff]?' diff-'+n.diff:'')+(n.confidence==='inferred'?' inferred':'');
  var s='<g class="'+cls+'" data-id="'+esc(n.id)+'" transform="translate('+n.x+' '+n.y+')" style="--nc:'+colorVar(n.color)+';--rc:'+roleVar(n.role)+'" tabindex="0" role="button" aria-label="'+esc(n.label)+(n.role?', '+n.role:'')+(inner?', has inner diagram':'')+'">';
  if(n.role&&n.shape!=='text')s+='<g class="ring">'+shapeSVG(n)+'</g>';
  if(inner&&n.shape!=='text')s+='<g class="stack" transform="translate(6 6)">'+shapeSVG(n)+'</g>';
  s+='<g class="body">'+shapeSVG(n)+'</g>';
  if(n.shape==='table')return s+tableInner(n)+nodeExtras(n,inner,isSel)+'</g>';
  if(n.shape==='class')return s+classInner(n)+nodeExtras(n,inner,isSel)+'</g>';
  if(n.shape==='initial'||n.shape==='final')return s+(n.label?'<text class="lbl state-lbl" x="0" y="'+(nh(n)/2+18)+'" font-size="12.5">'+esc(n.label)+'</text>':'')+nodeExtras(n,inner,isSel)+'</g>';
  if(n.shape==='image')s+=imageInner(n);
  // text block
  var tb=textBox(n),t=n.text||{},fs=FS[t.size]||FS.m,lh=fs*1.25,showIc=iconShown(n),icS=26;
  var maxc=Math.max(3,Math.floor(tb.w/(fs*.55)));
  var avail=tb.h-(showIc?icS+10:0),maxLines=Math.max(1,Math.floor(avail/lh));
  var lines=wrapText(n.label,maxc);
  if(lines.length>maxLines){lines=lines.slice(0,maxLines);lines[maxLines-1]=lines[maxLines-1].replace(/.{0,1}$/,'')+'\u2026';}
  var tech=n.tech?String(n.tech):'';if(tech&&lines.length>=maxLines&&lines.length>1)lines=lines.slice(0,lines.length-1);
  var blockH=lines.length*lh+(showIc?icS+10:0)+(tech?16:0),top=tb.dy-blockH/2;
  if(showIc){s+='<circle class="halo" cx="0" cy="'+(top+icS/2)+'" r="'+(icS*.95)+'"/>'+worldIcon(n.icon,n.label,icS,0,top+icS/2);top+=icS+10;}
  s+='<text class="lbl" font-size="'+fs+'" font-weight="'+(t.bold===false?500:(t.bold?750:600))+'"'+(t.italic?' font-style="italic"':'')+'>';
  lines.forEach(function(ln,i){s+='<tspan x="0" y="'+(top+lh*(i+.78)).toFixed(1)+'">'+esc(ln)+'</tspan>';});
  s+='</text>';
  if(tech){var tm=Math.max(4,Math.floor(tb.w/6.4));s+='<text class="tech" x="0" y="'+(top+lines.length*lh+13).toFixed(1)+'">['+esc(tech.length>tm?tech.slice(0,tm-1)+'…':tech)+']</text>';}
  return s+nodeExtras(n,inner,isSel)+'</g>';
}
function nodeExtras(n,inner,isSel){
  var w=nw(n),h=nh(n),X=-w/2,Y=-h/2,s='';
  if(inner)s+='<g class="enter" transform="translate('+(w/2-14)+' '+(Y+14)+')"><title>Open inner diagram</title><circle r="9"/><path d="M-4 0h8M0 -4v8"/></g>';
  else if(mediaList(n).length&&n.shape!=='image')s+=mediaBadge(n,w/2-14,Y+14);
  var badgeX=X;
  if(n.role){
    var rl=n.role==='input'?'Input':'Output',rw=rl.length*7+30;
    s+='<g class="role" transform="translate('+badgeX+' '+(Y-24)+')"><rect width="'+rw+'" height="20" rx="10"/>'+
      (n.role==='input'?'<path d="M8 10h8M13 6.5l3.5 3.5-3.5 3.5"/><text x="22" y="14">'+rl+'</text>':'<text x="9" y="14">'+rl+'</text><path d="M'+(rw-17)+' 10h8M'+(rw-12.5)+' 6.5l3.5 3.5-3.5 3.5"/>')+'</g>';
    badgeX+=rw+6;
  }
  if(n.tag){var tw=n.tag.length*6.8+18;s+='<g class="tag" transform="translate('+badgeX+' '+(Y-24)+')"><rect width="'+tw+'" height="20" rx="10"/><text x="'+tw/2+'" y="14">'+esc(n.tag)+'</text></g>';badgeX+=tw+6;}
  if(DIFF_TEXT[n.diff]){var dl=DIFF_TEXT[n.diff],dw=dl.length*7+18;s+='<g class="dtag diff-'+n.diff+'" transform="translate('+badgeX+' '+(Y-24)+')"><rect width="'+dw+'" height="20" rx="10"/><text x="'+dw/2+'" y="14">'+dl+'</text></g>';}
  if(BT_GLYPH[n.bt])s+='<g class="bt" transform="translate('+(X+16)+' '+(Y+16)+')"><title>'+BT_NAMES[n.bt]+'</title><rect x="-10" y="-10" width="20" height="20" rx="5"/><text y="5">'+BT_GLYPH[n.bt]+'</text></g>';
  if(n.confidence==='inferred'&&['initial','final','text'].indexOf(n.shape)<0)s+='<g class="conf" transform="translate('+(X+12)+' '+(h/2-12)+')"><title>'+CONF_TEXT.inferred+'</title><circle r="8"/><text y="3.6">?</text></g>';
  if(mode==='edit'&&n.shape!=='text'){
    // ports keep their size on screen at any zoom (--pz), with a wider invisible ring to grab
    ['t','r','b','l'].forEach(function(sd){var p=port(n,sd);s+='<g class="port" data-port="'+sd+'" transform="translate('+(p.x-n.x)+' '+(p.y-n.y)+')"><g class="pz"><circle class="port-hit" r="15"/><circle class="port-dot" r="6"/></g></g>';});
  }
  if(mode==='edit'&&isSel&&sel.nodes.length===1&&n.shape!=='initial'&&n.shape!=='final')s+='<g class="rs" transform="translate('+(w/2)+' '+(h/2)+')"><rect class="pz" x="-6" y="-6" width="12" height="12" rx="3"/></g>';
  return s;
}
function tableInner(n){
  var w=nw(n),h=nh(n),X=-w/2,Y=-h/2,s='',f=n.fields||[];
  s+='<text class="tb-name" x="'+(X+14)+'" y="'+(Y+26)+'" font-size="14.5">'+esc(n.label)+'</text>';
  f.forEach(function(row,i){
    var y=Y+40+i*24,m=String(row).match(/^\s*([^:\s]+)\s*:?\s*(.*)$/)||[0,row,''],key=/\b(PK|FK)\b/.test(row);
    if(i)s+='<line class="tb-rule" x1="'+(X+10)+'" x2="'+(w/2-10)+'" y1="'+y+'" y2="'+y+'"/>';
    var room=Math.max(4,Math.floor((w-40-String(m[1]).length*7.6)/6.6)),ty=String(m[2]);if(ty.length>room)ty=ty.slice(0,room-1)+'\u2026';
    s+='<text class="tb-field'+(key?' key':'')+'" x="'+(X+14)+'" y="'+(y+16.5)+'">'+esc(m[1])+'<title>'+esc(row)+'</title></text><text class="tb-type" x="'+(w/2-12)+'" y="'+(y+16.5)+'">'+esc(ty)+'<title>'+esc(row)+'</title></text>';
  });
  if(!f.length)s+='<text class="tb-type" x="'+(X+14)+'" y="'+(Y+60)+'" text-anchor="start">'+(mode==='edit'?'Add fields in details':'')+'</text>';
  return s;
}
var clipSeq=0;
function imageInner(n){
  var w=nw(n),h=nh(n),X=-w/2,Y=-h/2,ih=h-38,id='ssclip'+(++clipSeq),m=mediaList(n)[0]||{},t=mediaType(m),s='';
  s+='<clipPath id="'+id+'"><rect x="'+(X+1)+'" y="'+(Y+1)+'" width="'+(w-2)+'" height="'+ih+'" rx="11"/></clipPath>';
  var poster=t==='image'?m.src:m.poster;
  if(poster)s+='<image href="'+esc(poster)+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+ih+'" preserveAspectRatio="xMidYMid slice" clip-path="url(#'+id+')"/>';
  else s+='<rect class="img-empty" x="'+(X+1)+'" y="'+(Y+1)+'" width="'+(w-2)+'" height="'+ih+'" clip-path="url(#'+id+')"/>'+(t?'':worldIcon('camera','',28,0,Y+ih/2));
  if(t==='video'||t==='embed')s+='<g class="play" transform="translate(0 '+(Y+ih/2)+')"><circle r="20"/><path d="M-6 -9 10 0 -6 9z"/></g>';
  s+='<line class="img-rule" x1="'+X+'" x2="'+(w/2)+'" y1="'+(Y+ih)+'" y2="'+(Y+ih)+'"/>';
  return s;
}
// UML ends: hollow triangle (inherits), filled or hollow diamond (owns), open arrow (uses); each with a selected twin
function relMarkers(){
  var M={tri:'<path class="mk-hollow" d="M1 1 11 6 1 11z"/>',dia:'<path class="mk-solid" d="M1 6 6 2 11 6 6 10z"/>',odia:'<path class="mk-hollow" d="M1 6 6 2 11 6 6 10z"/>',open:'<path class="mk-open" d="M1 1 11 6 1 11"/>'};
  return Object.keys(M).map(function(k){return ['',' sel'].map(function(sc){return '<marker id="ss-'+k+(sc?'-sel':'')+'" class="relmk'+sc+'" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse">'+M[k]+'</marker>';}).join('');}).join('');
}
function seqGeom(e,i,l){
  var a=findNode(e.from,l),b=findNode(e.to,l);if(!a||!b)return null;
  var y=seqY(l,i);
  if(a===b)return {d:'M'+a.x+' '+y+' h44 v24 h-38',mx:a.x+52,my:y+12,self:true,x0:a.x,y:y};
  var dir=b.x>a.x?1:-1;
  return {d:'M'+a.x+' '+y+' H'+(b.x-dir*2),mx:(a.x+b.x)/2,my:y-13,x0:a.x,dir:dir,y:y};
}
function edgeMarkup(e,i,l){
  var seq=isSeq(l),g=seq?seqGeom(e,i,l):edgeGeom(e,l);if(!g)return '';
  var isSel=sel.edge===i,arrow=e.arrow||defArrow(l),mk=isSel?'ss-arrow-sel':'ss-arrow',rel=!seq&&REL[e.rel],sf=isSel?'-sel':'';
  if(rel){var rs='<g class="edge '+(e.style||rel.st)+(isSel?' sel':'')+(DIFF_TEXT[e.diff]?' diff-'+e.diff:'')+'" data-i="'+i+'"><path class="hit" d="'+g.d+'"/><path class="line" d="'+g.d+'"'+(rel.end?' marker-end="url(#ss-'+rel.end+sf+')"':'')+(rel.start?' marker-start="url(#ss-'+rel.start+sf+')"':'')+'/>';
    if(e.label){var rw=e.label.length*6.9+18;rs+='<g class="elabel"><rect x="'+(g.mx-rw/2)+'" y="'+(g.my-11)+'" width="'+rw+'" height="22" rx="11"/><text x="'+g.mx+'" y="'+(g.my+4.5)+'">'+esc(e.label)+'</text></g>';}
    return rs+'</g>';}
  var s='<g class="edge '+(e.style||defStyle(l))+(seq?' msg':'')+(isSel?' sel':'')+(DIFF_TEXT[e.diff]?' diff-'+e.diff:'')+'" data-i="'+i+'"><path class="hit" d="'+g.d+'"/><path class="line" d="'+g.d+'"'+
    (arrow!=='none'?' marker-end="url(#'+mk+')"':'')+(arrow==='both'?' marker-start="url(#'+mk+')"':'')+'/>';
  if(seq){
    var num=String(i+1);
    s+='<g class="seqnum" transform="translate('+(g.x0+(g.self?0:g.dir*0))+' '+g.y+')"><circle r="9"/><text y="4">'+num+'</text></g>';
    if(e.label){var lw=e.label.length*6.9+16,lx=g.self?g.mx:g.mx-lw/2;s+='<g class="elabel'+(g.self?' left':'')+'"><rect x="'+lx+'" y="'+(g.my-11)+'" width="'+lw+'" height="22" rx="11"/><text x="'+(lx+lw/2)+'" y="'+(g.my+4.5)+'">'+esc(e.label)+'</text></g>';}
    return s+'</g>';
  }
  if(e.label){var w=e.label.length*6.9+18;s+='<g class="elabel"><rect x="'+(g.mx-w/2)+'" y="'+(g.my-11)+'" width="'+w+'" height="22" rx="11"/><text x="'+g.mx+'" y="'+(g.my+4.5)+'">'+esc(e.label)+'</text></g>';}
  return s+'</g>';
}
// bend points of the selected edge: drag a point to move it, drag a hollow midpoint to add one, double-click a point to remove it
function edgeHandles(l){
  if(mode!=='edit'||sel.edge==null||isSeq(l))return '';
  var e=l.edges[sel.edge],g=e&&edgeGeom(e,l);if(!g)return '';
  var s='<g class="wph">';
  (g.mids||[]).forEach(function(m){s+='<g class="wpm" data-k="'+m.k+'" transform="translate('+m.x+' '+m.y+')"><title>Drag to bend</title><g class="pz"><circle class="port-hit" r="12"/><circle class="wp-dot" r="5"/></g></g>';});
  (e.points||[]).forEach(function(p,k){s+='<g class="wp" data-k="'+k+'" transform="translate('+p[0]+' '+p[1]+')"><title>Drag to move, double-click to remove</title><g class="pz"><circle class="port-hit" r="12"/><rect class="wp-dot" x="-5" y="-5" width="10" height="10" rx="2"/></g></g>';});
  return s+'</g>';
}
function groupMarkup(g,l){
  var b=groupBox(g,l);if(!b)return '';
  var isSel=sel.group===g.id;
  return '<g class="group'+(isSel?' sel':'')+'" data-gid="'+esc(g.id)+'" style="--nc:'+colorVar(g.color||'slate')+'"><rect class="g-body" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="22"/>'+
    '<rect class="g-hit" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="22"/><text class="g-label" x="'+(b.x+18)+'" y="'+(b.y+27)+'">'+esc(g.label||'Group')+'</text></g>';
}
function frameMarkup(l){
  if(!path.length)return '';
  var parent=findNode(path[path.length-1],levelAt(path.slice(0,-1)));if(!parent)return '';
  var f=frameBox(l),tl=TYPE_NAMES[levelType(l)],lw=parent.label.length*12+44,tw=tl.length*7+20;
  return '<g class="frame" style="--nc:'+colorVar(parent.color)+'"><rect class="f" x="'+f.x+'" y="'+f.y+'" width="'+f.w+'" height="'+f.h+'" rx="30"/>'+
    '<g class="f-head" data-act="back" transform="translate('+(f.x+6)+' '+(f.y-40)+')">'+worldIcon(parent.icon||'box',parent.label,22,11,14)+'<text class="f-label" x="32" y="22">'+esc(parent.label)+'</text>'+
    '<g class="f-type" transform="translate('+lw+' 5)"><rect width="'+tw+'" height="20" rx="10"/><text x="10" y="14">'+tl+'</text></g></g></g>';
}
var sceneQueued=false;
function queueScene(){if(sceneQueued)return;sceneQueued=true;requestAnimationFrame(function(){sceneQueued=false;renderScene();placeOverlays();});}
function renderScene(){
  var l=cur();if(!l)return;
  if(isSeq(l)&&!(drag&&drag.moved))seqLayout(l);
  clipSeq=0;
  var s=sceneMarkup(l)+edgeHandles(l);
  scene.innerHTML=s;
  if(traceId){if(findNode(traceId,l))applyTrace(traceId);else{traceId=null;scene.classList.remove('tracing');}}
  var hint=$('#ss-empty');
  if(!l.nodes.length){hint.hidden=false;hint.textContent=mode==='edit'?'Empty level. Drag a shape from the left, or double-click anywhere.':'Nothing inside yet.';}
  else hint.hidden=true;
}

/* ================= flow tracing ================= */
function traceSets(id,l){
  var down={},up={},ed={};
  function walk(start,fwd,acc){
    var q=[start];acc[start]=1;
    while(q.length){var u=q.shift();l.edges.forEach(function(e,i){var a=fwd?e.from:e.to,b=fwd?e.to:e.from;if(a===u){ed[i]=1;if(!acc[b]){acc[b]=1;q.push(b);}}});}
  }
  walk(id,true,down);walk(id,false,up);
  return {nodes:Object.assign({},down,up),edges:ed};
}
function applyTrace(id){
  var l=cur(),t=traceSets(id,l);
  scene.classList.add('tracing');
  scene.querySelectorAll('.node').forEach(function(el){el.classList.toggle('lit',!!t.nodes[el.dataset.id]);el.classList.toggle('origin',el.dataset.id===id);});
  scene.querySelectorAll('.edge').forEach(function(el){el.classList.toggle('lit',!!t.edges[el.dataset.i]);});
}
function setTrace(id){
  if(id===traceId)return;traceId=id;
  if(!id){scene.classList.remove('tracing');scene.querySelectorAll('.lit,.origin').forEach(function(el){el.classList.remove('lit','origin');});return;}
  applyTrace(id);
}

/* ================= chrome ================= */
function renderHeader(){
  var t=$('#ss-title'),s=$('#ss-subtitle'),ed=mode==='edit';
  if(document.activeElement!==t)t.textContent=data.meta.title;
  if(document.activeElement!==s)s.textContent=data.meta.subtitle||'';
  t.contentEditable=s.contentEditable=ed?'true':'false';
  s.hidden=!ed&&!data.meta.subtitle;
  document.title=data.meta.title;
  var c=$('#ss-crumbs');
  if(!path.length){c.hidden=true;c.innerHTML='';}
  else{
    var labels=pathLabels(path),h='<button class="crumb-back" data-act="back" title="Back one level (Esc)" aria-label="Back one level">'+uiIcon('back',16)+'</button><button data-act="crumb" data-arg="0">Overview</button>';
    labels.forEach(function(lb,i){h+='<span class="sep" aria-hidden="true">/</span>'+(i===labels.length-1?'<span aria-current="location">'+esc(lb)+'</span>':'<button data-act="crumb" data-arg="'+(i+1)+'">'+esc(lb)+'</button>');});
    c.innerHTML=h;c.hidden=false;
  }
  var tb='<div class="seg" role="group" aria-label="Mode"><button data-act="mode-view" aria-pressed="'+(mode==='view')+'">View</button><button data-act="mode-edit" aria-pressed="'+(mode==='edit')+'">Edit</button></div>';
  if(ed)tb+='<span class="sep"></span><button class="ib" data-act="undo" title="Undo (Ctrl+Z)" aria-label="Undo"'+(undoStack.length?'':' disabled')+'>'+uiIcon('undo')+'</button><button class="ib" data-act="redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo"'+(redoStack.length?'':' disabled')+'>'+uiIcon('redo')+'</button>';
  if(ed&&artifactCap&&!readOnly)tb+='<button class="btn" data-act="save"'+(dirty?'':' disabled')+' title="Save edits into this page">'+uiIcon('save')+'<span>Save</span>'+(dirty?'<i class="dirty-dot" aria-label="unsaved changes"></i>':'')+'</button>';
  tb+='<button class="ib" data-act="search" title="Search (/)" aria-label="Search the map">'+uiIcon('search')+'</button>';
  if(!ed)tb+='<button class="btn" data-act="tours" title="Guided tour (T)">'+uiIcon('flag')+'<span>Tour</span></button><button class="ib" data-act="present" title="Present (P)" aria-label="Present">'+uiIcon('monitor')+'</button>';
  tb+='<button class="btn" data-act="export" title="Download page or data">'+uiIcon('export')+'<span>Export</span></button>';
  tb+='<button class="ib" data-act="about" title="About this diagram and how to read it" aria-label="About this diagram">'+uiIcon('help')+'</button>';
  $('#ss-topbar').innerHTML=tb;
}
function renderPalette(){
  var p=$('#ss-palette');
  if(mode!=='edit'){p.hidden=true;return;}
  p.innerHTML='<div class="pal-h">Shapes</div>'+SHAPE_ORDER.map(function(s){return '<button data-shape="'+s+'" title="'+SHAPES[s].name+' (drag or click)" aria-label="Add '+SHAPES[s].name+'">'+shapeIcon(s,26)+'</button>';}).join('')+
    '<div class="pal-hint">Space + drag to pan</div>';
  p.hidden=false;
}
function renderLevelbar(){
  var el=$('#ss-levelbar'),l=cur(),h='';
  if(path.length)h+='<button class="ib" data-act="back" title="Back one level (Esc)" aria-label="Back one level">'+uiIcon('back')+'</button>';
  if(mode==='edit'){
    var tp=levelType(l),dr=levelDir(l);
    h+='<select class="type-sel" data-field="ltype" aria-label="Diagram type" title="'+esc(TYPE_HINTS[tp])+'">'+Object.keys(TYPE_NAMES).map(function(k){return '<option value="'+k+'"'+(k===tp?' selected':'')+'>'+TYPE_NAMES[k]+'</option>';}).join('')+'</select>'+
      '<input class="cap" data-field="caption" value="'+esc(l.caption||'')+'" placeholder="One line: what is this level for?" aria-label="Level caption">'+
      (isSeq(l)?'':'<button class="ib" data-act="ldir" title="Layout direction: '+(dr==='LR'?'left to right':'top to bottom')+'" aria-label="Toggle layout direction">'+uiIcon(dr==='LR'?'dirLR':'dirTB')+'</button>'+
        '<button class="ib" data-act="lroute" title="Paths: '+ROUTE_NAMES[levelRoute(l)].toLowerCase()+' (click to change)" aria-label="Path style for this level">'+uiIcon('route-'+levelRoute(l))+'</button>')+
      '<button class="btn" data-act="tidy" title="Auto-arrange this level">'+uiIcon('tidy')+'<span>Tidy</span></button>';
  }else{
    h+='<span class="type-badge" title="'+esc(TYPE_HINTS[levelType(l)])+'">'+TYPE_NAMES[levelType(l)]+'</span>';
    if(l.caption)h+='<p class="cap">'+esc(l.caption)+'</p>';
    h+=legendChips(l);
  }
  el.innerHTML=h;el.hidden=false;
}
function renderLegend(){renderAbout();}
function legendChips(l){
  var hasIn=l.nodes.some(function(n){return n.role==='input';}),hasOut=l.nodes.some(function(n){return n.role==='output';});
  var df={};l.nodes.forEach(function(n){if(DIFF_TEXT[n.diff])df[n.diff]=1;});
  var dc=Object.keys(DIFF_TEXT).filter(function(k){return df[k];}).map(function(k){return '<span><i class="sw diff-'+k+'"></i>'+DIFF_TEXT[k]+'</span>';}).join('');
  return (hasIn||hasOut||dc)?'<span class="keys-inline">'+(hasIn?'<span><i class="sw" style="--rc:var(--in)"></i>In</span>':'')+(hasOut?'<span><i class="sw" style="--rc:var(--out)"></i>Out</span>':'')+dc+'</span>':'';
}
var aboutOpen=null;
function aboutKey(){return 'unfold:about:'+draftKey;}
function renderAbout(){
  var el=$('#ss-about'),m=data.meta;
  if(aboutOpen===null){var seen=false;try{seen=!!localStorage.getItem(aboutKey());}catch(e){}aboutOpen=!seen&&!!m.summary;}
  if(!aboutOpen||mode!=='view'){el.hidden=true;return;}
  var g=Array.isArray(m.glossary)?m.glossary.slice(0,8):[];
  el.innerHTML='<p class="ab-sum">'+esc(m.summary||m.subtitle||'')+'</p>'+
    '<ul class="ab-tips"><li>'+uiIcon('open',15)+'Click a part to open it</li><li>'+uiIcon('arrowR',15)+'Hover to trace its data</li><li>'+uiIcon('back',15)+'Esc or zoom out to go back</li></ul>'+
    (g.length?'<dl class="ab-glos">'+g.map(function(x){return '<div><dt>'+esc(x.term)+'</dt><dd>'+esc(x.def)+'</dd></div>';}).join('')+'</dl>':'')+
    '<div class="ab-foot">'+(data.meta.intent==='learn'||(data.meta.tours||[]).length?'<button class="btn solid" data-act="tour-start">'+uiIcon('flag',16)+'Start the tour</button><button class="btn" data-act="about-close">Explore</button>':'<button class="btn solid" data-act="about-close">Got it</button>')+'<button class="btn" data-act="help">All shortcuts</button></div>';
  el.hidden=false;
}
function renderChrome(){renderHeader();renderPalette();renderLevelbar();renderLegend();}
function renderAll(){renderScene();renderChrome();renderToolbar();renderCard();}

/* ================= floating toolbar ================= */
function popGrid(items,cols,size){return '<div class="pop-grid" style="grid-template-columns:repeat('+cols+','+size+'px)">'+items+'</div>';}
function renderToolbar(){
  var t=$('#ss-ftb');
  if(mode!=='edit'||!hasSel()||busy||inlineEd){t.hidden=true;t.innerHTML='';return;}
  var l=cur(),h='',p='';
  if(sel.nodes.length===1){
    var n=findNode(sel.nodes[0]);if(!n){sel.nodes=[];t.hidden=true;return;}
    var tx=n.text||{};
    h+='<button class="ib" data-act="pop" data-arg="shape" title="Shape" aria-label="Change shape">'+shapeIcon(n.shape,22)+'</button>'+
      '<button class="ib" data-act="pop" data-arg="color" title="Colour" aria-label="Change colour"><i class="swatch" style="--nc:'+colorVar(n.color)+'"></i></button>'+
      '<button class="ib" data-act="pop" data-arg="icon" title="Icon" aria-label="Change icon">'+(n.icon&&ICONS[n.icon]?uiIcon(n.icon):'<b>'+esc(n.icon||'\u2205')+'</b>')+'</button>'+
      '<span class="sep"></span>'+
      '<button class="tb-txt tb-in" data-act="role" data-arg="input" aria-pressed="'+(n.role==='input')+'" title="Mark as an input to this level">In</button>'+
      '<button class="tb-txt tb-out" data-act="role" data-arg="output" aria-pressed="'+(n.role==='output')+'" title="Mark as an output of this level">Out</button>'+
      '<span class="sep"></span>'+
      '<button class="ib" data-act="pop" data-arg="size" title="Text size" aria-label="Text size">'+uiIcon('textsize')+'</button>'+
      '<button class="ib" data-act="bold" aria-pressed="'+(!!tx.bold)+'" title="Bold" aria-label="Bold">'+uiIcon('bold')+'</button>'+
      '<button class="ib" data-act="italic" aria-pressed="'+(!!tx.italic)+'" title="Italic" aria-label="Italic">'+uiIcon('italic')+'</button>'+
      '<span class="sep"></span>'+
      '<button class="ib" data-act="link" title="Link to another node: click it next (or drag a blue dot)" aria-label="Link to another node">'+uiIcon('link')+'</button>'+
      '<button class="ib" data-act="pop" data-arg="media" title="Images and videos" aria-label="Images and videos"'+(mediaList(n).length?' aria-pressed="true"':'')+'>'+uiIcon('image')+'</button>'+
      '<button class="tb-txt" data-act="pop" data-arg="nest" title="Inner diagram">'+uiIcon('nest',16)+(n.children?'Inside':'Nest')+uiIcon('chev',14)+'</button>'+
      '<button class="ib" data-act="pop" data-arg="details" title="Notes, source files, tag" aria-label="Details">'+uiIcon('info')+'</button>'+
      '<button class="ib" data-act="dup" title="Duplicate (Ctrl+D)" aria-label="Duplicate">'+uiIcon('copy')+'</button>'+
      '<button class="ib tb-danger" data-act="del" title="Delete (Del)" aria-label="Delete">'+uiIcon('trash')+'</button>';
    if(pop==='shape')p=popGrid(SHAPE_ORDER.map(function(s){return '<button data-act="set-shape" data-arg="'+s+'" title="'+SHAPES[s].name+'" aria-pressed="'+(n.shape===s)+'" style="width:40px;height:38px">'+shapeIcon(s,26)+'</button>';}).join(''),6,40);
    if(pop==='color')p=colorPop(n.color);
    if(pop==='icon')p=popGrid('<button data-act="set-icon" data-arg="" title="No icon" style="width:30px;height:30px" aria-pressed="'+(!n.icon)+'">\u2205</button>'+Object.keys(ICONS).map(function(k){return '<button data-act="set-icon" data-arg="'+k+'" title="'+k+'" aria-pressed="'+(n.icon===k)+'" style="width:30px;height:30px">'+uiIcon(k,18)+'</button>';}).join(''),8,30)+
      '<label style="margin:8px 0 0">Or an emoji / letters<input data-field="icon" value="'+esc(n.icon&&!ICONS[n.icon]?n.icon:'')+'" maxlength="4"></label>';
    if(pop==='size')p='<div class="seg" role="group" aria-label="Text size">'+['s','m','l'].map(function(z){return '<button data-act="set-size" data-arg="'+z+'" aria-pressed="'+((tx.size||'m')===z)+'">'+{s:'Small',m:'Medium',l:'Large'}[z]+'</button>';}).join('')+'</div>';
    if(pop==='nest'){
      p='<div class="menu">'+(n.children?
        '<button data-act="open-inner">'+uiIcon('open')+'<span>Open inner diagram<small>'+(n.children.nodes.length)+' nodes, '+levelType(n.children)+'</small></span></button>'+
        '<button data-act="unnest">'+uiIcon('ungroup')+'<span>Expand here<small>Replace this node with what is inside</small></span></button>'+
        '<button data-act="drop-inner" class="tb-danger">'+uiIcon('trash')+'<span>Remove inner diagram</span></button>':
        '<button data-act="create-inner" data-arg="architecture">'+uiIcon('nest')+'<span>Nest an architecture diagram<small>Parts that work together</small></span></button>'+
        '<button data-act="create-inner" data-arg="process">'+uiIcon('nest')+'<span>Nest a process diagram<small>Steps and decisions in order</small></span></button>')+'</div>';
    }
    if(pop==='details')p='<div style="width:300px"><label>Note <small>shown when someone clicks it</small><textarea data-field="note" rows="3">'+esc(n.note||'')+'</textarea></label>'+
      '<label>Source <small>files or symbols, one per line</small><textarea class="mono" data-field="source" rows="3" spellcheck="false">'+esc((n.source||[]).join('\n'))+'</textarea></label>'+
      (n.shape==='table'||n.shape==='class'?'<label>'+(n.shape==='class'?'Attributes':'Fields')+' <small>one per line, e.g. '+(n.shape==='class'?'- items: list[Item]':'id: int PK')+'</small><textarea class="mono" data-field="fields" rows="4" spellcheck="false">'+esc((n.fields||[]).join('\n'))+'</textarea></label>':'')+
      (n.shape==='class'?'<label>Methods <small>one per line, e.g. + total(): Money</small><textarea class="mono" data-field="methods" rows="3" spellcheck="false">'+esc((n.methods||[]).join('\n'))+'</textarea></label><label>Stereotype <small>e.g. interface, abstract</small><input data-field="stereotype" value="'+esc(n.stereotype||'')+'"></label>':'')+
      (levelType(l)==='behaviour'?'<label>Behaviour <small>how this node runs</small><select data-field="bt">'+['','sequence','selector','parallel','decorator','action','condition'].map(function(k){return '<option value="'+k+'"'+((n.bt||'')===k?' selected':'')+'>'+(k?k.charAt(0).toUpperCase()+k.slice(1):'\u2014')+'</option>';}).join('')+'</select></label>':'')+
      (levelType(l)==='timeline'?'<label>Date <small>shown on the axis, e.g. 2026-10 or v0.4</small><input data-field="date" value="'+esc(n.date||'')+'"></label>':'')+
      '<label>Technology <small>shown under the label, e.g. Python, ROS 2</small><input data-field="tech" value="'+esc(n.tech||'')+'"></label>'+
      '<label style="margin:0">Tag <small>e.g. planned</small><input data-field="tag" value="'+esc(n.tag||'')+'"></label></div>';
    if(pop==='media'){
      var ml=mediaList(n);
      p='<div class="media-pop" style="width:300px">'+(ml.length?'<ul class="m-list">'+ml.map(function(m,i){var t=mediaType(m),th=t==='image'?m.src:m.poster;
          return '<li>'+(th?'<img src="'+esc(th)+'" alt="">':'<span class="m-ph">'+uiIcon(t==='image'?'image':'play',16)+'</span>')+
            '<input data-field="media.caption.'+i+'" value="'+esc(m.caption||'')+'" placeholder="Caption" aria-label="Caption for item '+(i+1)+'">'+
            '<button class="ib" data-act="media-view" data-arg="'+i+'" title="Preview" aria-label="Preview">'+uiIcon('play',16)+'</button>'+
            '<button class="ib tb-danger" data-act="media-del" data-arg="'+i+'" title="Remove" aria-label="Remove">'+uiIcon('trash',16)+'</button></li>';}).join('')+'</ul>':
          '<p class="m-empty">Attach screenshots, short videos or an embed (YouTube, Vimeo) to show this part working.</p>')+
        '<div class="row"><button class="btn solid" data-act="upload-media">'+uiIcon('image',16)+'Upload</button></div>'+
        '<div class="row m-url"><input id="ss-murl" placeholder="Or paste an image, video or embed URL" aria-label="Media URL"><button class="btn" data-act="media-url">Add</button></div>'+
        '<p class="m-hint">You can also drop files straight onto the node. Viewers open them from its \u25b6 badge.</p></div>';
    }
  }else if(sel.nodes.length>1){
    var grouped=sel.nodes.every(function(id){var x=findNode(id);return x&&x.group&&x.group===findNode(sel.nodes[0]).group;});
    h+='<span class="tb-txt" style="cursor:default">'+sel.nodes.length+' selected</span><span class="sep"></span>'+
      '<button class="ib" data-act="pop" data-arg="color" title="Colour" aria-label="Change colour"><i class="swatch" style="--nc:var(--c-neutral)"></i></button>'+
      '<button class="tb-txt" data-act="nest-sel" title="Collapse into one module with an inner diagram (Ctrl+E)">'+uiIcon('nest',16)+'Nest</button>'+
      (grouped?'<button class="tb-txt" data-act="ungroup" title="Ungroup">'+uiIcon('ungroup',16)+'Ungroup</button>':'<button class="tb-txt" data-act="group" title="Draw a labelled group around them (Ctrl+G)">'+uiIcon('group',16)+'Group</button>')+
      '<button class="ib" data-act="dup" title="Duplicate (Ctrl+D)" aria-label="Duplicate">'+uiIcon('copy')+'</button>'+
      '<button class="ib tb-danger" data-act="del" title="Delete (Del)" aria-label="Delete">'+uiIcon('trash')+'</button>';
    if(pop==='color')p=colorPop(null);
  }else if(sel.edge!=null){
    var e=l.edges[sel.edge];if(!e){sel.edge=null;t.hidden=true;return;}
    var stl=e.style||defStyle(l),ar=e.arrow||defArrow(l);
    if(isSeq(l))h+='<button class="ib" data-act="emove" data-arg="-1" title="Earlier in the sequence" aria-label="Move message earlier"'+(sel.edge===0?' disabled':'')+'>'+uiIcon('up')+'</button><button class="ib" data-act="emove" data-arg="1" title="Later in the sequence" aria-label="Move message later"'+(sel.edge===l.edges.length-1?' disabled':'')+'>'+uiIcon('down')+'</button><span class="sep"></span>';
    h+='<button class="ib" data-act="estyle" data-arg="flow" aria-pressed="'+(stl==='flow')+'" title="Moving: data flows along it" aria-label="Moving line">'+uiIcon('lineFlow')+'</button>'+
      '<button class="ib" data-act="estyle" data-arg="solid" aria-pressed="'+(stl==='solid')+'" title="Solid: dependency or call" aria-label="Solid line">'+uiIcon('lineSolid')+'</button>'+
      '<button class="ib" data-act="estyle" data-arg="dashed" aria-pressed="'+(stl==='dashed')+'" title="Dotted: optional, fallback, async" aria-label="Dotted line">'+uiIcon('lineDot')+'</button><span class="sep"></span>'+
      '<button class="ib" data-act="earrow" data-arg="end" aria-pressed="'+(ar==='end')+'" title="Arrow at end" aria-label="Arrow at end">'+uiIcon('arrowR')+'</button>'+
      '<button class="ib" data-act="earrow" data-arg="both" aria-pressed="'+(ar==='both')+'" title="Arrows both ways" aria-label="Arrows both ways">'+uiIcon('arrowB')+'</button>'+
      '<button class="ib" data-act="earrow" data-arg="none" aria-pressed="'+(ar==='none')+'" title="No arrow" aria-label="No arrow">'+uiIcon('arrowN')+'</button><span class="sep"></span>'+
      (isSeq(l)?'':['curved','orthogonal','straight'].map(function(r){return '<button class="ib" data-act="eroute" data-arg="'+r+'" aria-pressed="'+(edgeRoute(e,l)===r)+'" title="'+ROUTE_NAMES[r]+' path" aria-label="'+ROUTE_NAMES[r]+' path">'+uiIcon('route-'+r)+'</button>';}).join('')+
        (e.points&&e.points.length?'<button class="tb-txt" data-act="ereset" title="Remove the bend points">Reset path</button>':'')+'<span class="sep"></span>')+
      (levelType(l)==='class'||e.rel?'<button class="tb-txt" data-act="pop" data-arg="rel" title="UML relation">'+(e.rel?e.rel.charAt(0).toUpperCase()+e.rel.slice(1):'Relation')+uiIcon('chev',14)+'</button>':'')+
      '<button class="tb-txt" data-act="elabel" title="Edit label (double-click)">Label</button>'+
      '<button class="ib" data-act="ereverse" title="Reverse direction" aria-label="Reverse">'+uiIcon('reverse')+'</button>'+
      '<button class="ib tb-danger" data-act="del" title="Delete (Del)" aria-label="Delete">'+uiIcon('trash')+'</button>';
    if(pop==='rel')p='<div class="menu">'+['','inherits','implements','composition','aggregation','association','dependency'].map(function(k){return '<button data-act="set-rel" data-arg="'+k+'" aria-pressed="'+((e.rel||'')===k)+'"><span>'+(k?k.charAt(0).toUpperCase()+k.slice(1):'None')+'<small>'+({'':'A plain link',inherits:'Child \u2192 parent class',implements:'Class \u2192 interface',composition:'Owner \u25c6\u2192 part that lives and dies with it',aggregation:'Owner \u25c7\u2192 part that can exist alone',association:'Holds a reference',dependency:'Uses it for a while'}[k])+'</small></span></button>';}).join('')+'</div>';
  }else if(sel.group){
    var g=l.groups.find(function(x){return x.id===sel.group;});if(!g){sel.group=null;t.hidden=true;return;}
    h+='<button class="tb-txt" data-act="glabel" title="Rename (double-click)">Rename</button>'+
      '<button class="ib" data-act="pop" data-arg="color" title="Colour" aria-label="Change colour"><i class="swatch" style="--nc:'+colorVar(g.color||'slate')+'"></i></button>'+
      '<button class="tb-txt" data-act="nest-group" title="Collapse the group into one module">'+uiIcon('nest',16)+'Nest</button>'+
      '<button class="tb-txt" data-act="ungroup" title="Remove the group, keep its nodes">'+uiIcon('ungroup',16)+'Ungroup</button>';
    if(pop==='color')p=colorPop(g.color||'slate');
  }
  t.innerHTML=h+(p?'<div class="pop" id="ss-pop">'+p+'</div>':'');
  t.hidden=false;
  placeOverlays();
}
function colorPop(cur){return popGrid(COLORS.map(function(c){return '<button data-act="set-color" data-arg="'+c+'" title="'+c+'" aria-label="'+c+'" aria-pressed="'+(cur===c)+'" style="width:32px;height:32px"><i class="swatch" style="--nc:var(--c-'+c+');width:20px;height:20px"></i></button>';}).join(''),7,32);}
function selBox(){
  var l=cur();
  if(sel.nodes.length){var x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;sel.nodes.forEach(function(id){var n=findNode(id);if(!n)return;var b=nodeBox(n);x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h);});return x0===Infinity?null:{x:x0,y:y0,w:x1-x0,h:y1-y0};}
  if(sel.edge!=null){var e=l.edges[sel.edge],g=e&&(isSeq(l)?seqGeom(e,sel.edge,l):edgeGeom(e,l));return g?{x:g.mx-1,y:g.my-12,w:2,h:24}:null;}
  if(sel.group){var gr=l.groups.find(function(x){return x.id===sel.group;});return gr?groupBox(gr,l):null;}
  return null;
}
function placeOverlays(){
  var t=$('#ss-ftb');
  if(t&&!t.hidden){
    var b=selBox();
    if(!b){t.hidden=true;}
    else{
      var a=toScreen(b.x,b.y),z=toScreen(b.x+b.w,b.y+b.h),app=$('#app').getBoundingClientRect();
      var tw=t.offsetWidth,th=t.offsetHeight,x=(a.x+z.x)/2-tw/2,y=a.y-th-12,below=false;
      if(y<70){y=z.y+12;below=true;}
      x=clamp(x,8,app.width-tw-8);y=clamp(y,8,app.height-th-8);
      t.style.left=x+'px';t.style.top=y+'px';
      var pp=$('#ss-pop');
      if(pp){pp.classList.toggle('up',!below&&y+th+pp.offsetHeight+20>app.height);pp.style.left=Math.max(0,Math.min(tw-pp.offsetWidth,0))+'px';}
    }
  }
  placeCard();
  if(inlineEd)placeInline();
}

/* ================= view detail card ================= */
function renderCard(){
  var c=$('#ss-card'),n=detailId&&findNode(detailId);
  if(!n||mode!=='view'){c.hidden=true;return;}
  var h='<div class="card-head" style="--nc:'+colorVar(n.color)+';--rc:'+roleVar(n.role)+'"><div><h3>'+esc(n.label)+'</h3>'+(n.role?'<span class="pill">'+(n.role==='input'?'Input':'Output')+'</span>':'')+(n.tag?'<span class="pill" style="--rc:var(--nc)">'+esc(n.tag)+'</span>':'')+(DIFF_TEXT[n.diff]?'<span class="pill diff-'+n.diff+'">'+DIFF_TEXT[n.diff]+'</span>':'')+'</div>'+
    '<button class="ib card-x" data-act="close-card" aria-label="Close">'+uiIcon('close')+'</button></div>';
  h+=n.note?'<p>'+esc(n.note)+'</p>':'<p class="muted">No notes yet.</p>';
  if(n.source&&n.source.length)h+='<div class="src">'+n.source.map(function(s){var u=srcLink(s);return u?'<a class="src-link" href="'+esc(u)+'" target="_blank" rel="noopener"><code>'+esc(s)+'</code>'+uiIcon('open',13)+'</a>':'<code>'+esc(s)+'</code>';}).join('')+'</div>';
  if(n.confidence&&CONF_TEXT[n.confidence])h+='<p class="conf-line conf-'+n.confidence+'">'+esc(CONF_TEXT[n.confidence])+'</p>';
  var ml=mediaList(n);
  if(ml.length&&!hasInner(n))h+='<div class="card-media">'+ml.map(function(m,i){var t=mediaType(m),th=t==='image'?m.src:m.poster;return '<button data-act="view-media" data-arg="'+esc(n.id)+'" data-i="'+i+'" title="'+esc(m.caption||'View')+'">'+(th?'<img src="'+esc(th)+'" alt="'+esc(m.caption||n.label)+'">':'<span class="m-ph">'+uiIcon('play',18)+'</span>')+'</button>';}).join('')+'</div>';
  if(n.fields&&n.fields.length)h+='<div class="src">'+n.fields.map(function(f){return '<code>'+esc(f)+'</code>';}).join('')+'</div>';
  if(hasInner(n))h+='<p><button class="btn solid" data-act="open-node" data-arg="'+esc(n.id)+'">'+uiIcon('open')+'<span>Open inner diagram</span></button></p>';
  c.innerHTML=h;c.hidden=false;placeCard();
}
function placeCard(){
  var c=$('#ss-card'),n=detailId&&findNode(detailId);
  if(!c||c.hidden||!n)return;
  var a=toScreen(n.x+nw(n)/2,n.y-nh(n)/2),b=toScreen(n.x-nw(n)/2,n.y),app=$('#app').getBoundingClientRect();
  var x=a.x+14,y=a.y;
  if(x+c.offsetWidth>app.width-8)x=b.x-c.offsetWidth-14;
  c.style.left=clamp(x,8,app.width-c.offsetWidth-8)+'px';c.style.top=clamp(y,70,app.height-c.offsetHeight-8)+'px';
}

/* ================= inline text editing ================= */
function startInline(kind,ref){
  if(mode!=='edit')return;
  finishInline(true);
  var l=cur(),val='',box,fs=14.5,bold=true;
  if(kind==='node'){var n=findNode(ref);if(!n)return;val=n.label;fs=FS[(n.text||{}).size]||FS.m;box={x:n.x-nw(n)/2+6,y:n.y-nh(n)/2+6,w:nw(n)-12,h:nh(n)-12};}
  else if(kind==='edge'){var e=l.edges[ref],g=isSeq(l)?seqGeom(e,ref,l):edgeGeom(e,l);if(!g)return;val=e.label||'';fs=12.5;bold=false;box={x:g.mx-80,y:g.my-16,w:160,h:32};}
  else if(kind==='group'){var gr=l.groups.find(function(x){return x.id===ref;}),gb=groupBox(gr,l);val=gr.label||'';fs=14;box={x:gb.x+8,y:gb.y+6,w:Math.min(260,gb.w-16),h:30};}
  inlineEd={kind:kind,ref:ref,box:box,fs:fs,orig:val};
  var ta=document.createElement('textarea');
  ta.className='inline-edit';ta.value=val;ta.style.fontWeight=bold?'600':'500';ta.setAttribute('aria-label','Edit text');
  $('#app').appendChild(ta);inlineEd.el=ta;
  ta.addEventListener('keydown',function(ev){
    if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();finishInline(true);}
    else if(ev.key==='Escape'){ev.preventDefault();finishInline(false);}
    else if(ev.key==='Tab'&&kind==='node'){ev.preventDefault();var id=ref;finishInline(true);addNext(id);}
    ev.stopPropagation();
  });
  ta.addEventListener('blur',function(){finishInline(true);});
  renderToolbar();placeInline();ta.focus();ta.select();
}
function placeInline(){
  var ie=inlineEd;if(!ie)return;
  var a=toScreen(ie.box.x,ie.box.y),k=a.k;
  ie.el.style.left=a.x+'px';ie.el.style.top=a.y+'px';ie.el.style.width=Math.max(80,ie.box.w*k)+'px';ie.el.style.height=Math.max(28,ie.box.h*k)+'px';
  ie.el.style.fontSize=Math.max(11,ie.fs*k)+'px';
}
function finishInline(save){
  var ie=inlineEd;if(!ie)return;inlineEd=null;
  var v=ie.el.value;ie.el.remove();
  if(save&&v!==ie.orig){
    commit(function(){
      var l=cur();
      if(ie.kind==='node'){var n=findNode(ie.ref);if(n)n.label=v.trim()||n.label;}
      else if(ie.kind==='edge'){var e=l.edges[ie.ref];if(e){if(v.trim())e.label=v.trim();else delete e.label;}}
      else if(ie.kind==='group'){var g=l.groups.find(function(x){return x.id===ie.ref;});if(g)g.label=v.trim()||g.label;}
    });
  }else renderToolbar();
}

/* ================= zoom transitions ================= */
async function zoomIn(id,fast){
  var l=cur(),n=findNode(id,l);if(!n||!n.children)return false;
  finishInline(true);
  var d1=fast?300:520,d2=fast?360:620;
  detailId=null;traceId=null;$('#ss-card').hidden=true;$('#ss-ftb').hidden=true;
  scene.classList.remove('tracing');scene.classList.add('zooming');
  var el=scene.querySelector('.node[data-id="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]');if(el)el.classList.add('target');
  await animateCam(fitTo({x:n.x-nw(n)/2,y:n.y-nh(n)/2,w:nw(n),h:nh(n)},{t:0,r:0,b:0,l:0}),d1);
  path.push(id);sel={nodes:[],edge:null,group:null};pop=null;
  scene.classList.remove('zooming');scene.classList.add('arriving');
  renderAll();renderAbout();
  var fit=fitTo(viewTarget());setCam(scaleBox(fit,3.2));
  void scene.getBoundingClientRect();scene.classList.remove('arriving');
  await animateCam(fit,d2);
  return true;
}
async function zoomOut(fast){
  if(!path.length)return;
  finishInline(true);
  var d1=fast?260:440,d2=fast?360:620,id=path[path.length-1];
  detailId=null;traceId=null;$('#ss-card').hidden=true;$('#ss-ftb').hidden=true;
  scene.classList.add('leaving');
  await animateCam(scaleBox(cam,3.2),d1);
  path.pop();sel={nodes:[],edge:null,group:null};pop=null;
  renderAll();
  var n=findNode(id);if(n)setCam(fitTo({x:n.x-nw(n)/2,y:n.y-nh(n)/2,w:nw(n),h:nh(n)},{t:0,r:0,b:0,l:0}));
  scene.classList.remove('leaving');
  await animateCam(fitTo(viewTarget()),d2);
}
var fromHistory=false;
async function goToPath(target){
  if(busy)return;busy=true;hideHint();var before=path.join('/');
  try{
    var common=0;while(common<path.length&&common<target.length&&path[common]===target[common])common++;
    var hops=(path.length-common)+(target.length-common),fast=hops>1;
    while(path.length>common)await zoomOut(fast);
    for(var k=common;k<target.length;k++){if(!(await zoomIn(target[k],fast)))break;}
  }finally{
    busy=false;renderToolbar();
    if(!fromHistory&&path.join('/')!==before){try{history.pushState({unfold:path.slice()},'');}catch(e){}}
    fromHistory=false;
  }
}
function activate(id){
  var n=findNode(id);if(!n)return;
  if(answerQuiz(id))return;
  hideHint();
  if(hasInner(n))goToPath(path.concat([id]));
  else if(mediaList(n).length&&!n.note&&!(n.source&&n.source.length))openMedia(n,0);
  else{detailId=id;renderCard();}
}

/* ================= editing operations ================= */
function snapshot(){return JSON.stringify(data);}
function pushHistory(snap){undoStack.push(snap);if(undoStack.length>150)undoStack.shift();redoStack=[];}
function commit(fn){var before=snapshot();fn();if(snapshot()!==before){pushHistory(before);markDirty();}renderAll();}
function validatePath(){while(path.length&&!levelAt(path))path.pop();}
function cleanSel(){var l=cur();sel.nodes=sel.nodes.filter(function(id){return findNode(id,l);});if(sel.edge!=null&&!l.edges[sel.edge])sel.edge=null;if(sel.group&&!l.groups.some(function(g){return g.id===sel.group;}))sel.group=null;}
function undo(){if(!undoStack.length)return;redoStack.push(snapshot());data=JSON.parse(undoStack.pop());validatePath();cleanSel();markDirty();renderAll();}
function redo(){if(!redoStack.length)return;undoStack.push(snapshot());data=JSON.parse(redoStack.pop());validatePath();cleanSel();markDirty();renderAll();}
var draftTimer=null;
function markDirty(){
  dirty=snapshot()!==originalJSON;
  clearTimeout(draftTimer);
  draftTimer=setTimeout(function(){try{if(dirty)localStorage.setItem(draftKey,snapshot());else localStorage.removeItem(draftKey);}catch(e){}},300);
}
function viewCenter(){var ins=insets(),r=svg.getBoundingClientRect();return toWorld({clientX:r.left+ins.l+(r.width-ins.l-ins.r)/2,clientY:r.top+ins.t+(r.height-ins.t-ins.b)/2});}
function newNode(l,shape,x,y,label){
  shape=shape||defShape(l);
  var n={id:uid(l,label||SHAPES[shape].name),label:label||defaultLabel(shape),shape:shape,x:snap(x),y:snap(y)};
  if(shape==='rounded')n.icon='box';
  if(shape==='cylinder')n.color='teal';
  if(shape==='cloud')n.color='slate';
  if(shape==='diamond')n.color='amber';
  if(shape==='text')n.color='neutral';
  return n;
}
function defaultLabel(shape){return {rounded:'Component',rect:'Step',pill:'Start',diamond:'Condition?',parallelogram:'Data',cylinder:'Store',document:'File',hexagon:'Prepare',cloud:'Service',circle:'Event',triangle:'Note',text:'Text',table:'Entity',image:'Image',initial:'',final:'Done'}[shape]||'Node';}
function cssId(id){return window.CSS&&CSS.escape?CSS.escape(id):id;}
function inBox(p,n,pad){var b=nodeBox(n);return p.x>=b.x-pad&&p.x<=b.x+b.w+pad&&p.y>=b.y-pad&&p.y<=b.y+b.h+pad;}
// the node under a point, or the nearest one within a short reach of it (24 px on screen)
function nodeNear(p,skip){
  var l=cur(),reach=pxToWorld(24),best=null,bd=Infinity;
  for(var i=l.nodes.length-1;i>=0;i--){
    var n=l.nodes[i];if(n.id===skip)continue;
    var b=nodeBox(n),dx=Math.max(b.x-p.x,0,p.x-b.x-b.w),dy=Math.max(b.y-p.y,0,p.y-b.y-b.h),d=Math.hypot(dx,dy);
    if(d===0)return n;if(d<=reach&&d<bd){bd=d;best=n;}
  }
  return best;
}
function linkNodes(from,to){
  var l=cur(),k=-1;l.edges.forEach(function(x,i){if(x.from===from&&x.to===to)k=i;});
  if(k>=0){setSel({edge:k});toast('These two are already linked.');return;}
  commit(function(){l.edges.push({from:from,to:to});sel={nodes:[],edge:l.edges.length-1,group:null};});
}
var linkFrom=null;
function startLink(id){linkFrom=id;document.body.classList.add('linking');pop=null;renderToolbar();toast('Click the node to link to. Esc cancels.');}
function endLink(){linkFrom=null;document.body.classList.remove('linking');$('#ss-toast').hidden=true;}
// bend points of edges whose two ends move together travel with them
function bendsWithin(l,ids){var s={};ids.forEach(function(id){s[id]=1;});return l.edges.filter(function(e){return s[e.from]&&s[e.to]&&e.points&&e.points.length;}).map(function(e){return {e:e,pts:clone(e.points)};});}
// a dragged bend point snaps level with its neighbours, which makes straight runs easy
function alignBend(e,k,x,y){
  var l=cur(),a=findNode(e.from,l),b=findNode(e.to,l),nb=[k?{x:e.points[k-1][0],y:e.points[k-1][1]}:a,k<e.points.length-1?{x:e.points[k+1][0],y:e.points[k+1][1]}:b],r=pxToWorld(8);
  nb.forEach(function(q){if(!q)return;if(Math.abs(q.x-x)<r)x=q.x;if(Math.abs(q.y-y)<r)y=q.y;});
  return [x,y];
}
// the free spot nearest to (x,y) for a new node of this shape, so it never lands on top of another
function freeSpot(l,shape,x,y){
  var w=(SHAPES[shape]||SHAPES.rounded).w,h=(SHAPES[shape]||SHAPES.rounded).h,G=24;
  function clear(cx,cy){return !l.nodes.some(function(n){var b=nodeBox(n);return cx-w/2<b.x+b.w+G&&cx+w/2>b.x-G&&cy-h/2<b.y+b.h+G&&cy+h/2>b.y-G;});}
  if(clear(x,y))return {x:x,y:y};
  for(var r=1;r<40;r++)for(var a=0;a<8*r;a++){var t=a/(8*r)*Math.PI*2,cx=x+Math.cos(t)*r*40,cy=y+Math.sin(t)*r*30;if(clear(cx,cy))return {x:cx,y:cy};}
  return {x:x,y:y};
}
function addNodeAt(shape,x,y,edit){
  var id;
  commit(function(){var l=cur(),n=newNode(l,shape,x,y);l.nodes.push(n);id=n.id;sel={nodes:[id],edge:null,group:null};});
  if(shape==='image'){pendingMedia={id:id};$('#ss-file').click();return id;}
  if(edit!==false)startInline('node',id);
  return id;
}
function addNext(fromId){
  var l=cur(),a=findNode(fromId,l);if(!a)return;
  var dir=levelDir(l),x=a.x,y=a.y,step=dir==='LR'?nw(a)+120:nh(a)+90;
  if(dir==='LR')x+=step;else y+=step;
  while(l.nodes.some(function(n){return Math.abs(n.x-x)<60&&Math.abs(n.y-y)<50;})){if(dir==='LR')y+=nh(a)+40;else x+=nw(a)+40;}
  var f=freeSpot(l,a.shape==='pill'||a.shape==='diamond'?defShape(l):a.shape,x,y),id;x=f.x;y=f.y;
  commit(function(){var n=newNode(l,a.shape==='pill'||a.shape==='diamond'?null:a.shape,x,y);if(a.color&&a.shape===n.shape)n.color=a.color;l.nodes.push(n);l.edges.push({from:a.id,to:n.id});id=n.id;sel={nodes:[id],edge:null,group:null};});
  startInline('node',id);
}
function deleteSel(){
  if(!hasSel())return;
  commit(function(){
    var l=cur();
    if(sel.nodes.length){var s={};sel.nodes.forEach(function(id){s[id]=1;});l.nodes=l.nodes.filter(function(n){return !s[n.id];});l.edges=l.edges.filter(function(e){return !s[e.from]&&!s[e.to];});}
    else if(sel.edge!=null)l.edges.splice(sel.edge,1);
    else if(sel.group){var gid=sel.group;l.groups=l.groups.filter(function(g){return g.id!==gid;});l.nodes.forEach(function(n){if(n.group===gid)delete n.group;});}
    pruneGroups(l);
    sel={nodes:[],edge:null,group:null};pop=null;
  });
}
function pruneGroups(l){l.groups=l.groups.filter(function(g){return l.nodes.some(function(n){return n.group===g.id;});});}
function copySel(){
  if(!sel.nodes.length)return false;
  var l=cur(),s={};sel.nodes.forEach(function(id){s[id]=1;});
  clipboard={nodes:clone(l.nodes.filter(function(n){return s[n.id];})),edges:clone(l.edges.filter(function(e){return s[e.from]&&s[e.to];}))};
  return true;
}
function paste(offset){
  if(!clipboard)return;
  commit(function(){
    var l=cur(),map={},ids=[];
    clipboard.nodes.forEach(function(n){var c=clone(n);c.id=uid(l,n.label);map[n.id]=c.id;c.x+=offset;c.y+=offset;if(c.group&&!l.groups.some(function(g){return g.id===c.group;}))delete c.group;l.nodes.push(c);ids.push(c.id);});
    clipboard.edges.forEach(function(e){var c=clone(e);c.from=map[e.from];c.to=map[e.to];l.edges.push(c);});
    sel={nodes:ids,edge:null,group:null};
  });
}
function duplicate(){if(copySel())paste(40);}
function groupSel(){
  if(sel.nodes.length<1)return;
  var gid;
  commit(function(){var l=cur();gid='g'+Math.random().toString(36).slice(2,6);l.groups.push({id:gid,label:'Group',color:'slate'});sel.nodes.forEach(function(id){var n=findNode(id,l);if(n)n.group=gid;});pruneGroups(l);sel={nodes:[],edge:null,group:gid};});
  startInline('group',gid);
}
function ungroup(){
  commit(function(){
    var l=cur(),gids={};
    if(sel.group)gids[sel.group]=1;
    sel.nodes.forEach(function(id){var n=findNode(id,l);if(n&&n.group)gids[n.group]=1;});
    l.nodes.forEach(function(n){if(gids[n.group])delete n.group;});
    pruneGroups(l);if(sel.group)sel={nodes:[],edge:null,group:null};
  });
}
function nestNodes(ids){
  if(!ids.length)return;
  var mid;
  commit(function(){
    var l=cur(),s={};ids.forEach(function(id){s[id]=1;});
    var inner=l.nodes.filter(function(n){return s[n.id];});
    var cx=inner.reduce(function(a,n){return a+n.x;},0)/inner.length,cy=inner.reduce(function(a,n){return a+n.y;},0)/inner.length;
    var processy=inner.every(function(n){return ['rect','pill','diamond','parallelogram','hexagon','document','circle','text'].indexOf(n.shape)>=0;});
    var m=newNode(l,'rounded',cx,cy,'New module');m.id=uid(l,'module');mid=m.id;
    var child={type:processy?'process':levelType(l),caption:'',nodes:[],edges:[],groups:[]};
    var keptGroups={};
    inner.forEach(function(n){var c=clone(n);if(c.group)keptGroups[c.group]=1;child.nodes.push(c);});
    child.groups=clone(l.groups.filter(function(g){return keptGroups[g.id]&&!l.nodes.some(function(n){return !s[n.id]&&n.group===g.id;});}));
    var gIn={};child.groups.forEach(function(g){gIn[g.id]=1;});child.nodes.forEach(function(n){if(n.group&&!gIn[n.group])delete n.group;});
    var rest=[],seen={};
    l.edges.forEach(function(e){
      var a=!!s[e.from],b=!!s[e.to];
      if(a&&b){child.edges.push(clone(e));return;}
      if(!a&&!b){rest.push(e);return;}
      var ne=clone(e);
      if(a){ne.from=m.id;var inside=child.nodes.find(function(n){return n.id===e.from;});if(inside&&!inside.role)inside.role='output';}
      else{ne.to=m.id;var ins=child.nodes.find(function(n){return n.id===e.to;});if(ins&&!ins.role)ins.role='input';}
      var key=ne.from+'>'+ne.to;if(seen[key])return;seen[key]=1;rest.push(ne);
    });
    m.children=child;
    l.nodes=l.nodes.filter(function(n){return !s[n.id];});l.nodes.push(m);l.edges=rest;pruneGroups(l);
    sel={nodes:[m.id],edge:null,group:null};pop=null;
  });
  startInline('node',mid);
}
function unnest(id){
  commit(function(){
    var l=cur(),n=findNode(id,l);if(!n||!n.children)return;
    var c=n.children,b=contentBox(c),dx=n.x-(b.x+b.w/2),dy=n.y-(b.y+b.h/2),map={},gmap={};
    c.groups.forEach(function(g){var ng=clone(g);ng.id=g.id;while(l.groups.some(function(x){return x.id===ng.id;}))ng.id+='x';gmap[g.id]=ng.id;l.groups.push(ng);});
    var added=c.nodes.map(function(cn){var x=clone(cn);x.id=uid(l,cn.id);map[cn.id]=x.id;x.x=snap(cn.x+dx);x.y=snap(cn.y+dy);if(x.group)x.group=gmap[x.group];delete x.role;if(n.group&&!x.group)x.group=n.group;l.nodes.push(x);return {src:cn,dst:x};});
    var ins=added.filter(function(a){return a.src.role==='input';}),outs=added.filter(function(a){return a.src.role==='output';});
    var targetsIn=added.filter(function(a){return !c.edges.some(function(e){return e.to===a.src.id;});}),targetsOut=added.filter(function(a){return !c.edges.some(function(e){return e.from===a.src.id;});});
    var entry=(ins.length?ins:targetsIn.length?targetsIn:added.slice(0,1)),exit=(outs.length?outs:targetsOut.length?targetsOut:added.slice(-1));
    var edges=[];
    l.edges.forEach(function(e){
      if(e.to===id)entry.forEach(function(a){var ne=clone(e);ne.to=a.dst.id;edges.push(ne);});
      else if(e.from===id)exit.forEach(function(a){var ne=clone(e);ne.from=a.dst.id;edges.push(ne);});
      else edges.push(e);
    });
    c.edges.forEach(function(e){var ne=clone(e);ne.from=map[e.from];ne.to=map[e.to];edges.push(ne);});
    l.edges=edges;l.nodes=l.nodes.filter(function(x){return x.id!==id;});pruneGroups(l);
    sel={nodes:added.map(function(a){return a.dst.id;}),edge:null,group:null};pop=null;
  });
}
function createInner(id,type){
  commit(function(){var n=findNode(id);if(n&&!n.children)n.children={type:type,caption:'',nodes:[],edges:[],groups:[]};pop=null;});
  goToPath(path.concat([id]));
}
function tidy(){
  var cleared=0;
  commit(function(){var l=cur(),d=levelDir(l);l.direction=d;l.edges.forEach(function(e){if(e.points){delete e.points;cleared++;}});layoutAny(l);});fitView(380);
  if(cleared)toast('Tidy reset '+cleared+' custom path'+(cleared>1?'s':'')+'.',{act:'undo',label:'Undo'});
}
var fieldSnap=null;
function updateField(f,v){
  var l=cur();
  if(f==='caption'){l.caption=v;}
  else if(sel.nodes.length===1){
    var n=findNode(sel.nodes[0]);if(!n)return;
    if(/^media\.caption\.\d+$/.test(f)){var ml=mediaList(n),mi=+f.split('.')[2];if(ml[mi]){if(v.trim())ml[mi].caption=v;else delete ml[mi].caption;setMedia(n,ml);}}
    else if(f==='fields'||f==='methods'){var fl=v.split('\n').map(function(x){return x.trim();}).filter(Boolean);if(fl.length)n[f]=fl;else delete n[f];}
    else if(f==='source'){var arr=v.split('\n').map(function(x){return x.trim();}).filter(Boolean);if(arr.length)n.source=arr;else delete n.source;}
    else if(f==='icon'){if(v.trim())n.icon=v.trim();else delete n.icon;}
    else{if(v.trim())n[f]=v;else delete n[f];}
    queueScene();
  }
  markDirty();
}

/* ================= export, save, draft ================= */
function buildDocument(){
  var css=document.getElementById('ss-css').textContent,js=document.getElementById('ss-engine').textContent;
  var json=JSON.stringify(data,null,1).replace(/</g,'\\u003c');
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>'+esc(data.meta.title)+'</title>\n'+FONT_LINKS+
    '\n<style id="ss-css">'+css+'</style>\n</head>\n<body>\n<div id="app"></div>\n<script type="application/json" id="story-data">'+json+'<\/script>\n<script id="ss-engine">'+js+'<\/script>\n</body>\n</html>\n';
}
async function download(filename,text){
  if(downloadsCap){
    try{await downloadsCap.save({filename:filename,data:text});toast('Saved '+filename);}
    catch(err){if(err&&err.code==='declined')return;if(err&&err.code==='rate_limited'){toast('A save prompt is already open.');return;}downloadsCap=null;anchorDownload(filename,text);}
    return;
  }
  anchorDownload(filename,text);
}
function anchorDownload(filename,text){
  var blob=new Blob([text],{type:/\.(json|excalidraw)$/.test(filename)?'application/json':/\.svg$/.test(filename)?'image/svg+xml':/\.(md)$/.test(filename)?'text/markdown':/\.drawio$/.test(filename)?'application/xml':'text/html'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);toast('Copied the diagram data');}
  catch(e){var ta=$('#ss-json');if(ta){ta.closest('details').open=true;ta.focus();ta.select();try{document.execCommand('copy');toast('Copied the diagram data');}catch(e2){toast('Press Ctrl+C to copy the selected data');}}}
}
async function saveToPage(){
  if(!artifactCap||!dirty)return;
  try{localStorage.removeItem(draftKey);}catch(e){}
  try{toast('Saving\u2026');await artifactCap.publish(buildDocument());}
  catch(err){
    try{localStorage.setItem(draftKey,snapshot());}catch(e){}
    var c=err&&err.code;
    if(c==='conflict')toast('A newer version was saved elsewhere. Reloading it now.');
    else if(['not_writer','not_granted','not_declared','capability_disabled','capability_removed','consent_required'].indexOf(c)>=0){readOnly=true;renderHeader();toast('This view is read-only. Use Export to keep your edits.');}
    else if(c==='rate_limited')toast('Saving too often. Wait a moment, then save again.');
    else toast('Saving failed: '+((err&&err.message)||'unknown error')+'. Your edits are kept in this browser.');
  }
}
var toastTimer=null;
function toast(msg,action){
  var t=$('#ss-toast');
  t.innerHTML='<span>'+esc(msg)+'</span>'+(action?'<button class="btn" data-act="'+action.act+'">'+esc(action.label)+'</button>':'');
  t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.hidden=true;},action?9000:3200);
}
function openModal(html){var m=$('#ss-modal');m.innerHTML='<div class="dialog" role="dialog" aria-modal="true">'+html+'</div>';m.hidden=false;var f=m.querySelector('button');if(f)f.focus();}
function closeModal(){var m=$('#ss-modal');m.hidden=true;m.innerHTML='';}
function openExport(){
  openModal('<div class="dlg-head"><h2>Export</h2><button class="ib" data-act="close-modal" aria-label="Close">'+uiIcon('close')+'</button></div>'+
    '<h3 class="ex-h">This map</h3><div class="row"><button class="btn solid" data-act="dl-html">'+uiIcon('export')+'Page (.html)</button><button class="btn" data-act="dl-json">Data (.json)</button><button class="btn" data-act="copy-json">Copy data</button></div>'+
    '<h3 class="ex-h">Pictures</h3><div class="row"><button class="btn" data-act="ex-png">'+uiIcon('image',16)+'This level (.png)</button><button class="btn" data-act="ex-svg">This level (.svg)</button><button class="btn" data-act="ex-pdf">All levels (PDF)</button><button class="btn" data-act="ex-readme">README embed</button></div>'+
    '<h3 class="ex-h">Other tools</h3><div class="row"><button class="btn" data-act="ex-mermaid">Mermaid (.md, all levels)</button><button class="btn" data-act="ex-drawio">draw.io (.drawio)</button><button class="btn" data-act="ex-excalidraw">Excalidraw (this level)</button></div>'+
    '<details><summary>Import a Mermaid diagram into this level</summary><textarea id="ss-mm" class="mono" spellcheck="false" rows="7" aria-label="Mermaid text" placeholder="flowchart LR&#10;  api[API] --> db[(Orders)]"></textarea>'+
    '<div class="row"><button class="btn" data-act="ex-import">Import</button><span id="ss-mm-err" class="err" role="alert"></span></div></details>'+
    '<details><summary>Edit the data directly</summary><textarea id="ss-json" spellcheck="false" aria-label="Diagram data">'+esc(JSON.stringify(data,null,2))+'</textarea>'+
    '<div class="row"><button class="btn" data-act="apply-json">Apply data</button><span id="ss-json-err" class="err" role="alert"></span></div></details>');
}
function openHelp(){
  var k=[['Click','Open a module, or show a step\u2019s details'],['Hover','Trace what flows into and out of a step'],['Esc','Back one level / clear selection'],['Wheel, pinch','Zoom'],['Drag background','Pan (view) / select area (edit)'],['Space + drag','Pan while editing'],['F','Fit to screen'],['E','Switch between View and Edit'],
    ['Double-click','Edit text, or add a node on empty canvas'],['Drag a blue dot','Draw a link: drop on (or near) a node to connect, on empty canvas to add a connected node'],['Link button','Link the selected node: then click the target'],['Select a link','Drag its hollow dot to bend it; double-click a bend point to remove it'],['Drop files on a node','Attach images or videos to it (or use the picture button)'],['Tab (while typing)','Add the next connected step'],['Enter','Edit the selected node\u2019s text'],['Shift + click','Add to selection'],['Ctrl+G / Ctrl+E','Group / nest the selection'],['Ctrl+D, Ctrl+C/V','Duplicate, copy, paste'],['Arrows','Nudge (Shift for 10\u00d7)'],['Delete','Remove selection'],['Ctrl+Z / Ctrl+Shift+Z','Undo / redo']];
  openModal('<div class="dlg-head"><h2>Shortcuts</h2><button class="ib" data-act="close-modal" aria-label="Close">'+uiIcon('close')+'</button></div><div class="keys">'+k.map(function(r){return '<kbd>'+r[0]+'</kbd><span>'+r[1]+'</span>';}).join('')+'</div>');
}
function applyJSON(){
  var ta=$('#ss-json'),err=$('#ss-json-err');
  try{var d=normalize(JSON.parse(ta.value));var before=snapshot();data=d;pushHistory(before);path=[];sel={nodes:[],edge:null,group:null};markDirty();closeModal();renderAll();fitView(0);toast('Applied the new data');}
  catch(e){err.textContent='Not applied: '+e.message;}
}
function discardDraft(){
  try{localStorage.removeItem(draftKey);}catch(e){}
  data=JSON.parse(originalJSON);undoStack=[];redoStack=[];path=[];sel={nodes:[],edge:null,group:null};dirty=false;
  renderAll();fitView(0);$('#ss-toast').hidden=true;
}
function setMode(m){
  if(m===mode)return;finishInline(true);if(m==='edit'&&tour)endTour();
  mode=m;document.body.classList.toggle('editing',mode==='edit');
  sel={nodes:[],edge:null,group:null};pop=null;detailId=null;setTrace(null);
  renderAll();if(!busy)fitView(320);
}

/* ================= pointer input ================= */
var drag=null,pointers=new Map(),hoverRaf=0;
function onDown(e){
  if(busy)return;
  if(inlineEd)finishInline(true);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{svg.setPointerCapture(e.pointerId);}catch(_){}
  if(pointers.size===2){
    var pts=Array.from(pointers.values());
    drag={kind:'pinch',d0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)||1,cam0:Object.assign({},cam),wm:toWorld({clientX:(pts[0].x+pts[1].x)/2,clientY:(pts[0].y+pts[1].y)/2}),moved:true};return;
  }
  var t=e.target,w=toWorld(e),cl=function(s){return t.closest&&t.closest(s);};
  var nodeEl=cl('.node'),edgeEl=cl('.edge'),groupEl=cl('.group'),portEl=cl('.port'),rsEl=cl('.rs'),enterEl=cl('.enter');
  var base={sx:e.clientX,sy:e.clientY,moved:false,cam0:Object.assign({},cam),start:w};
  if(e.button===3){goToPath(path.slice(0,-1));return;}
  var panBtn=e.button===1||e.button===2;
  if(enterEl&&nodeEl){drag=Object.assign(base,{kind:'enter',id:nodeEl.dataset.id});return;}
  if(mode==='view'){
    if(nodeEl&&!panBtn){drag=Object.assign(base,{kind:'tap',id:nodeEl.dataset.id});return;}
    drag=Object.assign(base,{kind:'pan'});return;
  }
  if(spaceDown||panBtn||(e.pointerType==='touch'&&!nodeEl&&!edgeEl&&!groupEl)){drag=Object.assign(base,{kind:'pan'});return;}
  var l=cur();
  if(linkFrom){var lf=linkFrom;endLink();if(nodeEl&&nodeEl.dataset.id!==lf)linkNodes(lf,nodeEl.dataset.id);drag=null;return;}
  var wpEl=cl('.wp'),wpmEl=cl('.wpm');
  if((wpEl||wpmEl)&&sel.edge!=null){drag=Object.assign(base,{kind:'wp',i:sel.edge,k:+(wpEl||wpmEl).dataset.k,add:!!wpmEl,snap:snapshot()});return;}
  if(portEl&&nodeEl){var src=findNode(nodeEl.dataset.id),p=port(src,portEl.dataset.port);drag=Object.assign(base,{kind:'connect',from:src.id,p:p});return;}
  if(rsEl&&nodeEl){var rn=findNode(nodeEl.dataset.id);drag=Object.assign(base,{kind:'resize',n:rn,w0:nw(rn),h0:nh(rn),x0:rn.x,y0:rn.y,snap:snapshot()});return;}
  if(nodeEl){
    var id=nodeEl.dataset.id;
    if(e.shiftKey||e.metaKey||e.ctrlKey){var i=sel.nodes.indexOf(id);var ns=sel.nodes.slice();if(i>=0)ns.splice(i,1);else ns.push(id);setSel({nodes:ns});drag=null;return;}
    if(sel.nodes.indexOf(id)<0)setSel({nodes:[id]});
    drag=Object.assign(base,{kind:'move',items:sel.nodes.map(function(x){var n=findNode(x,l);return {n:n,x:n.x,y:n.y};}),bends:bendsWithin(l,sel.nodes),snap:snapshot()});return;
  }
  if(edgeEl){setSel({edge:+edgeEl.dataset.i});drag=null;return;}
  if(groupEl){
    var gid=groupEl.dataset.gid;if(sel.group!==gid)setSel({group:gid});
    var gm=l.nodes.filter(function(n){return n.group===gid;});
    drag=Object.assign(base,{kind:'move',items:gm.map(function(n){return {n:n,x:n.x,y:n.y};}),bends:bendsWithin(l,gm.map(function(n){return n.id;})),snap:snapshot()});return;
  }
  drag=Object.assign(base,{kind:'marquee',add:e.shiftKey?sel.nodes.slice():[]});
}
function onMove(e){
  if(!pointers.has(e.pointerId)){hoverTrace(e);return;}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(!drag)return;
  var r=svg.getBoundingClientRect();
  if(drag.kind==='pinch'){
    if(pointers.size<2)return;
    var pts=Array.from(pointers.values()),d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)||1,k=clamp(drag.d0/d,.05,20);
    var w=clamp(drag.cam0.w*k,150,60000),h=w*drag.cam0.h/drag.cam0.w,mx=(pts[0].x+pts[1].x)/2,my=(pts[0].y+pts[1].y)/2;
    setCam({x:drag.wm.x-(mx-r.left)/r.width*w,y:drag.wm.y-(my-r.top)/r.height*h,w:w,h:h});maybeLeave(k);return;
  }
  if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<4)return;
  if(!drag.moved){drag.moved=true;if(drag.kind==='move'||drag.kind==='resize'){$('#ss-ftb').hidden=true;}}
  var p=toWorld(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;
  switch(drag.kind){
    case 'move':
      var sx=snap(dx,e.altKey),sy=snap(dy,e.altKey);
      drag.items.forEach(function(it){it.n.x=it.x+sx;it.n.y=it.y+sy;});
      (drag.bends||[]).forEach(function(b){b.e.points=b.pts.map(function(q){return [q[0]+sx,q[1]+sy];});});queueScene();break;
    case 'wp':
      var ed=cur().edges[drag.i];if(!ed)break;
      if(drag.add){ed.points=(ed.points||[]).slice();ed.points.splice(drag.k,0,[0,0]);drag.add=false;}
      ed.points[drag.k]=alignBend(ed,drag.k,snap(p.x,e.altKey),snap(p.y,e.altKey));queueScene();break;
    case 'resize':
      var nwv=Math.max(40,snap(drag.w0+dx,e.altKey)),nhv=Math.max(30,snap(drag.h0+dy,e.altKey));
      if(e.shiftKey){var ratio=drag.w0/drag.h0;nhv=Math.round(nwv/ratio);}
      drag.n.w=nwv;drag.n.h=nhv;drag.n.x=drag.x0+(nwv-drag.w0)/2;drag.n.y=drag.y0+(nhv-drag.h0)/2;queueScene();break;
    case 'connect':
      var gh=$('#ss-ghost');if(!gh){gh=document.createElementNS(NS,'path');gh.setAttribute('id','ss-ghost');gh.setAttribute('class','ghost-edge');svg.appendChild(gh);}
      gh.setAttribute('d','M'+drag.p.x+' '+drag.p.y+'L'+p.x+' '+p.y);
      var tg=nodeNear(p,drag.from);scene.querySelectorAll('.node.drop-target').forEach(function(el){el.classList.remove('drop-target');});
      if(tg){var tEl=scene.querySelector('.node[data-id="'+cssId(tg.id)+'"]');if(tEl)tEl.classList.add('drop-target');}break;
    case 'marquee':
      var mq=$('#ss-marq');if(!mq){mq=document.createElementNS(NS,'rect');mq.setAttribute('id','ss-marq');mq.setAttribute('class','marq');svg.appendChild(mq);}
      var x0=Math.min(drag.start.x,p.x),y0=Math.min(drag.start.y,p.y),x1=Math.max(drag.start.x,p.x),y1=Math.max(drag.start.y,p.y);
      mq.setAttribute('x',x0);mq.setAttribute('y',y0);mq.setAttribute('width',x1-x0);mq.setAttribute('height',y1-y0);
      drag.box={x0:x0,y0:y0,x1:x1,y1:y1};break;
    default:
      svg.classList.add('panning');
      setCam({x:drag.cam0.x-(e.clientX-drag.sx)*drag.cam0.w/r.width,y:drag.cam0.y-(e.clientY-drag.sy)*drag.cam0.h/r.height,w:drag.cam0.w,h:drag.cam0.h});
  }
}
function onUp(e){
  pointers.delete(e.pointerId);
  if(!drag)return;
  if(drag.kind==='pinch'){if(pointers.size===0)drag=null;return;}
  var d=drag;drag=null;svg.classList.remove('panning');
  var gh=$('#ss-ghost');if(gh)gh.remove();var mq=$('#ss-marq');if(mq)mq.remove();
  if(d.kind==='enter'&&!d.moved){var en=findNode(d.id);if(en&&en.children)goToPath(path.concat([d.id]));else if(en)openMedia(en,0);return;}
  if(d.kind==='tap'&&!d.moved){activate(d.id);return;}
  if(d.kind==='pan'&&!d.moved){if(detailId){detailId=null;renderCard();}return;}
  if((d.kind==='move'||d.kind==='resize'||d.kind==='wp')&&d.moved){var sl=cur();if(isSeq(sl)){sl.nodes.sort(function(a,b){return a.x-b.x;});seqLayout(sl);}pushHistory(d.snap);markDirty();renderAll();return;}
  if(d.kind==='wp')return;
  if(d.kind==='move'&&!d.moved){renderToolbar();return;}
  if(d.kind==='connect'){
    scene.querySelectorAll('.node.drop-target').forEach(function(el){el.classList.remove('drop-target');});
    if(!d.moved)return;
    // link to the node under the pointer, or one within a short reach of it; only empty canvas makes a new node
    var tgt=nodeNear(toWorld(e),d.from),l=cur(),self=!tgt&&findNode(d.from)&&inBox(toWorld(e),findNode(d.from),0);
    if(tgt){linkNodes(d.from,tgt.id);}
    else if(!self){
      var p=toWorld(e),src=findNode(d.from),nid;
      commit(function(){var n=newNode(l,src.shape==='pill'||src.shape==='diamond'?null:src.shape,p.x,p.y);if(src.color&&n.shape===src.shape)n.color=src.color;l.nodes.push(n);l.edges.push({from:d.from,to:n.id});nid=n.id;sel={nodes:[nid],edge:null,group:null};});
      startInline('node',nid);
    }
    return;
  }
  if(d.kind==='marquee'){
    if(!d.moved||!d.box){if(hasSel())setSel({});return;}
    var b=d.box,picked=cur().nodes.filter(function(n){return n.x>=b.x0&&n.x<=b.x1&&n.y>=b.y0&&n.y<=b.y1;}).map(function(n){return n.id;});
    d.add.forEach(function(id){if(picked.indexOf(id)<0)picked.push(id);});
    setSel({nodes:picked});
  }
}
function hoverTrace(e){
  if(mode!=='view'||busy)return;
  cancelAnimationFrame(hoverRaf);
  var t=e.target;
  hoverRaf=requestAnimationFrame(function(){if(busy||mode!=='view')return;var n=t.isConnected&&t.closest&&t.closest('.node');setTrace(n?n.dataset.id:null);showHint(n?n.dataset.id:null);});
}
function onWheel(e){
  e.preventDefault();if(busy)return;
  if(inlineEd)finishInline(true);
  var p=toWorld(e),dy=e.deltaMode===1?e.deltaY*16:e.deltaY,f=Math.exp(clamp(dy,-120,120)*(e.ctrlKey?0.006:0.0018));
  var w=clamp(cam.w*f,150,60000),k=w/cam.w;
  setCam({x:p.x-(p.x-cam.x)*k,y:p.y-(p.y-cam.y)*k,w:cam.w*k,h:cam.h*k});
  maybeLeave(f);
}
function maybeLeave(f){
  if(f<=1||!path.length||busy)return;
  var fit=fitTo(viewTarget());
  if(cam.w>fit.w*2.1)goToPath(path.slice(0,-1));
}
function onDbl(e){
  if(busy)return;
  if(mode!=='edit'){var tv=document.elementFromPoint(e.clientX,e.clientY);if(path.length&&!(tv&&tv.closest&&tv.closest('.node')))goToPath(path.slice(0,-1));return;}
  // the first click may have re-rendered the scene, so find what is under the pointer now
  var t=document.elementFromPoint(e.clientX,e.clientY)||e.target,cl=function(s){return t.closest&&t.closest(s);};
  if(!svg.contains(t))return;
  var wp=cl('.wp');if(wp&&sel.edge!=null){var k=+wp.dataset.k;commit(function(){var ed=cur().edges[sel.edge];if(!ed||!ed.points)return;ed.points.splice(k,1);if(!ed.points.length)delete ed.points;});return;}
  if(cl('.port')||cl('.rs')||cl('.enter')||cl('.wpm'))return;
  var n=cl('.node'),ed=cl('.edge'),g=cl('.group');
  if(n){startInline('node',n.dataset.id);return;}
  if(ed){startInline('edge',+ed.dataset.i);return;}
  if(g){startInline('group',g.dataset.gid);return;}
  var p=toWorld(e);addNodeAt(null,p.x,p.y);
}

/* palette drag */
function onPaletteDown(e){
  var b=e.target.closest('[data-shape]');if(!b||busy)return;
  e.preventDefault();
  var shape=b.dataset.shape,ghost=null,moved=false,sx=e.clientX,sy=e.clientY;
  function mv(ev){
    if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;
    if(!moved){moved=true;ghost=document.createElement('div');ghost.className='drag-ghost';ghost.innerHTML=shapeIcon(shape,48);document.body.appendChild(ghost);}
    ghost.style.left=(ev.clientX-24)+'px';ghost.style.top=(ev.clientY-24)+'px';
  }
  function up(ev){
    window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);
    if(ghost)ghost.remove();
    if(!moved){var c=viewCenter(),f=freeSpot(cur(),shape,c.x,c.y);addNodeAt(shape,f.x,f.y);return;}
    var r=svg.getBoundingClientRect(),pal=$('#ss-palette').getBoundingClientRect();
    var inPal=ev.clientX>=pal.left&&ev.clientX<=pal.right&&ev.clientY>=pal.top&&ev.clientY<=pal.bottom;
    if(!inPal&&ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom){var p=toWorld(ev);addNodeAt(shape,p.x,p.y);}
  }
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
}

/* ================= keyboard ================= */
function onKey(e){
  var t=e.target,typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
  if(viewing&&!$('#ss-viewer').hidden&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();stepMedia(e.key==='ArrowLeft'?-1:1);return;}
  if(tour&&!typing&&$('#ss-modal').hidden&&$('#ss-viewer').hidden&&!e.metaKey&&!e.ctrlKey){
    if(e.key==='ArrowRight'||e.key==='PageDown'||(presenting&&e.key===' ')){e.preventDefault();if(tour.i<tour.t.steps.length-1)stepTour(1);return;}
    if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();stepTour(-1);return;}
  }
  if(e.key==='Escape'){
    if(!$('#ss-viewer').hidden){closeMedia();return;}
    if(!$('#ss-search').hidden){closeSearch();return;}
    if(tour){endTour();return;}
    if(!$('#ss-modal').hidden){closeModal();return;}
    if(linkFrom){endLink();return;}
    if(typing){t.blur();return;}
    if(pop){pop=null;renderToolbar();return;}
    if(detailId){detailId=null;renderCard();return;}
    if(mode==='edit'&&hasSel()){setSel({});return;}
    if(path.length)goToPath(path.slice(0,-1));
    return;
  }
  if(typing||!$('#ss-modal').hidden)return;
  if(e.key===' '&&mode==='edit'){if(!spaceDown){spaceDown=true;document.body.classList.add('space');}e.preventDefault();return;}
  var mod=e.metaKey||e.ctrlKey,key=e.key.toLowerCase();
  if(mode==='edit'&&mod){
    if(key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
    if(key==='y'){e.preventDefault();redo();return;}
    if(key==='d'){e.preventDefault();duplicate();return;}
    if(key==='c'){if(copySel())e.preventDefault();return;}
    if(key==='x'){if(copySel()){e.preventDefault();deleteSel();}return;}
    if(key==='v'){if(clipboard){e.preventDefault();paste(30);}return;}
    if(key==='a'){e.preventDefault();setSel({nodes:cur().nodes.map(function(n){return n.id;})});return;}
    if(key==='g'){e.preventDefault();e.shiftKey?ungroup():groupSel();return;}
    if(key==='e'){e.preventDefault();if(sel.nodes.length)nestNodes(sel.nodes.slice());return;}
    return;
  }
  if(mod||e.altKey)return;
  var nodeEl=t&&t.closest&&t.closest('.node');
  if(mode==='view'&&nodeEl&&(e.key==='Enter'||e.key===' ')){e.preventDefault();activate(nodeEl.dataset.id);return;}
  if(key==='e'){setMode(mode==='edit'?'view':'edit');return;}
  if(key==='f'){fitView();return;}
  if(mode==='view'&&e.key==='Backspace'&&path.length){e.preventDefault();goToPath(path.slice(0,-1));return;}
  if(key==='?'){openHelp();return;}
  if(e.key==='/'){e.preventDefault();openSearch();return;}
  if(mode==='view'&&key==='t'){openTours();return;}
  if(mode==='view'&&key==='p'){if(presenting)endTour();else startTour(0,true);return;}
  if(presenting&&key==='n'){openNotes();return;}
  if(mode!=='edit')return;
  if(e.key==='Delete'||e.key==='Backspace'){if(hasSel()){e.preventDefault();deleteSel();}return;}
  if(e.key==='Enter'){
    if(sel.nodes.length===1){e.preventDefault();startInline('node',sel.nodes[0]);}
    else if(sel.edge!=null){e.preventDefault();startInline('edge',sel.edge);}
    return;
  }
  if(e.key==='Tab'&&sel.nodes.length===1){e.preventDefault();addNext(sel.nodes[0]);return;}
  var arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(arrows[e.key]&&sel.nodes.length){
    e.preventDefault();var st=(e.shiftKey?10:1)*SNAP,v=arrows[e.key];
    commit(function(){sel.nodes.forEach(function(id){var n=findNode(id);if(n){n.x+=v[0]*st;n.y+=v[1]*st;}});});
  }
}
function onKeyUp(e){if(e.key===' '){spaceDown=false;document.body.classList.remove('space');}}

/* ================= actions ================= */
function onClick(e){
  var b=e.target.closest&&e.target.closest('[data-act]');
  if(!b){if(e.target.id==='ss-modal')closeModal();return;}
  if(b.disabled)return;
  var a=b.dataset.act,arg=b.dataset.arg,l=cur(),one=sel.nodes.length===1?findNode(sel.nodes[0]):null;
  switch(a){
    case 'mode-view':setMode('view');break;
    case 'mode-edit':setMode('edit');break;
    case 'export':openExport();break;
    case 'help':openHelp();break;
    case 'save':saveToPage();break;
    case 'back':goToPath(path.slice(0,-1));break;
    case 'crumb':goToPath(path.slice(0,+arg));break;
    case 'zin':animateCam(scaleBox(cam,.75),220);break;
    case 'zout':animateCam(scaleBox(cam,1.33),220);break;
    case 'fit':fitView();break;
    case 'close-card':detailId=null;renderCard();break;
    case 'open-node':detailId=null;renderCard();goToPath(path.concat([arg]));break;
    case 'undo':undo();break;
    case 'redo':redo();break;
    case 'pop':pop=pop===arg?null:arg;renderToolbar();break;
    case 'set-shape':if(one)commit(function(){var s=SHAPES[arg];one.shape=arg;one.w=s.w;one.h=s.h;if(arg==='rounded'&&!one.icon)one.icon='box';pop=null;});break;
    case 'set-color':commit(function(){
      if(sel.group){var g=l.groups.find(function(x){return x.id===sel.group;});if(g)g.color=arg;}
      else sel.nodes.forEach(function(id){var n=findNode(id);if(n)n.color=arg;});pop=null;});break;
    case 'set-icon':if(one)commit(function(){if(arg)one.icon=arg;else delete one.icon;pop=null;});break;
    case 'set-size':if(one)commit(function(){one.text=Object.assign({},one.text||{},{size:arg});if(arg==='m')delete one.text.size;if(!Object.keys(one.text).length)delete one.text;pop=null;});break;
    case 'bold':case 'italic':if(one)commit(function(){var tx=Object.assign({},one.text||{});if(tx[a])delete tx[a];else tx[a]=true;if(Object.keys(tx).length)one.text=tx;else delete one.text;});break;
    case 'role':if(one)commit(function(){if(one.role===arg)delete one.role;else one.role=arg;});break;
    case 'open-inner':if(one){pop=null;goToPath(path.concat([one.id]));}break;
    case 'create-inner':if(one)createInner(one.id,arg);break;
    case 'unnest':if(one)unnest(one.id);break;
    case 'drop-inner':if(one&&confirm('Remove the inner diagram of \u201c'+one.label+'\u201d and everything in it?'))commit(function(){delete one.children;pop=null;});break;
    case 'nest-sel':nestNodes(sel.nodes.slice());break;
    case 'nest-group':var gid=sel.group;nestNodes(l.nodes.filter(function(n){return n.group===gid;}).map(function(n){return n.id;}));break;
    case 'group':groupSel();break;
    case 'ungroup':ungroup();break;
    case 'glabel':startInline('group',sel.group);break;
    case 'dup':duplicate();break;
    case 'del':deleteSel();break;
    case 'estyle':commit(function(){var ed=l.edges[sel.edge];if(arg===defStyle(l))delete ed.style;else ed.style=arg;});break;
    case 'earrow':commit(function(){var ed=l.edges[sel.edge];if(arg===defArrow(l))delete ed.arrow;else ed.arrow=arg;});break;
    case 'emove':commit(function(){var i=sel.edge,j=i+(+arg);if(j<0||j>=l.edges.length)return;var t=l.edges[i];l.edges[i]=l.edges[j];l.edges[j]=t;sel.edge=j;});break;
    case 'upload-media':pendingMedia={id:sel.nodes[0]};$('#ss-file').click();break;
    case 'media-del':if(one)commit(function(){var ml=mediaList(one);ml.splice(+arg,1);setMedia(one,ml);});break;
    case 'media-view':if(one)openMedia(one,+arg);break;
    case 'media-url':var mu=$('#ss-murl'),uv=mu&&mu.value.trim();if(one&&uv)commit(function(){setMedia(one,mediaList(one).concat([{src:uv}]));});break;
    case 'media-step':stepMedia(+arg);break;
    case 'link':if(one)startLink(one.id);break;
    case 'eroute':commit(function(){var ed=l.edges[sel.edge];if(arg===levelRoute(l))delete ed.route;else ed.route=arg;});break;
    case 'set-rel':commit(function(){var ed=l.edges[sel.edge];if(arg)ed.rel=arg;else delete ed.rel;pop=null;});break;
    case 'ereset':commit(function(){delete l.edges[sel.edge].points;});break;
    case 'lroute':commit(function(){var o=['curved','orthogonal','straight'],nx=o[(o.indexOf(levelRoute(l))+1)%3];delete l.route;if(levelRoute(l)!==nx)l.route=nx;});toast('Paths on this level: '+ROUTE_NAMES[levelRoute(l)].toLowerCase()+'.');break;
    case 'about':aboutOpen=!aboutOpen||mode!=='view';if(mode!=='view')setMode('view');renderAbout();fitView(420);break;
    case 'about-close':aboutOpen=false;try{localStorage.setItem(aboutKey(),'1');}catch(err){}renderAbout();fitView(420);break;
    case 'close-media':closeMedia();break;
    case 'view-media':var vm=findNode(arg);if(vm)openMedia(vm,+(b.dataset.i||0));break;
    case 'ereverse':commit(function(){var ed=l.edges[sel.edge],f=ed.from;ed.from=ed.to;ed.to=f;});break;
    case 'elabel':startInline('edge',sel.edge);break;
    case 'ltype':commit(function(){l.type=arg;});break;
    case 'ldir':commit(function(){l.direction=levelDir(l)==='LR'?'TB':'LR';});break;
    case 'tidy':tidy();break;
    case 'close-modal':closeModal();break;
    case 'dl-html':download(slug(data.meta.title)+'.html',buildDocument());break;
    case 'dl-json':download(slug(data.meta.title)+'.json',JSON.stringify(data,null,2));break;
    case 'copy-json':copyText(JSON.stringify(data,null,2));break;
    case 'apply-json':applyJSON();break;
    case 'discard-draft':discardDraft();break;
    case 'search':openSearch();break;
    case 'ex-png':exportPNG();break;
    case 'ex-svg':exportSVG();break;
    case 'ex-pdf':closeModal();printAll();break;
    case 'ex-readme':readmeSnippet();break;
    case 'ex-mermaid':download(slug(data.meta.title)+'.md',mermaidAll());break;
    case 'ex-drawio':download(slug(data.meta.title)+'.drawio',drawioAll());break;
    case 'ex-excalidraw':download(levelName()+'.excalidraw',excalidrawLevel(cur()));break;
    case 'ex-import':importMermaid();break;
    case 'tours':openTours();break;
    case 'tour-start':aboutOpen=false;try{localStorage.setItem(aboutKey(),'1');}catch(err){}startTour(+(arg||0),false);break;
    case 'tour-present':closeModal();startTour(+(arg||0),true);break;
    case 'tour-go':closeModal();startTour(+(arg||0),false);break;
    case 'present':startTour(0,true);break;
    case 'tour-step':stepTour(+arg);break;
    case 'tour-end':endTour();break;
    case 'notes':openNotes();break;
  }
}

/* ================= media ================= */
var pendingMedia=null;
function attachFile(id,f){
  if(f.size>12*1024*1024){toast('That file is over 12 MB. Use a smaller file or link to it by URL.');return;}
  var rd=new FileReader();
  rd.onload=function(){commit(function(){var n=findNode(id);if(!n)return;var item={src:rd.result,type:/^video\//.test(f.type)?'video':'image'};setMedia(n,n.shape==='image'&&!mediaList(n).length?[item]:mediaList(n).concat([item]));if(n.shape==='image'&&(!n.label||n.label==='Image'))n.label=f.name.replace(/\.[^.]+$/,'');});
    if(f.size>3*1024*1024)toast('Embedded '+Math.round(f.size/1048576)+' MB. Large files make the page slow to share.');};
  rd.readAsDataURL(f);
}
// the viewer flies out of the node; with several items it pages through them (arrow keys too)
var viewing=null;
function openMedia(n,i){
  var list=mediaList(n);if(!list.length)return;i=clamp(i||0,0,list.length-1);
  var m=list[i],t=mediaType(m),v=$('#ss-viewer'),again=!!viewing&&viewing.id===n.id;viewing={id:n.id,i:i,n:list.length};
  var body=t==='video'?'<video src="'+esc(m.src)+'" controls playsinline'+(m.poster?' poster="'+esc(m.poster)+'"':'')+'></video>':
    t==='embed'?'<iframe src="'+esc(m.src)+'" title="'+esc(n.label)+'" allow="fullscreen; picture-in-picture" referrerpolicy="no-referrer"></iframe>':
    '<img src="'+esc(m.src)+'" alt="'+esc(m.caption||n.label)+'">';
  var nav=list.length>1?'<button class="ib v-prev" data-act="media-step" data-arg="-1" aria-label="Previous"'+(i?'':' disabled')+'>'+uiIcon('back')+'</button><button class="ib v-next" data-act="media-step" data-arg="1" aria-label="Next"'+(i<list.length-1?'':' disabled')+'>'+uiIcon('arrowR')+'</button>':'';
  v.innerHTML='<figure class="v-fig">'+body+'<figcaption><b>'+esc(n.label)+'</b>'+(m.caption?' '+esc(m.caption):'')+(list.length>1?' <span class="v-count">'+(i+1)+' / '+list.length+'</span>':'')+'</figcaption></figure>'+nav+'<button class="ib v-x" data-act="close-media" aria-label="Close">'+uiIcon('close')+'</button>';
  v.hidden=false;
  var fig=v.querySelector('.v-fig'),a=toScreen(n.x-nw(n)/2,n.y-nh(n)/2),b=toScreen(n.x+nw(n)/2,n.y+nh(n)/2),r=fig.getBoundingClientRect(),app=$('#app').getBoundingClientRect();
  if(!reduceMotion&&r.width&&!again){
    var sx=(b.x-a.x)/r.width,sy=(b.y-a.y)/r.height,tx=a.x+app.left-r.left,ty=a.y+app.top-r.top;
    fig.style.transformOrigin='0 0';fig.style.transform='translate('+tx+'px,'+ty+'px) scale('+sx+','+sy+')';fig.style.opacity='0.2';
    requestAnimationFrame(function(){fig.style.transition='transform .42s cubic-bezier(.2,.8,.2,1),opacity .3s';fig.style.transform='none';fig.style.opacity='1';});
  }
  (v.querySelector(again&&nav?(i?'.v-prev':'.v-next'):'.v-x')||v.querySelector('.v-x')).focus();
}
function stepMedia(d){if(!viewing)return;var n=findNode(viewing.id);if(n)openMedia(n,viewing.i+d);}
// the node's badge: a thumbnail of its first picture (with a count when there are more), or a play glyph
function mediaBadge(n,x,y){
  var ml=mediaList(n),m=ml[0],th=mediaType(m)==='image'?m.src:m.poster,s='<g class="enter media" transform="translate('+x+' '+y+')"><title>'+(ml.length>1?'View '+ml.length+' media items':'View media')+'</title>';
  if(th){var cid='mclip'+(++clipSeq);s+='<clipPath id="'+cid+'"><rect x="-22" y="-8" width="30" height="22" rx="5"/></clipPath><rect class="m-frame" x="-23" y="-9" width="32" height="24" rx="6"/><image href="'+esc(th)+'" x="-22" y="-8" width="30" height="22" preserveAspectRatio="xMidYMid slice" clip-path="url(#'+cid+')"/>';}
  else s+='<circle r="9"/><path d="M-2.5 -4 4 0 -2.5 4z" class="fillglyph"/>';
  if(ml.length>1)s+='<g class="m-count" transform="translate('+(th?8:8)+' '+(th?-9:-8)+')"><circle r="7"/><text y="3.5">'+ml.length+'</text></g>';
  return s+'</g>';
}
function closeMedia(){var v=$('#ss-viewer');v.hidden=true;v.innerHTML='';viewing=null;}
/* ================= hover hints ================= */
var hintTimer=null,hintId=null;
function hintText(n){
  var t=firstSentence(n.note,110),cue=hasInner(n)?'Click to open '+TYPE_NAMES[levelType(n.children)].toLowerCase():(mediaList(n).length?'Click to view':(n.source&&n.source.length&&!t?n.source[0]:''));
  return {t:t,cue:cue};
}
function showHint(id){
  clearTimeout(hintTimer);
  if(!id||mode!=='view'||busy||detailId){hideHint();return;}
  if(id===hintId)return;
  hintTimer=setTimeout(function(){
    var n=findNode(id),el=$('#ss-hint');if(!n)return;var h=hintText(n);if(!h.t&&!h.cue){hideHint();return;}
    el.innerHTML=(h.t?'<span>'+esc(h.t)+'</span>':'')+(h.cue?'<small>'+esc(h.cue)+'</small>':'');el.hidden=false;hintId=id;
    var a=toScreen(n.x,n.y-nh(n)/2-((n.role||n.tag)?26:0)),app=$('#app').getBoundingClientRect();
    el.style.left=clamp(a.x-el.offsetWidth/2,8,app.width-el.offsetWidth-8)+'px';el.style.top=Math.max(8,a.y-el.offsetHeight-10)+'px';
  },380);
}
function hideHint(){clearTimeout(hintTimer);hintId=null;var el=$('#ss-hint');if(el)el.hidden=true;}
/* ================= search ================= */
// One index over every level: labels, notes, sources and tags. A file path finds every part that cites it.
function searchIndex(){
  var out=[];
  (function walk(l,p,crumbs){l.nodes.forEach(function(n){out.push({path:p,id:n.id,n:n,crumbs:crumbs});if(n.children)walk(n.children,p.concat([n.id]),crumbs.concat([n.label]));});})(data.root,[],[]);
  return out;
}
function searchHits(q){
  q=q.trim().toLowerCase();if(!q)return [];
  var hits=[];
  searchIndex().forEach(function(it){
    var n=it.n,lab=String(n.label||'').toLowerCase(),s=0,why='';
    if(lab===q)s=100;else if(lab.indexOf(q)===0)s=80;else if(lab.indexOf(q)>=0)s=60;else if(String(n.id).toLowerCase().indexOf(q)>=0)s=40;
    var src=(n.source||[]).filter(function(x){return String(x).toLowerCase().indexOf(q)>=0;});
    if(src.length){s=Math.max(s,50);why=src[0];}
    if(!s&&String(n.note||'').toLowerCase().indexOf(q)>=0){s=20;why=firstSentence(n.note,90);}
    if(!s&&String(n.tag||'').toLowerCase().indexOf(q)>=0)s=15;
    if(s)hits.push({s:s-it.path.length,it:it,why:why});
  });
  (data.meta.glossary||[]).forEach(function(g){if(String(g.term).toLowerCase().indexOf(q)>=0)hits.push({s:70,gl:g});});
  hits.sort(function(a,b){return b.s-a.s;});
  return hits.slice(0,12);
}
var searchSel=0;
function openSearch(){
  var el=$('#ss-search');
  el.innerHTML='<div class="sr-box">'+uiIcon('search')+'<input id="ss-q" placeholder="Search parts, notes or a file path" aria-label="Search the map" autocomplete="off"><kbd>Esc</kbd></div><ul class="sr-list" id="ss-sr" role="listbox"></ul>';
  el.hidden=false;searchSel=0;var inp=$('#ss-q');inp.focus();renderSearch();
  inp.addEventListener('input',function(){searchSel=0;renderSearch();});
  inp.addEventListener('keydown',function(e){
    var n=$('#ss-sr').children.length;
    if(e.key==='ArrowDown'){e.preventDefault();searchSel=Math.min(n-1,searchSel+1);renderSearch(true);}
    else if(e.key==='ArrowUp'){e.preventDefault();searchSel=Math.max(0,searchSel-1);renderSearch(true);}
    else if(e.key==='Enter'){e.preventDefault();var li=$('#ss-sr').children[searchSel];if(li&&li.dataset.k!=null)pickSearch(+li.dataset.k);}
    else if(e.key==='Escape'){e.preventDefault();closeSearch();}
    e.stopPropagation();
  });
}
var searchCache=[];
function renderSearch(keep){
  var q=$('#ss-q').value;if(!keep)searchCache=searchHits(q);
  var ul=$('#ss-sr');
  ul.innerHTML=searchCache.map(function(h,k){
    if(h.gl)return '<li class="sr-gl"><b>'+esc(h.gl.term)+'</b><span>'+esc(h.gl.def)+'</span></li>';
    var it=h.it;return '<li role="option" data-k="'+k+'" aria-selected="'+(k===searchSel)+'" style="--nc:'+colorVar(it.n.color)+'"><span class="sr-sw"></span><span class="sr-t"><b>'+esc(it.n.label)+'</b><small>'+esc(['Overview'].concat(it.crumbs).join(' / '))+(h.why?' · <code>'+esc(h.why)+'</code>':'')+'</small></span></li>';
  }).join('')||(q.trim()?'<li class="sr-none">Nothing matches “'+esc(q)+'”.</li>':'<li class="sr-none">Type a part, a word from its notes, or a file such as <code>src/api.py</code>.</li>');
}
function closeSearch(){var el=$('#ss-search');el.hidden=true;el.innerHTML='';}
function pickSearch(k){var h=searchCache[k];if(!h||!h.it)return;closeSearch();var it=h.it;goToPath(it.path).then(function(){spotNode(it.id,true);});}
// fly to a node and pulse it; in view mode its card opens
function spotNode(id,card){
  var n=findNode(id);if(!n)return;
  var b=nodeBox(n),k=Math.max(1,Math.min(3,700/Math.max(b.w,b.h)));
  animateCam(fitTo(scaleBox({x:b.x,y:b.y,w:b.w,h:b.h},Math.max(2.4,k))),420).then(function(){
    var el=scene.querySelector('.node[data-id="'+cssId(id)+'"]');if(el){el.classList.remove('pulse');void el.getBoundingClientRect();el.classList.add('pulse');}
    if(card&&mode==='view'){detailId=id;renderCard();}else if(mode==='edit')setSel({nodes:[id]});
  });
}

/* ================= tours and presentation ================= */
// meta.tours: [{title, steps:[{path, node, title, text, notes, quiz:{q, answer, explain}}]}]. With none, a tour is made from the map.
var tour=null,presenting=false,notesWin=null;
function tourList(){var t=(data.meta.tours||[]).filter(function(x){return x&&Array.isArray(x.steps)&&x.steps.length;});return t.length?t:[autoTour()];}
function autoTour(){
  var steps=[{path:[],title:data.meta.title,text:data.meta.summary||data.root.caption||''}];
  (function walk(l,p,depth){
    var ns=l.nodes.slice().sort(function(a,b){return (a.x-b.x)||(a.y-b.y);});
    ns.forEach(function(n){
      if(steps.length>=14)return;
      if(n.role==='input'||n.children||n.note)steps.push({path:p,node:n.id,title:n.label,text:n.note||''});
      if(n.children&&n.children.nodes.length&&depth<2){steps.push({path:p.concat([n.id]),title:n.label+': inside',text:n.children.caption||''});walk(n.children,p.concat([n.id]),depth+1);}
    });
  })(data.root,[],0);
  return {title:'Walk through the map',auto:true,steps:steps.slice(0,14)};
}
function startTour(k,present){
  var t=tourList()[k||0];if(!t)return;
  tour={t:t,i:-1,answered:null};setPresent(!!present);
  if(mode!=='view')setMode('view');
  aboutOpen=false;renderAbout();closeSearch();showStep(0);
}
function endTour(){
  tour=null;setPresent(false);scene.classList.remove('spotlight');scene.querySelectorAll('.spot').forEach(function(el){el.classList.remove('spot');});
  renderTour();if(notesWin&&!notesWin.closed)notesWin.close();notesWin=null;fitView(420);
}
function setPresent(on){
  presenting=on;document.body.classList.toggle('presenting',on);
  if(on&&document.documentElement.requestFullscreen&&!document.fullscreenElement){try{document.documentElement.requestFullscreen().catch(function(){});}catch(e){}}
  if(!on&&document.fullscreenElement&&document.exitFullscreen){try{document.exitFullscreen().catch(function(){});}catch(e){}}
  renderChrome();
}
function showStep(i){
  if(!tour)return;var st=tour.t.steps;i=clamp(i,0,st.length-1);tour.i=i;tour.answered=null;var s=st[i];
  detailId=null;renderCard();hideHint();
  goToPath(Array.isArray(s.path)?s.path:[]).then(function(){
    if(!tour)return;
    scene.querySelectorAll('.spot').forEach(function(el){el.classList.remove('spot');});
    var n=s.node&&findNode(s.node);
    if(n&&!s.quiz){
      scene.classList.add('spotlight');
      var t=traceSets(n.id,cur());
      scene.querySelectorAll('.node').forEach(function(el){if(el.dataset.id===n.id)el.classList.add('spot');});
      scene.querySelectorAll('.edge').forEach(function(el){var e=cur().edges[+el.dataset.i];if(e&&(e.from===n.id||e.to===n.id))el.classList.add('spot');});
      var b=nodeBox(n);animateCam(fitTo(scaleBox(b,Math.max(2.6,Math.min(4,900/Math.max(b.w,b.h))))),480);
    }else{scene.classList.remove('spotlight');fitView(420);}
    renderTour();
  });
  renderTour();updateNotes();
}
function stepTour(d){if(tour)showStep(tour.i+d);}
function renderTour(){
  var el=$('#ss-tour');
  if(!tour){el.hidden=true;el.innerHTML='';return;}
  var st=tour.t.steps,s=st[tour.i]||{},last=tour.i===st.length-1,q=s.quiz,body='';
  if(q){
    body='<p class="tr-q">'+esc(q.q||q.question||'')+'</p>'+(tour.answered==null?'<p class="tr-hint">Click the part on the map.</p>':
      (tour.answered===q.answer?'<p class="tr-ok">'+uiIcon('check',16)+'Right. '+esc(q.explain||'')+'</p>':'<p class="tr-no">Not quite: it’s “'+esc((findNode(q.answer)||{}).label||q.answer)+'”. '+esc(q.explain||'')+'</p>'));
  }else body=s.text?'<p>'+esc(s.text)+'</p>':'';
  el.innerHTML='<div class="tr-head"><span class="tr-name">'+esc(tour.t.title||'Tour')+'</span><span class="tr-count">'+(tour.i+1)+' / '+st.length+'</span><button class="ib" data-act="tour-end" aria-label="End tour" title="End (Esc)">'+uiIcon('close',16)+'</button></div>'+
    (s.title?'<h3>'+esc(s.title)+'</h3>':'')+body+
    '<div class="tr-foot"><div class="tr-dots" aria-hidden="true">'+st.map(function(_,k){return '<i'+(k===tour.i?' class="on"':k<tour.i?' class="done"':'')+'></i>';}).join('')+'</div>'+
    '<button class="btn" data-act="tour-step" data-arg="-1"'+(tour.i?'':' disabled')+'>'+uiIcon('back',16)+'Back</button>'+
    '<button class="btn solid" data-act="'+(last?'tour-end':'tour-step')+'" data-arg="1">'+(last?'Finish':'Next')+(last?'':uiIcon('arrowR',16))+'</button></div>';
  el.hidden=false;
}
// a quiz step: the reader answers by clicking a node
function answerQuiz(id){if(!tour)return false;var s=tour.t.steps[tour.i];if(!s||!s.quiz||tour.answered!=null)return false;tour.answered=id;renderTour();var el=scene.querySelector('.node[data-id="'+cssId(s.quiz.answer)+'"]');if(el){el.classList.add('pulse');}return true;}
function openNotes(){
  try{notesWin=window.open('','unfold-notes','width=520,height=640');}catch(e){notesWin=null;}
  if(!notesWin){toast('The browser blocked the notes window. Allow pop-ups to see speaker notes.');return;}
  updateNotes();
}
function updateNotes(){
  if(!notesWin||notesWin.closed||!tour)return;
  var st=tour.t.steps,s=st[tour.i]||{},nx=st[tour.i+1];
  notesWin.document.title='Notes · '+(tour.t.title||'Tour');
  notesWin.document.body.innerHTML='<div style="font:16px/1.5 system-ui,sans-serif;padding:20px;max-width:640px"><p style="color:#666;margin:0">Step '+(tour.i+1)+' of '+st.length+'</p><h2 style="margin:6px 0 12px">'+esc(s.title||'')+'</h2>'+
    '<p style="white-space:pre-line">'+esc(s.notes||s.text||'No notes for this step.')+'</p>'+(nx?'<hr><p style="color:#666">Next: <b>'+esc(nx.title||'')+'</b></p>':'')+'</div>';
}

function openTours(){
  var ts=tourList();
  openModal('<div class="dlg-head"><h2>Guided tours</h2><button class="ib" data-act="close-modal" aria-label="Close">'+uiIcon('close')+'</button></div>'+
    (ts[0].auto?'<p>This map has no written tour yet, so here is a walk through its parts in flow order.</p>':'<p>Step through the map with a guide. Arrow keys move between steps.</p>')+
    '<ul class="tour-list">'+ts.map(function(t,k){return '<li><div><b>'+esc(t.title||'Tour')+'</b><small>'+t.steps.length+' steps'+(t.steps.some(function(x){return x.quiz;})?' \u00b7 with questions':'')+'</small></div><button class="btn" data-act="tour-go" data-arg="'+k+'">Start</button><button class="btn solid" data-act="tour-present" data-arg="'+k+'">'+uiIcon('monitor',16)+'Present</button></li>';}).join('')+'</ul>'+
    '<p class="muted small">Presenting goes full screen. Press N for speaker notes in a second window, Esc to stop.</p>');
}
/* ================= sources ================= */
// meta.repo {url, commit, root} turns each source into a permalink at the mapped commit
function srcLink(s){
  var r=data.meta.repo;if(!r||!r.url||!/^https?:\/\//.test(r.url))return null;
  var m=String(s).match(/^([^:#\s]+)(?::(\d+)(?:-(\d+))?|#L(\d+)(?:-L?(\d+))?|:[A-Za-z_$][\w$.]*)?$/);if(!m)return null;
  var file=m[1],a=m[2]||m[4],b=m[3]||m[5],base=r.url.replace(/\.git$/,'').replace(/\/$/,''),ref=r.commit||'HEAD',p=(r.root?String(r.root).replace(/^\/|\/$/g,'')+'/':'')+file.replace(/^\.\//,'');
  if(/gitlab/.test(base))return base+'/-/blob/'+ref+'/'+p+(a?'#L'+a+(b?'-'+b:''):'');
  if(/bitbucket/.test(base))return base+'/src/'+ref+'/'+p+(a?'#lines-'+a+(b?':'+b:''):'');
  return base+'/blob/'+ref+'/'+p+(a?'#L'+a+(b?'-L'+b:''):'');
}
var CONF_TEXT={read:'Read in the code',peeked:'Checked in a code excerpt',inferred:'Inferred: not confirmed in the code'};
var DIFF_TEXT={added:'New',removed:'Removed',changed:'Changed'};

/* ================= export to images and other tools ================= */
function allLevels(){var out=[];(function walk(l,p,cr){out.push({path:p,l:l,crumbs:cr});l.nodes.forEach(function(n){if(hasInner(n))walk(n.children,p.concat([n.id]),cr.concat([n.label]));});})(data.root,[],[]);return out;}
// draw any level as the viewer sees it, without changing what is on screen
function withLevel(p,fn){
  var keep={path:path,mode:mode,sel:sel,traceId:traceId};
  path=p;mode='view';sel={nodes:[],edge:null,group:null};traceId=null;
  try{return fn(levelAt(p));}finally{path=keep.path;mode=keep.mode;sel=keep.sel;traceId=keep.traceId;}
}
function sceneMarkup(l,flat){
  var s=flat?'':frameMarkup(l);
  if(isSeq(l)){var bt=seqBottom(l);l.nodes.forEach(function(n){s+='<line class="lifeline" style="--nc:'+colorVar(n.color)+'" x1="'+n.x+'" x2="'+n.x+'" y1="'+(n.y+nh(n)/2)+'" y2="'+bt+'"/>';});}
  l.groups.forEach(function(g){s+=groupMarkup(g,l);});
  s+=timelineMarkup(l);
  l.edges.forEach(function(e,i){s+=edgeMarkup(e,i,l);});
  l.nodes.forEach(function(n){s+=nodeMarkup(n,l);});
  return s;
}
function levelSVG(p){
  return withLevel(p,function(l){
    var b=contentBox(l),P=32,x=b.x-P,y=b.y-P,w=b.w+2*P,h=b.h+2*P,css=document.getElementById('ss-css').textContent;
    return '<svg xmlns="'+NS+'" viewBox="'+x+' '+y+' '+w+' '+h+'" width="'+Math.round(w)+'" height="'+Math.round(h)+'" font-family="Hanken Grotesk, ui-sans-serif, system-ui, sans-serif">'+
      '<style>'+css+'\n.edge.flow .line{animation:none}</style>'+svg.querySelector('defs').outerHTML+
      '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="var(--paper)"/><g id="ss-scene">'+sceneMarkup(l,true)+'</g></svg>';
  });
}
function svgToPng(text,scale){
  return new Promise(function(res,rej){
    var img=new Image();
    img.onload=function(){var c=document.createElement('canvas');c.width=Math.ceil(img.width*scale);c.height=Math.ceil(img.height*scale);var g=c.getContext('2d');g.scale(scale,scale);g.drawImage(img,0,0);c.toBlob(function(bl){bl?res(bl):rej(new Error('PNG failed'));},'image/png');};
    img.onerror=function(){rej(new Error('The image could not be drawn'));};
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text);
  });
}
function downloadBlob(filename,blob){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);}
function levelName(){var lb=pathLabels(path);return slug(data.meta.title)+(lb.length?'-'+slug(lb[lb.length-1]):'');}
function exportSVG(){download(levelName()+'.svg',levelSVG(path.slice()));}
function exportPNG(){svgToPng(levelSVG(path.slice()),2).then(function(b){downloadBlob(levelName()+'.png',b);toast('Saved '+levelName()+'.png');}).catch(function(e){toast(e.message);});}
// one printed page per level, so "Save as PDF" in the print dialog gives the whole map
function printAll(){
  var box=document.getElementById('ss-print');if(box)box.remove();
  box=document.createElement('div');box.id='ss-print';
  box.innerHTML=allLevels().map(function(v){
    return '<section><h2>'+esc(['Overview'].concat(v.crumbs).join(' / '))+'</h2>'+(v.l.caption?'<p>'+esc(v.l.caption)+'</p>':'')+levelSVG(v.path).replace(/ width="\d+" height="\d+"/,'')+'</section>';
  }).join('');
  document.body.appendChild(box);
  var done=function(){box.remove();window.removeEventListener('afterprint',done);};window.addEventListener('afterprint',done);
  setTimeout(function(){window.print();},60);
}
function readmeSnippet(){
  var name=levelName();download(name+'.svg',levelSVG(path.slice()));
  var md='[![' + data.meta.title.replace(/[\[\]]/g,'') + '](docs/'+name+'.svg)](docs/'+slug(data.meta.title)+'.html)';
  copyText(md).then(function(){toast('Copied a README snippet. Put '+name+'.svg and the exported page in docs/.');});
}

/* ---- Mermaid ---- */
function mmId(id){return String(id).replace(/[^A-Za-z0-9_]/g,'_').replace(/^(\d)/,'n$1')||'n';}
function mmText(t){return '"'+String(t||'').replace(/"/g,'#quot;').replace(/\n/g,'<br>')+'"';}
var MM_SHAPE={rounded:['(',')'],rect:['[',']'],pill:['([','])'],diamond:['{','}'],parallelogram:['[/','/]'],cylinder:['[(',')]'],document:['[',']'],hexagon:['{{','}}'],cloud:['(',')'],circle:['((','))'],triangle:['[',']'],text:['[',']'],table:['[',']'],image:['[',']'],class:['[',']'],person:['([','])'],node3d:['[[',']]'],initial:['((','))'],final:['((','))']};
function mermaidLevel(l){
  var t=levelType(l),L=[];
  if(t==='sequence'){
    L.push('sequenceDiagram');l.nodes.forEach(function(n){L.push('  participant '+mmId(n.id)+' as '+String(n.label).replace(/\n/g,' '));});
    l.edges.forEach(function(e){L.push('  '+mmId(e.from)+((e.style==='dashed')?'-->>':'->>')+mmId(e.to)+': '+String(e.label||' ').replace(/\n/g,' '));});
    return L.join('\n');
  }
  if(t==='state'){
    L.push('stateDiagram-v2');
    var kind={};l.nodes.forEach(function(n){kind[n.id]=n.shape;if(n.shape!=='initial'&&n.shape!=='final')L.push('  state '+mmText(n.label)+' as '+mmId(n.id));});
    var ref=function(id){return kind[id]==='initial'||kind[id]==='final'?'[*]':mmId(id);};
    l.edges.forEach(function(e){L.push('  '+ref(e.from)+' --> '+ref(e.to)+(e.label?' : '+e.label:''));});
    return L.join('\n');
  }
  if(t==='data'){
    L.push('erDiagram');
    l.nodes.forEach(function(n){var nm=mmId(n.label).toUpperCase();L.push('  '+nm+' {');(n.fields||[]).forEach(function(f){var m=String(f).match(/^\s*([^:\s]+)\s*:?\s*(\S*)\s*(.*)$/)||[0,f,'string',''];var keys=(m[3].match(/\b(PK|FK|UK)\b/g)||[]).join(',');L.push('    '+(m[2]||'string').replace(/[^\w]/g,'_')+' '+m[1].replace(/[^\w]/g,'_')+(keys?' '+keys:''));});L.push('  }');});
    var nm=function(id){var n=findNode(id,l);return mmId(n?n.label:id).toUpperCase();};
    l.edges.forEach(function(e){var c=String(e.label||''),card=/\*|many|n\b/i.test(c)?'||--o{':'||--||';L.push('  '+nm(e.from)+' '+card+' '+nm(e.to)+' : '+mmText(c||'relates'));});
    return L.join('\n');
  }
  if(t==='class'){
    L.push('classDiagram');
    l.nodes.forEach(function(n){var id=mmId(n.label);L.push('  class '+id+' {');if(n.stereotype)L.push('    <<'+n.stereotype+'>>');(n.fields||[]).concat(n.methods||[]).forEach(function(m){L.push('    '+String(m).replace(/^-\s*/,'-').replace(/^\+\s*/,'+').replace(/^#\s*/,'#'));});L.push('  }');});
    var cn=function(id){var n=findNode(id,l);return mmId(n?n.label:id);},OP={inherits:' <|-- ',implements:' <|.. ',composition:' *-- ',aggregation:' o-- ',association:' --> ',dependency:' ..> '};
    l.edges.forEach(function(e){var r=e.rel||'association',a=cn(e.from),b=cn(e.to);L.push('  '+(r==='inherits'||r==='implements'?b+OP[r]+a:a+OP[r]+b)+(e.label?' : '+e.label:''));});
    return L.join('\n');
  }
  if(t==='timeline'){
    L.push('timeline');l.nodes.forEach(function(n){L.push('  '+(n.date||'\u2022')+' : '+String(n.label).replace(/\n/g,' '));});return L.join('\n');
  }
  L.push('flowchart '+levelDir(l));
  var grouped={};l.groups.forEach(function(g){var mem=l.nodes.filter(function(n){return n.group===g.id;});if(!mem.length)return;L.push('  subgraph '+mmId(g.id)+' ['+mmText(g.label||g.id)+']');mem.forEach(function(n){grouped[n.id]=1;L.push('    '+mmNode(n));});L.push('  end');});
  l.nodes.forEach(function(n){if(!grouped[n.id])L.push('  '+mmNode(n));});
  l.edges.forEach(function(e){
    var st=e.style||defStyle(l),ar=e.arrow||defArrow(l),op=st==='dashed'?(ar==='none'?'-.-':'-.->'):(ar==='none'?'---':'-->');if(ar==='both')op='<'+op;
    L.push('  '+mmId(e.from)+' '+op+(e.label?'|'+mmText(e.label)+'|':'')+' '+mmId(e.to));
  });
  return L.join('\n');
}
function mmNode(n){var b=MM_SHAPE[n.shape]||MM_SHAPE.rounded;return mmId(n.id)+b[0]+mmText(n.label||' ')+b[1];}
function mermaidAll(){
  var out=['# '+data.meta.title,''];if(data.meta.summary)out.push(data.meta.summary,'');
  allLevels().forEach(function(v){out.push('## '+['Overview'].concat(v.crumbs).join(' / '),'');if(v.l.caption)out.push(v.l.caption,'');out.push('```mermaid',mermaidLevel(v.l),'```','');});
  return out.join('\n');
}

/* ---- draw.io: one page per level, and inner diagrams link to their page ---- */
function hexOf(c,fallback){var v=getComputedStyle(document.body).getPropertyValue('--c-'+(COLORS.indexOf(c)>=0?c:'blue')).trim();if(/^#[0-9a-f]{3,8}$/i.test(c||''))v=c;return /^#[0-9a-f]{6}$/i.test(v)?v:(fallback||'#3B5BDB');}
function tint(hex,k){var n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;function m(v){return Math.round(v+(255-v)*k);}return '#'+((1<<24)+(m(r)<<16)+(m(g)<<8)+m(b)).toString(16).slice(1);}
var DIO_SHAPE={rounded:'rounded=1;arcSize=12;',rect:'rounded=0;',pill:'rounded=1;arcSize=50;',diamond:'rhombus;',parallelogram:'shape=parallelogram;perimeter=parallelogramPerimeter;',cylinder:'shape=cylinder3;boundedLbl=1;size=10;',document:'shape=document;boundedLbl=1;',hexagon:'shape=hexagon;perimeter=hexagonPerimeter2;',cloud:'ellipse;shape=cloud;',circle:'ellipse;',triangle:'triangle;direction=north;',text:'text;strokeColor=none;fillColor=none;',table:'swimlane;fontStyle=1;startSize=30;',image:'rounded=1;',initial:'ellipse;fillColor=#333333;',final:'ellipse;shape=doubleEllipse;',class:'swimlane;fontStyle=1;startSize=30;',person:'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;',node3d:'shape=cube;size=12;boundedLbl=1;'};
function xmlEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'&#10;');}
function drawioAll(){
  var lv=allLevels(),pid={};lv.forEach(function(v,i){pid[v.path.join('/')]='page'+i;});
  var pages=lv.map(function(v){
    var l=v.l,cells=['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'],k=0;
    l.nodes.forEach(function(n){
      var c=hexOf(n.color),w=nw(n),h=nh(n),st=(DIO_SHAPE[n.shape]||DIO_SHAPE.rounded)+'whiteSpace=wrap;html=1;strokeColor='+c+';'+(n.shape==='text'?'':'fillColor='+tint(c,.86)+';')+(n.style==='dashed'?'dashed=1;':'');
      var lab=n.label+((n.fields||[]).length||(n.methods||[]).length?'':'')+(n.tech?'\n['+n.tech+']':'');
      var inner=hasInner(n)?' link="data:page/id,'+pid[v.path.concat([n.id]).join('/')]+'"':'';
      if(inner)st+='fontStyle=1;';
      cells.push('<UserObject id="n_'+xmlEsc(n.id)+'" label="'+xmlEsc(lab)+'"'+inner+(n.note?' tooltip="'+xmlEsc(n.note)+'"':'')+'><mxCell style="'+st+'" vertex="1" parent="1"><mxGeometry x="'+(n.x-w/2)+'" y="'+(n.y-h/2)+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell></UserObject>');
      var rows=(n.fields||[]).concat(n.methods||[]);
      if((n.shape==='table'||n.shape==='class')&&rows.length)rows.forEach(function(r,i){cells.push('<mxCell id="r'+(k++)+'" value="'+xmlEsc(r)+'" style="text;align=left;spacingLeft=6;fontFamily=Courier New;" vertex="1" parent="n_'+xmlEsc(n.id)+'"><mxGeometry y="'+(30+i*20)+'" width="'+w+'" height="20" as="geometry"/></mxCell>');});
    });
    l.edges.forEach(function(e,i){
      if(isSeq(l))return;
      var st=e.style||defStyle(l),ar=e.arrow||defArrow(l),rt=edgeRoute(e,l),r=REL[e.rel];
      var s='html=1;rounded=1;'+(rt==='orthogonal'?'edgeStyle=orthogonalEdgeStyle;':rt==='curved'?'curved=1;':'')+(st!=='solid'||(r&&r.st==='dashed')?'dashed=1;':'')+
        (r?(r.end==='tri'?'endArrow=block;endFill=0;':r.end==='open'?'endArrow=open;':'endArrow=none;')+(r.start==='dia'?'startArrow=diamondThin;startFill=1;':r.start==='odia'?'startArrow=diamondThin;startFill=0;':''):(ar==='none'?'endArrow=none;':ar==='both'?'startArrow=classic;':''));
      var pts=(e.points||[]).map(function(q){return '<mxPoint x="'+q[0]+'" y="'+q[1]+'"/>';}).join('');
      cells.push('<mxCell id="e'+i+'" value="'+xmlEsc(e.label||'')+'" style="'+s+'" edge="1" parent="1" source="n_'+xmlEsc(e.from)+'" target="n_'+xmlEsc(e.to)+'"><mxGeometry relative="1" as="geometry">'+(pts?'<Array as="points">'+pts+'</Array>':'')+'</mxGeometry></mxCell>');
    });
    return '<diagram id="'+pid[v.path.join('/')]+'" name="'+xmlEsc(['Overview'].concat(v.crumbs).join(' / '))+'"><mxGraphModel grid="1" gridSize="10" guides="1"><root>'+cells.join('')+'</root></mxGraphModel></diagram>';
  });
  return '<mxfile host="unfold" type="device">'+pages.join('')+'</mxfile>';
}

/* ---- Excalidraw: the current level, bound arrows and contained labels ---- */
function excalidrawLevel(l){
  var els=[],seed=1,now=Date.now();
  function base(o){return Object.assign({angle:0,strokeColor:'#1e1e1e',backgroundColor:'transparent',fillStyle:'solid',strokeWidth:1.5,strokeStyle:'solid',roughness:1,opacity:100,groupIds:[],frameId:null,roundness:null,seed:seed++,version:1,versionNonce:seed*7919,isDeleted:false,boundElements:[],updated:now,link:null,locked:false},o);}
  var byId={};
  l.nodes.forEach(function(n){
    var w=nw(n),h=nh(n),c=hexOf(n.color),type=n.shape==='diamond'?'diamond':(n.shape==='circle'||n.shape==='initial'||n.shape==='final')?'ellipse':'rectangle',id='n_'+n.id,tid='t_'+n.id;
    var rows=(n.fields||[]).concat(n.methods||[]),txt=n.label+(n.tech?'\n['+n.tech+']':'')+(rows.length?'\n'+rows.join('\n'):'');
    var el=base({id:id,type:type,x:n.x-w/2,y:n.y-h/2,width:w,height:h,strokeColor:c,backgroundColor:n.shape==='text'?'transparent':tint(c,.86),roundness:/rounded|pill|cloud|person/.test(n.shape)?{type:3}:null,boundElements:[{type:'text',id:tid}],strokeStyle:n.shape==='text'?'dotted':'solid'});
    els.push(el);byId[n.id]=el;
    els.push(base({id:tid,type:'text',x:n.x-w/2+8,y:n.y-10,width:w-16,height:20,text:txt,originalText:txt,fontSize:16,fontFamily:1,textAlign:'center',verticalAlign:'middle',containerId:id,lineHeight:1.25,autoResize:true}));
  });
  l.edges.forEach(function(e,i){
    var a=byId[e.from],b=byId[e.to];if(!a||!b||a===b)return;
    var g=isSeq(l)?null:edgeGeom(e,l),pts=g&&g.poly?g.poly:[{x:a.x+a.width/2,y:a.y+a.height/2},{x:b.x+b.width/2,y:b.y+b.height/2}];
    var x0=pts[0].x,y0=pts[0].y,id='e'+i,st=e.style||defStyle(l),ar=e.arrow||defArrow(l);
    var el=base({id:id,type:'arrow',x:x0,y:y0,width:Math.abs(pts[pts.length-1].x-x0),height:Math.abs(pts[pts.length-1].y-y0),points:pts.map(function(p){return [p.x-x0,p.y-y0];}),strokeStyle:st==='solid'?'solid':'dashed',
      startBinding:{elementId:a.id,focus:0,gap:4},endBinding:{elementId:b.id,focus:0,gap:4},startArrowhead:ar==='both'?'arrow':null,endArrowhead:ar==='none'?null:(REL[e.rel]&&REL[e.rel].end==='tri'?'triangle':'arrow'),roundness:{type:2}});
    if(e.label){var lid='l'+i;el.boundElements=[{type:'text',id:lid}];els.push(base({id:lid,type:'text',x:x0,y:y0,width:e.label.length*8,height:20,text:e.label,originalText:e.label,fontSize:14,fontFamily:1,textAlign:'center',verticalAlign:'middle',containerId:id,lineHeight:1.25,autoResize:true}));}
    els.push(el);a.boundElements.push({type:'arrow',id:id});b.boundElements.push({type:'arrow',id:id});
  });
  return JSON.stringify({type:'excalidraw',version:2,source:'https://github.com/mahmoud-nasif/Unfold',elements:els,appState:{viewBackgroundColor:'#ffffff',gridSize:null},files:{}},null,1);
}

/* ---- Mermaid in: flowcharts, sequences, states, classes and ER diagrams become a level ---- */
function parseMermaid(src){
  var lines=String(src).replace(/\r/g,'').split('\n').map(function(x){return x.replace(/%%.*$/,'').trim();}).filter(Boolean);
  if(!lines.length)throw new Error('The text is empty.');
  var head=lines[0],m;
  var lv={nodes:[],edges:[],groups:[]},ids={};
  function node(id,label,shape){id=String(id).trim();if(!ids[id]){ids[id]={id:id,label:label||id};lv.nodes.push(ids[id]);}var n=ids[id];if(label)n.label=label;if(shape)n.shape=shape;return n;}
  function unq(t){t=String(t==null?'':t).trim();if(/^".*"$/.test(t))t=t.slice(1,-1);return t.replace(/<br\s*\/?>/gi,'\n').replace(/#quot;/g,'"');}
  if(/^(flowchart|graph)\b/i.test(head)){
    m=head.match(/^(?:flowchart|graph)\s+(TB|TD|BT|LR|RL)/i);var dir=m?m[1].toUpperCase():'TB';
    lv.type=dir==='LR'||dir==='RL'?'architecture':'process';lv.direction=dir==='LR'||dir==='RL'?'LR':'TB';
    var SH=[['([','])','pill'],['[[',']]','rect'],['[(',')]','cylinder'],['((','))','circle'],['{{','}}','hexagon'],['[/','/]','parallelogram'],['[\\','\\]','parallelogram'],['[/','\\]','parallelogram'],['[\\','/]','parallelogram'],['(',')','rounded'],['[',']','rect'],['{','}','diamond'],['>',']','rect']];
    var grp=null;
    var ref=function(t){
      t=t.trim().replace(/:::\w+$/,'');var mm=t.match(/^([A-Za-z0-9_\-.]+)\s*([\s\S]*)$/);if(!mm)return null;
      var rest=mm[2].trim(),shape=null,label=null;
      for(var i=0;i<SH.length&&rest;i++){var o=SH[i];if(rest.indexOf(o[0])===0&&rest.slice(-o[1].length)===o[1]){label=unq(rest.slice(o[0].length,rest.length-o[1].length));shape=o[2];break;}}
      var n=node(mm[1],label,shape);if(grp&&!n.group)n.group=grp;return n;
    };
    var LINK=/\s*(<?)((?:-{2,}|={2,}|-\.+-)(?:>|o|x)?|~~~)\s*(?:\|([^|]*)\|)?\s*/;
    lines.slice(1).forEach(function(line){
      if(/^(classDef|class|style|linkStyle|click)\b/.test(line))return;
      var sg=line.match(/^subgraph\s+([^\[\s]+)\s*(?:\[(.*)\])?\s*$/);
      if(sg){grp=mmId(sg[1]);lv.groups.push({id:grp,label:unq(sg[2]||sg[1])});return;}
      if(/^end$/.test(line)){grp=null;return;}
      if(/^direction\s/.test(line))return;
      line=line.replace(/--\s+([^->|][^>]*?)\s+-->/g,'-->|$1|').replace(/-\.\s+([^.]+?)\s+\.->/g,'-.->|$1|').replace(/==\s+([^=]+?)\s+==>/g,'==>|$1|');
      var parts=[],rest=line,mm2;
      while((mm2=rest.match(LINK))&&mm2.index>0){parts.push(rest.slice(0,mm2.index));parts.push(mm2);rest=rest.slice(mm2.index+mm2[0].length);}
      parts.push(rest);
      var prev=null;
      for(var i=0;i<parts.length;i+=2){
        var here=parts[i].split('&').map(ref).filter(Boolean);
        if(prev&&i>0){var lk=parts[i-1],op=lk[2],e={};if(/^-\./.test(op))e.style='dashed';else if(/^=/.test(op))e.style='solid';if(!/[>ox]$/.test(op))e.arrow='none';if(lk[1]==='<')e.arrow='both';if(lk[3])e.label=unq(lk[3]);
          prev.forEach(function(a){here.forEach(function(b){lv.edges.push(Object.assign({from:a.id,to:b.id},e));});});}
        prev=here;
      }
    });
  }else if(/^sequenceDiagram/.test(head)){
    lv.type='sequence';
    lines.slice(1).forEach(function(line){
      var p=line.match(/^(?:participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/);if(p){var n=node(p[1],unq(p[2]||p[1]));if(/^actor/.test(line))n.shape='pill';return;}
      var msg=line.match(/^([^-\s>]+?)\s*(--?)(>>|>|x|\))\s*[+-]?([^:\s]+)\s*:\s*(.*)$/);
      if(msg){node(msg[1]);node(msg[4]);var e={from:msg[1],to:msg[4],label:unq(msg[5])};if(msg[2]==='--')e.style='dashed';lv.edges.push(e);}
    });
  }else if(/^stateDiagram/.test(head)){
    lv.type='state';var ini=null,fin=null;
    var st=function(t){t=t.trim();if(t==='[*]')return null;return node(t).id;};
    lines.slice(1).forEach(function(line){
      var d=line.match(/^state\s+"([^"]+)"\s+as\s+(\S+)/);if(d){node(d[2],d[1]);return;}
      var tr=line.match(/^(\S+)\s*-->\s*(\S+)(?:\s*:\s*(.*))?$/);if(!tr)return;
      var a=tr[1]==='[*]'?(ini=ini||node('start','','initial')).id:st(tr[1]),b=tr[2]==='[*]'?(fin=fin||node('done','Done','final')).id:st(tr[2]);
      var e={from:a,to:b};if(tr[3])e.label=unq(tr[3]);lv.edges.push(e);
    });
  }else if(/^classDiagram/.test(head)){
    lv.type='class';var open=null;
    var cls=function(id){var n=node(id);n.shape='class';return n;};
    var add=function(n,mem){mem=mem.trim();if(!mem)return;if(/^<<(.+)>>$/.test(mem)){n.stereotype=mem.slice(2,-2);return;}var k=/\(/.test(mem)?'methods':'fields';(n[k]=n[k]||[]).push(mem);};
    var OPS=[['<|--','inherits',true],['--|>','inherits',false],['<|..','implements',true],['..|>','implements',false],['*--','composition',false],['--*','composition',true],['o--','aggregation',false],['--o','aggregation',true],['-->','association',false],['<--','association',true],['..>','dependency',false],['<..','dependency',true],['--','association',false],['..','dependency',false]];
    lines.slice(1).forEach(function(line){
      if(open){if(line==='}'){open=null;return;}add(open,line);return;}
      var c=line.match(/^class\s+(\w+)(?:~\w+~)?\s*(\{)?\s*$/);if(c){var n=cls(c[1]);if(c[2])open=n;return;}
      var mb=line.match(/^(\w+)\s*:\s*(.+)$/);
      for(var i=0;i<OPS.length;i++){
        var op=OPS[i],at=line.indexOf(op[0]);if(at<0)continue;
        var left=line.slice(0,at).replace(/"[^"]*"/g,'').trim(),right=line.slice(at+op[0].length),lab=null,lm=right.match(/^(.*?):(.*)$/);if(lm){right=lm[1];lab=unq(lm[2]);}
        right=right.replace(/"[^"]*"/g,'').trim();if(!/^\w+$/.test(left)||!/^\w+$/.test(right))continue;
        cls(left);cls(right);
        var from=left,to=right;
        if(op[1]==='inherits'||op[1]==='implements'){if(op[2]){from=right;to=left;}}else if(op[2]){from=right;to=left;}
        var e={from:from,to:to,rel:op[1]};if(lab)e.label=lab;lv.edges.push(e);return;
      }
      if(mb)add(cls(mb[1]),mb[2]);
    });
  }else if(/^erDiagram/.test(head)){
    lv.type='data';var ent=null;
    var en=function(id){var n=node(id);n.shape='table';n.fields=n.fields||[];return n;};
    lines.slice(1).forEach(function(line){
      if(ent){if(line==='}'){ent=null;return;}var f=line.split(/\s+/);ent.fields.push(f[1]+': '+f[0]+(f[2]&&/PK|FK|UK/.test(f[2])?' '+f[2]:''));return;}
      var b=line.match(/^([\w-]+)\s*\{\s*$/);if(b){ent=en(b[1]);return;}
      var r=line.match(/^([\w-]+)\s+([|}o]{2})(--|\.\.)([|{o]{2})\s+([\w-]+)\s*:\s*(.+)$/);
      if(r){en(r[1]);en(r[5]);var many=/\{/.test(r[4])||/\}/.test(r[2]);lv.edges.push({from:r[1],to:r[5],label:unq(r[6])+(many?' (1..*)':'')});}
    });
  }else throw new Error('Unfold reads flowchart, graph, sequenceDiagram, stateDiagram, classDiagram and erDiagram. This text starts with \u201c'+head.slice(0,30)+'\u201d.');
  if(!lv.nodes.length)throw new Error('No nodes were found in that diagram.');
  return lv;
}
function importMermaid(){
  var ta=$('#ss-mm'),err=$('#ss-mm-err'),lv;
  try{lv=parseMermaid(ta.value);}catch(e){err.textContent=e.message;return;}
  var l=cur();
  if(l.nodes.length&&!confirm('Replace what is on this level with the imported diagram?'))return;
  commit(function(){var c=cur();var keep={caption:c.caption};Object.keys(c).forEach(function(k){delete c[k];});Object.assign(c,lv,keep);normLevel(c,{},!path.length);layoutAny(c);});
  closeModal();fitView(320);toast('Imported '+lv.nodes.length+' nodes and '+lv.edges.length+' links.');
}

/* ================= boot ================= */
function boot(){
  var app=document.getElementById('app');
  app.innerHTML='<div class="stage"><svg class="canvas" id="ss-canvas" xmlns="'+NS+'" role="group" aria-label="System diagram">'+
    '<defs><marker id="ss-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M0 1 10 5 0 9z"/></marker>'+
    '<marker id="ss-arrow-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead sel" d="M0 1 10 5 0 9z"/></marker>'+relMarkers()+'</defs>'+
    '<g id="ss-scene"></g></svg><div class="empty-hint" id="ss-empty" hidden></div></div>'+
    '<header class="hud-top"><div class="titleblock"><h1 id="ss-title" spellcheck="false"></h1><p id="ss-subtitle" data-ph="Add a subtitle"></p><nav class="crumbs" id="ss-crumbs" aria-label="Where you are" hidden></nav></div><div class="topbar bar" id="ss-topbar"></div></header>'+
    '<div class="palette bar" id="ss-palette" hidden></div>'+
    
    '<div class="levelbar bar" id="ss-levelbar" hidden></div>'+
    '<div class="zoomctl bar"><button class="ib" data-act="zin" aria-label="Zoom in" title="Zoom in">'+uiIcon('plus')+'</button><button class="ib" data-act="zout" aria-label="Zoom out" title="Zoom out">'+uiIcon('minus')+'</button><button class="ib" data-act="fit" aria-label="Fit to screen" title="Fit (F)">'+uiIcon('fit')+'</button></div>'+
    '<div class="ftb" id="ss-ftb" role="toolbar" aria-label="Selection tools" hidden></div><div class="card" id="ss-card" hidden></div>'+
    '<div class="hint-tip" id="ss-hint" role="tooltip" hidden></div><aside class="about" id="ss-about" aria-label="About this diagram" hidden></aside>'+
    '<div class="viewer" id="ss-viewer" role="dialog" aria-modal="true" aria-label="Media" hidden></div><input type="file" id="ss-file" accept="image/*,video/*" hidden>'+
    '<div class="search" id="ss-search" role="dialog" aria-label="Search" hidden></div><section class="tourbar" id="ss-tour" aria-label="Tour" aria-live="polite" hidden></section>'+
    '<div class="toast" id="ss-toast" role="status" hidden></div><div class="modal" id="ss-modal" hidden></div>';
  svg=$('#ss-canvas');scene=$('#ss-scene');
  var raw=document.getElementById('story-data').textContent;
  try{data=normalize(JSON.parse(raw));}
  catch(err){app.innerHTML='<div class="fatal"><p>The diagram data could not be read: '+esc(err.message)+'</p></div>';return;}
  originalJSON=snapshot();draftKey='unfold:'+hash(originalJSON);
  var restored=false;
  try{var dr=localStorage.getItem(draftKey);if(dr&&dr!==originalJSON){data=normalize(JSON.parse(dr));restored=true;}}catch(e){}
  dirty=restored;
  svg.addEventListener('pointerdown',onDown);svg.addEventListener('pointermove',onMove);
  svg.addEventListener('pointerup',onUp);svg.addEventListener('pointercancel',onUp);
  svg.addEventListener('pointerleave',function(){if(mode==='view'&&!drag){setTrace(null);hideHint();}});
  svg.addEventListener('wheel',onWheel,{passive:false});
  svg.addEventListener('dblclick',onDbl);
  svg.addEventListener('contextmenu',function(e){if(mode==='edit')e.preventDefault();});
  $('#ss-file').addEventListener('change',function(e){var f=e.target.files&&e.target.files[0];e.target.value='';if(f&&pendingMedia)attachFile(pendingMedia.id,f);pendingMedia=null;});
  svg.addEventListener('dragover',function(e){if(mode==='edit'&&e.dataTransfer&&Array.from(e.dataTransfer.types||[]).indexOf('Files')>=0)e.preventDefault();});
  svg.addEventListener('drop',function(e){
    if(mode!=='edit')return;var files=Array.from((e.dataTransfer&&e.dataTransfer.files)||[]).filter(function(f){return /^(image|video)\//.test(f.type);});
    if(!files.length)return;e.preventDefault();var p=toWorld(e),on=nodeNear(p,null);
    // dropped on a node: the files belong to it; on empty canvas each becomes an image node
    if(on&&on.shape!=='text'){setSel({nodes:[on.id]});files.forEach(function(f){attachFile(on.id,f);});toast('Attached '+files.length+' file'+(files.length>1?'s':'')+' to \u201c'+on.label+'\u201d.');return;}
    files.forEach(function(f,i){var id;commit(function(){var l=cur(),n=newNode(l,'image',p.x+i*40,p.y+i*40,f.name.replace(/\.[^.]+$/,''));l.nodes.push(n);id=n.id;sel={nodes:[id],edge:null,group:null};});attachFile(id,f);});
  });
  window.addEventListener('popstate',function(e){var st=e.state&&e.state.unfold;if(!Array.isArray(st))st=[];if(busy)return;fromHistory=true;goToPath(st);});
  try{history.replaceState({unfold:[]},'');}catch(e){}
  $('#ss-palette').addEventListener('pointerdown',onPaletteDown);
  document.addEventListener('keydown',onKey);document.addEventListener('keyup',onKeyUp);
  document.addEventListener('click',onClick);
  var ftb=$('#ss-ftb');
  ftb.addEventListener('pointerdown',function(e){e.stopPropagation();});
  ftb.addEventListener('input',function(e){var f=e.target.dataset&&e.target.dataset.field;if(f)updateField(f,e.target.value);});
  ftb.addEventListener('focusin',function(e){if(e.target.dataset&&e.target.dataset.field)fieldSnap=snapshot();});
  ftb.addEventListener('focusout',function(e){if(e.target.dataset&&e.target.dataset.field&&fieldSnap&&fieldSnap!==snapshot()){pushHistory(fieldSnap);renderHeader();}fieldSnap=null;});
  var lb=$('#ss-levelbar');
  lb.addEventListener('change',function(e){
    if(e.target.dataset.field!=='ltype')return;var v=e.target.value;
    commit(function(){var l=cur(),was=levelType(l);l.type=v;if(v==='sequence'||isTree(l)||v==='timeline'||was==='sequence'||was==='timeline'||was==='tree'||was==='behaviour'){delete l.direction;layoutAny(l);}});fitView(320);
  });
  lb.addEventListener('focusin',function(e){if(e.target.dataset&&e.target.dataset.field)fieldSnap=snapshot();});
  lb.addEventListener('input',function(e){if(e.target.dataset&&e.target.dataset.field)updateField(e.target.dataset.field,e.target.value);});
  lb.addEventListener('focusout',function(e){if(e.target.dataset&&e.target.dataset.field&&fieldSnap&&fieldSnap!==snapshot()){pushHistory(fieldSnap);renderHeader();}fieldSnap=null;});
  lb.addEventListener('keydown',function(e){if(e.key==='Enter')e.target.blur();});
  ['ss-title','ss-subtitle'].forEach(function(idv){
    var el=$('#'+idv),before=null;
    el.addEventListener('focus',function(){before=snapshot();});
    el.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();el.blur();}});
    el.addEventListener('blur',function(){
      var v=el.textContent.replace(/\s+/g,' ').trim();
      if(idv==='ss-title')data.meta.title=v||'Untitled system';else{if(v)data.meta.subtitle=v;else delete data.meta.subtitle;}
      if(before&&before!==snapshot()){pushHistory(before);markDirty();}
      renderHeader();
    });
  });
  var rt=null;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if(!busy)setCam(fitTo(viewTarget()));},120);});
  renderAll();renderAbout();
  var fit=fitTo(viewTarget());
  if(reduceMotion)setCam(fit);
  else{setCam(scaleBox(fit,1.25));scene.classList.add('arriving');requestAnimationFrame(function(){scene.classList.remove('arriving');animateCam(fit,900);});}
  if(restored)toast('Restored your unsaved edits from this browser.',{act:'discard-draft',label:'Discard'});
  else if(data.meta.intent==='demonstrate')toast('This map is set up as a presentation.',{act:'present',label:'Present'});
  if(window.claude&&typeof window.claude.use==='function'){
    window.claude.use('artifact').then(function(a){artifactCap=a;renderHeader();}).catch(function(){});
    window.claude.use('downloads').then(function(d){downloadsCap=d;}).catch(function(){});
  }
}
boot();
})();
