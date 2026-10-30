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
// from and to are anchors the user dragged the link between; a link made without them leaves its ends to routing
function linkNodes(from,to,fromSide,toSide){
  var l=cur(),k=-1;l.edges.forEach(function(x,i){if(x.from===from&&x.to===to)k=i;});
  if(k>=0){setSel({edge:k});toast('These two are already linked.');return;}
  commit(function(){var ne={from:from,to:to};if(fromSide)ne.fromSide=fromSide;if(toSide)ne.toSide=toSide;l.edges.push(ne);sel={nodes:[],edge:l.edges.length-1,group:null};});
}
var linkFrom=null;
function startLink(id){linkFrom=id;document.body.classList.add('linking');pop=null;renderToolbar();toast('Click the node to link to. Esc cancels.');}
function endLink(){linkFrom=null;document.body.classList.remove('linking');$('#ss-toast').hidden=true;}
// bend points of edges whose two ends move together travel with them
// a bend dropped on (or almost on) the straight way between its neighbours is not a bend: it goes away,
// which is also how you remove one by dragging it back onto the line
function straightenBends(e){
  if(!e||!e.points||!e.points.length)return;var l=cur(),fa=findNode(e.from,l),fb=findNode(e.to,l);if(!fa||!fb)return;
  var tol=Math.max(pxToWorld(10),10),chain=[{x:fa.x,y:fa.y}].concat(e.points.map(function(q){return {x:q[0],y:q[1]};}),[{x:fb.x,y:fb.y}]),keep=[];
  for(var k=1;k<chain.length-1;k++){
    var a=keep.length?chain[keep[keep.length-1]]:chain[0],b=chain[k+1],p=chain[k],dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy||1;
    var t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/L2,0,1),dist=Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
    if(dist>tol)keep.push(k);
  }
  e.points=keep.map(function(k){return [chain[k].x,chain[k].y];});if(!e.points.length)delete e.points;
}
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
  commit(function(){var l=cur(),d=levelDir(l);l.direction=d;l.edges.forEach(function(e){if(e.points){delete e.points;cleared++;}delete e.labelT;});layoutAny(l);});fitView(380);
  if(cleared)toast('Tidy reset '+cleared+' custom path'+(cleared>1?'s':'')+'.',{act:'undo',label:'Undo'});
}
var fieldSnap=null;
function addTagFromInput(){
  var el=$('#ss-tagin'),n=sel.nodes.length===1&&findNode(sel.nodes[0]),v=el&&el.value.trim();if(!n||!v)return;
  var lc=v.toLowerCase();
  commit(function(){if(lc==='input'||lc==='output')n.role=lc;else{n.tags=cleanTags((n.tags||[]).concat([v]));}});
  var again=$('#ss-tagin');if(again)again.focus();
}
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

