/* ================= keyboard ================= */
function onKey(e){
  var t=e.target,typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
  if(viewing&&!$('#ss-viewer').hidden&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();stepMedia(e.key==='ArrowLeft'?-1:1);return;}
  if(tour&&!typing&&$('#ss-modal').hidden&&$('#ss-viewer').hidden&&!e.metaKey&&!e.ctrlKey){
    if(e.key==='ArrowRight'||e.key==='PageDown'||(presenting&&e.key===' ')){e.preventDefault();if(tour.i<tour.t.steps.length-1)stepTour(1);return;}
    if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();stepTour(-1);return;}
  }
  if(e.key==='Escape'){
    if(infoOpen){infoOpen=false;renderInfo();renderHeader();return;}
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

