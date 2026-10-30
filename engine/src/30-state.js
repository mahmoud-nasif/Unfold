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
// tags: any number of short labels on a node. Input and Output are tags too; they live in `role`, which also drives layout.
var TAG_SUGGEST=['planned','deprecated','dev only','external','hardware','experimental','safety-critical','legacy'];
function cleanTags(a){var out=[];a.forEach(function(t){t=String(t==null?'':t).replace(/\s+/g,' ').trim().slice(0,24);if(t&&out.map(function(x){return x.toLowerCase();}).indexOf(t.toLowerCase())<0)out.push(t);});return out;}
function isPlanned(n){return (n.tags||[]).some(function(t){return String(t).toLowerCase()==='planned';});}
function badged(n){return !!(n.role||(n.tags&&n.tags.length));}
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

