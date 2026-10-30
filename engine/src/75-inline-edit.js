/* ================= inline text editing ================= */
function startInline(kind,ref){
  if(mode!=='edit')return;
  finishInline(true);
  var l=cur(),val='',box,fs=14.5,bold=true;
  if(kind==='node'){var n=findNode(ref);if(!n)return;val=n.label;fs=FS[(n.text||{}).size]||FS.m;box={x:n.x-nw(n)/2+6,y:n.y-nh(n)/2+6,w:nw(n)-12,h:nh(n)-12};}
  else if(kind==='edge'){var e=l.edges[ref],g=isSeq(l)?seqGeom(e,ref,l):edgeGeom(e,l);if(!g)return;val=e.label||'';fs=12.5;bold=false;var lq=labelXY(e,g);box={x:lq.x-80,y:lq.y-16,w:160,h:32};}
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

