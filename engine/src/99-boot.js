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
    '<div class="hint-tip" id="ss-hint" role="tooltip" hidden></div><aside class="about" id="ss-about" aria-label="About this diagram" hidden></aside><aside class="infopanel" id="ss-info" aria-label="Map info" hidden></aside>'+
    '<div class="viewer" id="ss-viewer" role="dialog" aria-modal="true" aria-label="Media" hidden></div><input type="file" id="ss-file" accept="image/*,video/*" hidden>'+
    '<div class="search" id="ss-search" role="dialog" aria-label="Search" hidden></div><div class="pscrim" id="ss-pscrim"></div><section class="pwin" id="ss-pwin" aria-label="Detail" hidden></section><section class="tourbar" id="ss-tour" aria-label="Tour" aria-live="polite" hidden></section>'+
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
  function hasDrop(dt){var t=Array.from((dt&&dt.types)||[]);return t.indexOf('Files')>=0||t.indexOf('text/uri-list')>=0;}
  svg.addEventListener('dragover',function(e){if(mode==='edit'&&hasDrop(e.dataTransfer))e.preventDefault();});
  svg.addEventListener('drop',function(e){
    if(mode!=='edit')return;var dt=e.dataTransfer||{};
    var files=Array.from(dt.files||[]).filter(function(f){return /^(image|video)\//.test(f.type);});
    var url=!files.length&&dt.getData?String(dt.getData('text/uri-list')||'').split('\n').filter(function(x){return /^https?:\/\//.test(x.trim());})[0]:'';
    if(!files.length&&!url)return;e.preventDefault();var p=toWorld(e),on=nodeNear(p,null);
    // dropped on a node: the files belong to it; on empty canvas each becomes an image node
    if(files.length&&on&&on.shape!=='text'){setSel({nodes:[on.id]});files.forEach(function(f){attachFile(on.id,f);});toast('Attached '+files.length+' file'+(files.length>1?'s':'')+' to \u201c'+on.label+'\u201d.');return;}
    if(url){if(on&&on.shape!=='text'){commit(function(){setMedia(on,mediaList(on).concat([{src:url.trim()}]));});}else addUrlNode(url.trim(),p.x,p.y);return;}
    files.forEach(function(f,i){addMediaNode(f,p.x+i*40,p.y+i*40);});
  });
  // pasting a picture (a screenshot, say) puts it in the middle of the view
  document.addEventListener('paste',function(e){
    if(mode!=='edit'||busy)return;var t=e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;
    var files=Array.from((e.clipboardData&&e.clipboardData.files)||[]).filter(function(f){return /^image\//.test(f.type);});
    if(!files.length)return;e.preventDefault();var c=viewCenter();
    files.forEach(function(f,i){var sp=freeSpot(cur(),'image',c.x+i*40,c.y+i*40);addMediaNode(f,sp.x,sp.y);});
  });
  window.addEventListener('popstate',function(e){var st=e.state&&e.state.unfold;if(!Array.isArray(st))st=[];if(busy)return;fromHistory=true;goToPath(st);});
  try{history.replaceState({unfold:[]},'');}catch(e){}
  $('#ss-palette').addEventListener('pointerdown',onPaletteDown);
  document.addEventListener('keydown',onKey);document.addEventListener('keyup',onKeyUp);
  document.addEventListener('click',onClick);
  var ftb=$('#ss-ftb');
  ftb.addEventListener('pointerdown',function(e){e.stopPropagation();});
  ftb.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='ss-tagin'){e.preventDefault();addTagFromInput();}});
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
