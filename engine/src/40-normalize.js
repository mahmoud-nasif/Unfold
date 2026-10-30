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
    n.tags=cleanTags((Array.isArray(n.tags)?n.tags:[]).concat(n.tag?[n.tag]:[]));delete n.tag;if(!n.tags.length)delete n.tags;
    if(n.children)normLevel(n.children,kinds,false);
  });
  l.edges.forEach(function(e){if(e)delete e.labelAt;});
  l.edges=l.edges.filter(function(e){return e&&ids[e.from]&&ids[e.to]&&(e.from!==e.to||isSeq(l));});
  var missing=l.nodes.some(function(n){return !isFinite(n.x)||!isFinite(n.y)||n.x===null||n.y===null;});
  if(isSeq(l))seqLayout(l);else if(missing)layoutAny(l);
}

