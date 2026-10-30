/* ================= rendering ================= */
function worldIcon(icon,label,size,cx,cy){
  if(icon&&ICONS[icon]){var k=size/24;return '<g class="ic" transform="translate('+(cx-size/2)+' '+(cy-size/2)+') scale('+k+')">'+shapes(ICONS[icon])+'</g>';}
  var t=(icon&&icon.trim())||((label||'?').trim().charAt(0).toUpperCase());
  return '<text class="ic-text" x="'+cx+'" y="'+(cy+size*.36)+'" font-size="'+size+'">'+esc(t)+'</text>';
}
function nodeMarkup(n,l){
  var inner=showsInner(n),w=nw(n),h=nh(n),X=-w/2,Y=-h/2;
  var isSel=sel.nodes.indexOf(n.id)>=0;
  var cls='node t-'+n.shape+(inner?' has-inner':'')+(isSel?' sel':'')+(n.role?' role-'+n.role:'')+(DIFF_TEXT[n.diff]?' diff-'+n.diff:'')+(n.confidence==='inferred'?' inferred':'')+(isPlanned(n)?' planned':'');
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
  var capped=n.shape==='image'&&!!imagePoster(n);
  if(capped)s+='<g class="img-cap"><rect class="cap-bg" x="'+(X+1)+'" y="'+(h/2-39)+'" width="'+(w-2)+'" height="38" rx="11"/>';
  s+='<text class="lbl" font-size="'+fs+'" font-weight="'+(t.bold===false?500:(t.bold?750:600))+'"'+(t.italic?' font-style="italic"':'')+'>';
  lines.forEach(function(ln,i){s+='<tspan x="0" y="'+(top+lh*(i+.78)).toFixed(1)+'">'+esc(ln)+'</tspan>';});
  s+='</text>'+(capped?'</g>':'');
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
  var tg=n.tags||[],shown=tg.slice(0,3);
  shown.forEach(function(t){var tw=t.length*6.8+18;s+='<g class="tag" transform="translate('+badgeX+' '+(Y-24)+')"><title>'+esc(t)+'</title><rect width="'+tw+'" height="20" rx="10"/><text x="'+tw/2+'" y="14">'+esc(t)+'</text></g>';badgeX+=tw+6;});
  if(tg.length>shown.length){var mt='+'+(tg.length-shown.length);s+='<g class="tag more" transform="translate('+badgeX+' '+(Y-24)+')"><title>'+esc(tg.slice(3).join(', '))+'</title><rect width="30" height="20" rx="10"/><text x="15" y="14">'+mt+'</text></g>';badgeX+=36;}
  if(DIFF_TEXT[n.diff]){var dl=DIFF_TEXT[n.diff],dw=dl.length*7+18;s+='<g class="dtag diff-'+n.diff+'" transform="translate('+badgeX+' '+(Y-24)+')"><rect width="'+dw+'" height="20" rx="10"/><text x="'+dw/2+'" y="14">'+dl+'</text></g>';}
  if(BT_GLYPH[n.bt])s+='<g class="bt" transform="translate('+(X+16)+' '+(Y+16)+')"><title>'+BT_NAMES[n.bt]+'</title><rect x="-10" y="-10" width="20" height="20" rx="5"/><text y="5">'+BT_GLYPH[n.bt]+'</text></g>';
  if(n.confidence==='inferred'&&['initial','final','text'].indexOf(n.shape)<0)s+='<g class="conf" transform="translate('+(X+12)+' '+(h/2-12)+')"><title>'+CONF_TEXT.inferred+'</title><circle r="8"/><text y="3.6">?</text></g>';
  if(mode==='edit'&&n.shape!=='text'){
    // ports keep their size on screen at any zoom (--pz), with a wider invisible ring to grab
    SIDES.forEach(function(sd){var p=port(n,sd);s+='<g class="port" data-port="'+sd+'" transform="translate('+(p.x-n.x)+' '+(p.y-n.y)+')"><g class="pz"><circle class="port-hit" r="15"/><circle class="port-dot" r="6"/></g></g>';});
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
// a node with a picture shows the picture alone: its name appears over the bottom of it on hover, selection or focus
function imagePoster(n){var m=mediaList(n)[0]||{},t=mediaType(m);return t==='image'?m.src:m.poster;}
function imageInner(n){
  var w=nw(n),h=nh(n),X=-w/2,Y=-h/2,has=!!imagePoster(n),ih=has?h:h-38,id='ssclip'+(++clipSeq),m=mediaList(n)[0]||{},t=mediaType(m),s='';
  s+='<clipPath id="'+id+'"><rect x="'+(X+1)+'" y="'+(Y+1)+'" width="'+(w-2)+'" height="'+ih+'" rx="11"/></clipPath>';
  var poster=t==='image'?m.src:m.poster;
  if(poster)s+='<image href="'+esc(poster)+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+ih+'" preserveAspectRatio="xMidYMid slice" clip-path="url(#'+id+')"/>';
  else s+='<rect class="img-empty" x="'+(X+1)+'" y="'+(Y+1)+'" width="'+(w-2)+'" height="'+ih+'" clip-path="url(#'+id+')"/>'+(t?'':worldIcon('camera','',28,0,Y+ih/2));
  if(t==='video'||t==='embed')s+='<g class="play" transform="translate(0 '+(Y+ih/2)+')"><circle r="20"/><path d="M-6 -9 10 0 -6 9z"/></g>';
  if(!has)s+='<line class="img-rule" x1="'+X+'" x2="'+(w/2)+'" y1="'+(Y+ih)+'" y2="'+(Y+ih)+'"/>';
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
// where an edge's label sits: the middle of the path, moved by the offset the user dragged it to
var meter=null;
function pathMeter(d){
  if(!meter){meter=document.createElementNS(NS,'path');svg.querySelector('defs').appendChild(meter);}
  meter.setAttribute('d',d);return meter;
}
function pathPoint(d,t){var m=pathMeter(d),L=m.getTotalLength(),q=m.getPointAtLength(L*t);return {x:q.x,y:q.y};}
// the point of the path nearest to p, as a fraction of its length
function pathNearest(d,p){
  var m=pathMeter(d),L=m.getTotalLength(),best=0.5,bd=Infinity,N=120;
  for(var i=0;i<=N;i++){var q=m.getPointAtLength(L*i/N),dd=Math.hypot(q.x-p.x,q.y-p.y);if(dd<bd){bd=dd;best=i/N;}}
  return best;
}
// a label sits on its link: in the middle, or where the user slid it to (`labelT`, 0 to 1 along the path)
function labelXY(e,g){
  if(typeof e.labelT==='number'&&isFinite(e.labelT)&&g.d&&!g.self){return pathPoint(g.d,clamp(e.labelT,.04,.96));}
  return {x:g.mx,y:g.my};
}
function edgeMarkup(e,i,l){
  var seq=isSeq(l),g=seq?seqGeom(e,i,l):edgeGeom(e,l);if(!g)return '';
  var lp=labelXY(e,g),mx=lp.x,my=lp.y;
  var isSel=sel.edge===i,arrow=e.arrow||defArrow(l),mk=isSel?'ss-arrow-sel':'ss-arrow',rel=!seq&&REL[e.rel],sf=isSel?'-sel':'';
  if(rel){var rs='<g class="edge '+(e.style||rel.st)+(isSel?' sel':'')+(DIFF_TEXT[e.diff]?' diff-'+e.diff:'')+'" data-i="'+i+'"><path class="hit" d="'+g.d+'"/><path class="line" d="'+g.d+'"'+(rel.end?' marker-end="url(#ss-'+rel.end+sf+')"':'')+(rel.start?' marker-start="url(#ss-'+rel.start+sf+')"':'')+'/>';
    if(e.label){var rw=e.label.length*6.9+18;rs+='<g class="elabel"><rect x="'+(mx-rw/2)+'" y="'+(my-11)+'" width="'+rw+'" height="22" rx="11"/><text x="'+mx+'" y="'+(my+4.5)+'">'+esc(e.label)+'</text></g>';}
    return rs+'</g>';}
  var s='<g class="edge '+(e.style||defStyle(l))+(seq?' msg':'')+(isSel?' sel':'')+(DIFF_TEXT[e.diff]?' diff-'+e.diff:'')+'" data-i="'+i+'"><path class="hit" d="'+g.d+'"/><path class="line" d="'+g.d+'"'+
    (arrow!=='none'?' marker-end="url(#'+mk+')"':'')+(arrow==='both'?' marker-start="url(#'+mk+')"':'')+'/>';
  if(seq){
    var num=String(i+1);
    s+='<g class="seqnum" transform="translate('+(g.x0+(g.self?0:g.dir*0))+' '+g.y+')"><circle r="9"/><text y="4">'+num+'</text></g>';
    if(e.label){var lw=e.label.length*6.9+16,lx=g.self?mx:mx-lw/2;s+='<g class="elabel'+(g.self?' left':'')+'"><rect x="'+lx+'" y="'+(my-11)+'" width="'+lw+'" height="22" rx="11"/><text x="'+(lx+lw/2)+'" y="'+(my+4.5)+'">'+esc(e.label)+'</text></g>';}
    return s+'</g>';
  }
  if(e.label){var w=e.label.length*6.9+18;s+='<g class="elabel"><rect x="'+(mx-w/2)+'" y="'+(my-11)+'" width="'+w+'" height="22" rx="11"/><text x="'+mx+'" y="'+(my+4.5)+'">'+esc(e.label)+'</text></g>';}
  return s+'</g>';
}
// bend points of the selected edge: drag a point to move it, drag a hollow midpoint to add one, double-click a point to remove it
function edgeHandles(l){
  if(mode!=='edit'||sel.edge==null||isSeq(l))return '';
  var e=l.edges[sel.edge],g=e&&edgeGeom(e,l);if(!g)return '';
  var s='<g class="wph">';
  if(g.pa&&g.pb)[g.pa,g.pb].forEach(function(q,k){s+='<g class="ep" data-end="'+k+'" transform="translate('+q.x+' '+q.y+')"><title>Drag to another anchor, or onto another node, to move this end</title><g class="pz"><circle class="port-hit" r="13"/><circle class="ep-dot" r="6.5"/></g></g>';});
  // a hollow dot under the label would steal its drag, so it sits just below the label instead
  var lq=e.label?labelXY(e,g):null,lhw=e.label?(e.label.length*6.9+18)/2+6:0;
  (g.mids||[]).forEach(function(m){var hy=m.y;if(lq&&Math.abs(m.x-lq.x)<lhw&&Math.abs(m.y-lq.y)<17)hy=lq.y+26;s+='<g class="wpm" data-k="'+m.k+'" transform="translate('+m.x+' '+hy+')"><title>Drag to bend</title><g class="pz"><circle class="port-hit" r="12"/><circle class="wp-dot" r="5"/></g></g>';});
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

