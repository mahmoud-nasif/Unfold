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
    if(!s&&(n.tags||[]).join(' ').toLowerCase().indexOf(q)>=0)s=15;
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

