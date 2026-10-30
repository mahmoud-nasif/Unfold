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
  var epEl=cl('.ep'),lbEl=cl('.elabel');
  if(epEl&&sel.edge!=null){drag=Object.assign(base,{kind:'end',i:sel.edge,end:+epEl.dataset.end,snap:snapshot()});return;}
  if(lbEl&&edgeEl&&!isSeq(l)){
    var li=+edgeEl.dataset.i;if(sel.edge!==li)setSel({edge:li});
    drag=Object.assign(base,{kind:'label',i:li,snap:snapshot()});return;
  }
  var wpEl=cl('.wp'),wpmEl=cl('.wpm');
  if((wpEl||wpmEl)&&sel.edge!=null){drag=Object.assign(base,{kind:'wp',i:sel.edge,k:+(wpEl||wpmEl).dataset.k,add:!!wpmEl,snap:snapshot()});return;}
  if(portEl&&nodeEl){var src=findNode(nodeEl.dataset.id),p=port(src,portEl.dataset.port);drag=Object.assign(base,{kind:'connect',from:src.id,p:p,side:portEl.dataset.port});return;}
  if(rsEl&&nodeEl){var rn=findNode(nodeEl.dataset.id);drag=Object.assign(base,{kind:'resize',n:rn,w0:nw(rn),h0:nh(rn),x0:rn.x,y0:rn.y,snap:snapshot()});return;}
  if(nodeEl){
    var id=nodeEl.dataset.id;
    if(e.shiftKey||e.metaKey||e.ctrlKey){var i=sel.nodes.indexOf(id);var ns=sel.nodes.slice();if(i>=0)ns.splice(i,1);else ns.push(id);setSel({nodes:ns});drag=null;return;}
    if(sel.nodes.indexOf(id)<0)setSel({nodes:[id]});
    drag=Object.assign(base,{kind:'move',items:sel.nodes.map(function(x){var n=findNode(x,l);return {n:n,x:n.x,y:n.y};}),bends:bendsWithin(l,sel.nodes),snap:snapshot()});return;
  }
  if(edgeEl){
    var ei=+edgeEl.dataset.i;if(sel.edge!==ei)setSel({edge:ei});
    // pressing on a line and dragging pulls a new bend out of it, wherever it is
    var eg=!isSeq(l)&&edgeGeom(l.edges[ei],l),mk=0;
    if(eg&&eg.mids&&eg.mids.length){var bd=Infinity;eg.mids.forEach(function(m){var d=Math.hypot(m.x-w.x,m.y-w.y);if(d<bd){bd=d;mk=m.k;}});drag=Object.assign(base,{kind:'wp',i:ei,k:mk,add:true,snap:snapshot()});}
    else drag=null;
    return;
  }
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
  // pulling a new bend out of a line needs a deliberate drag, so a shaky click never adds one
  if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<(drag.kind==='wp'&&drag.add?12:4))return;
  if(!drag.moved){drag.moved=true;if(drag.kind==='move'||drag.kind==='resize'||drag.kind==='label'){$('#ss-ftb').hidden=true;}}
  var p=toWorld(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;
  switch(drag.kind){
    case 'move':
      var sx=snap(dx,e.altKey),sy=snap(dy,e.altKey);
      drag.items.forEach(function(it){it.n.x=it.x+sx;it.n.y=it.y+sy;});
      (drag.bends||[]).forEach(function(b){b.e.points=b.pts.map(function(q){return [q[0]+sx,q[1]+sy];});});queueScene();break;
    case 'wp':
      var ed=cur().edges[drag.i];if(!ed)break;
      if(drag.add){ed.points=(ed.points||[]).slice();ed.points.splice(drag.k,0,[0,0]);drag.add=false;}
      ed.points[drag.k]=alignBend(ed,drag.k,Math.round(p.x),Math.round(p.y));queueScene();break;
    case 'label':
      var le2=cur().edges[drag.i],lg=le2&&edgeGeom(le2,cur());if(!lg)break;
      var lt=pathNearest(lg.d,p);
      if(Math.abs(lt-.5)<.03)delete le2.labelT;else le2.labelT=Math.round(clamp(lt,.04,.96)*1000)/1000;
      queueScene();break;
    case 'end':
      var ee=cur().edges[drag.i];if(!ee)break;
      var other=drag.end?ee.from:ee.to,tn=nodeNear(p,other),gz=$('#ss-ghost-end');
      scene.querySelectorAll('.node.drop-target').forEach(function(el){el.classList.remove('drop-target');});
      if(!tn){if(gz)gz.remove();break;}
      var tp=port(tn,anchorNear(tn,p));
      if(!gz){gz=document.createElementNS(NS,'circle');gz.setAttribute('id','ss-ghost-end');gz.setAttribute('class','ghost-end');svg.appendChild(gz);}
      gz.setAttribute('cx',tp.x);gz.setAttribute('cy',tp.y);gz.setAttribute('r',pxToWorld(8));
      var tel=scene.querySelector('.node[data-id="'+cssId(tn.id)+'"]');if(tel)tel.classList.add('drop-target');break;
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
  var gh=$('#ss-ghost');if(gh)gh.remove();var mq=$('#ss-marq');if(mq)mq.remove();var gz=$('#ss-ghost-end');if(gz)gz.remove();
  if(d.kind==='end'){
    scene.querySelectorAll('.node.drop-target').forEach(function(el){el.classList.remove('drop-target');});
    if(!d.moved)return;
    var el_=cur().edges[d.i];if(!el_)return;
    var pw=toWorld(e),tn=nodeNear(pw,d.end?el_.from:el_.to);if(!tn)return;
    var sd_=anchorNear(tn,pw);
    commit(function(){
      var ed=cur().edges[d.i],key=d.end?'to':'from';
      if(ed[key]!==tn.id){ed[key]=tn.id;delete ed.points;delete ed[d.end?'toSide':'fromSide'];}
      ed[d.end?'toSide':'fromSide']=sd_;sel={nodes:[],edge:d.i,group:null};
    });
    return;
  }
  if(d.kind==='enter'&&!d.moved){var en=findNode(d.id);if(en&&en.children)goToPath(path.concat([d.id]));else if(en)openMedia(en,0);return;}
  if(d.kind==='tap'&&!d.moved){activate(d.id);return;}
  if(d.kind==='pan'&&!d.moved){if(detailId){detailId=null;renderCard();}return;}
  if(d.kind==='wp'&&d.moved)straightenBends(cur().edges[d.i]);
  if((d.kind==='move'||d.kind==='resize'||d.kind==='wp'||d.kind==='label')&&d.moved){var sl=cur();if(isSeq(sl)){sl.nodes.sort(function(a,b){return a.x-b.x;});seqLayout(sl);}pushHistory(d.snap);markDirty();renderAll();return;}
  if(d.kind==='wp'||d.kind==='label')return;
  if(d.kind==='move'&&!d.moved){renderToolbar();return;}
  if(d.kind==='connect'){
    scene.querySelectorAll('.node.drop-target').forEach(function(el){el.classList.remove('drop-target');});
    if(!d.moved)return;
    // link to the node under the pointer, or one within a short reach of it; only empty canvas makes a new node
    var tgt=nodeNear(toWorld(e),d.from),l=cur(),self=!tgt&&findNode(d.from)&&inBox(toWorld(e),findNode(d.from),0);
    if(tgt){var tw=toWorld(e),ta=anchorNear(tgt,tw),tq=anchorPoint(tgt,ta);linkNodes(d.from,tgt.id,d.side,Math.hypot(tq.x-tw.x,tq.y-tw.y)<=pxToWorld(28)?ta:null);}
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
  if(cl('.port')||cl('.rs')||cl('.enter')||cl('.wpm')||cl('.ep'))return;
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

