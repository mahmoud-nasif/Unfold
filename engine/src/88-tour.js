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
  tour={t:t,i:-1,answered:null};pace=present?1.7:1.35;setPresent(!!present);
  if(mode!=='view')setMode('view');
  aboutOpen=false;renderAbout();closeSearch();showStep(0);
}
function endTour(){
  tour=null;pace=1;setPresent(false);var pw=$('#ss-pwin');if(pw){pw.hidden=true;pw.innerHTML='';}document.body.classList.remove('has-pwin');scene.classList.remove('spotlight');scene.querySelectorAll('.spot').forEach(function(el){el.classList.remove('spot');});
  renderTour();if(notesWin&&!notesWin.closed)notesWin.close();notesWin=null;fitView(420);
}
function setPresent(on){
  presenting=on;document.body.classList.toggle('presenting',on);
  if(on&&document.documentElement.requestFullscreen&&!document.fullscreenElement){try{document.documentElement.requestFullscreen().catch(function(){});}catch(e){}}
  if(!on&&document.fullscreenElement&&document.exitFullscreen){try{document.exitFullscreen().catch(function(){});}catch(e){}}
  renderChrome();
}
function showStep(i){
  if(!tour)return;var st=tour.t.steps;i=clamp(i,0,st.length-1);tour.i=i;tour.answered=null;
  detailId=null;renderCard();hideHint();renderTour();updateNotes();runStep();
}
// moves the camera to the current step; a step asked for while the camera is still travelling waits its turn
// meta.presentStyle 'window': the overview stays where it is, dimmed, and what a step is about opens in a smaller window
// on top of it (the inner diagram of the part, or its note), so a presentation never zooms through the levels.
function windowStyle(){return presenting&&data.meta.presentStyle==='window';}
function runWindowStep(){
  var i=tour.i,s=tour.t.steps[i],p=Array.isArray(s.path)?s.path:[],top=p.length?p[0]:s.node,n=s.node&&findNode(s.node,levelAt(p)),inner=n&&n.children&&n.children.nodes.length?p.concat([s.node]):p;
  var go=path.length?goToPath([]):Promise.resolve();
  return go.then(function(){
    if(!tour||tour.i!==i)return;
    scene.querySelectorAll('.spot').forEach(function(el){el.classList.remove('spot');});
    scene.classList.toggle('spotlight',!!top);
    if(top)scene.querySelectorAll('.node').forEach(function(el){if(el.dataset.id===top)el.classList.add('spot');});
    scene.querySelectorAll('.edge').forEach(function(el){var e=data.root.edges[+el.dataset.i];if(top&&e&&(e.from===top||e.to===top))el.classList.add('spot');});
    animateCam(fitTo(viewTarget()),ms(500));
    showWindow(s,inner,n);
    tour.moving=false;renderTour();
  });
}
function showWindow(s,tp,n){
  var el=$('#ss-pwin');if(!el)return;
  if(!tp.length&&!(n&&(mediaList(n).length||n.note))){el.hidden=true;el.innerHTML='';document.body.classList.remove('has-pwin');return;}
  var l=levelAt(tp),title=tp.length?pathLabels(tp).join(' \u203a '):n.label,body;
  if(tp.length&&l&&l.nodes.length){clipSeq=5000;body=levelSVG(tp).replace(/ width="\d+" height="\d+"/,'');}
  else{var m=mediaList(n)[0];body='<div class="pw-note">'+(m&&mediaType(m)==='image'?'<img src="'+esc(m.src)+'" alt="">':'')+(n.note?'<p>'+esc(n.note)+'</p>':'')+'</div>';}
  el.innerHTML='<div class="pw-head"><b>'+esc(title)+'</b></div><div class="pw-body">'+body+'</div>';
  el.hidden=false;document.body.classList.add('has-pwin');
  el.classList.remove('in');void el.offsetWidth;el.classList.add('in');
}
function runStep(){
  if(!tour)return;
  if(busy||tour.moving){tour.again=true;return;}
  tour.moving=true;tour.again=false;
  if(windowStyle()){runWindowStep();return;}
  var i=tour.i,s=tour.t.steps[i];
  goToPath(Array.isArray(s.path)?s.path:[]).then(function(){
    if(!tour)return;tour.moving=false;
    if(tour.again||tour.i!==i){runStep();return;}
    scene.querySelectorAll('.spot').forEach(function(el){el.classList.remove('spot');});
    var n=s.node&&findNode(s.node);
    if(n&&!s.quiz){
      scene.classList.add('spotlight');
      scene.querySelectorAll('.node').forEach(function(el){if(el.dataset.id===n.id)el.classList.add('spot');});
      scene.querySelectorAll('.edge').forEach(function(el){var e=cur().edges[+el.dataset.i];if(e&&(e.from===n.id||e.to===n.id))el.classList.add('spot');});
      var b=nodeBox(n);animateCam(fitTo(scaleBox(b,Math.max(2.6,Math.min(4,900/Math.max(b.w,b.h))))),ms(560));
    }else{scene.classList.remove('spotlight');fitView(ms(420));}
    renderTour();
  });
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
