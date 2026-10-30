/* ================= view detail card ================= */
function renderCard(){
  var c=$('#ss-card'),n=detailId&&findNode(detailId);
  if(!n||mode!=='view'){c.hidden=true;return;}
  var h='<div class="card-head" style="--nc:'+colorVar(n.color)+';--rc:'+roleVar(n.role)+'"><div><h3>'+esc(n.label)+'</h3>'+(n.role?'<span class="pill">'+(n.role==='input'?'Input':'Output')+'</span>':'')+(n.tags||[]).map(function(t){return '<span class="pill" style="--rc:var(--nc)">'+esc(t)+'</span>';}).join('')+(DIFF_TEXT[n.diff]?'<span class="pill diff-'+n.diff+'">'+DIFF_TEXT[n.diff]+'</span>':'')+'</div>'+
    '<button class="ib card-x" data-act="close-card" aria-label="Close">'+uiIcon('close')+'</button></div>';
  h+=n.note?'<p>'+esc(n.note)+'</p>':'<p class="muted">No notes yet.</p>';
  if(n.source&&n.source.length)h+='<div class="src">'+n.source.map(function(s){var u=srcLink(s);return u?'<a class="src-link" href="'+esc(u)+'" target="_blank" rel="noopener"><code>'+esc(s)+'</code>'+uiIcon('open',13)+'</a>':'<code>'+esc(s)+'</code>';}).join('')+'</div>';
  if(n.confidence&&CONF_TEXT[n.confidence])h+='<p class="conf-line conf-'+n.confidence+'">'+esc(CONF_TEXT[n.confidence])+'</p>';
  var ml=mediaList(n);
  if(ml.length&&!hasInner(n))h+='<div class="card-media">'+ml.map(function(m,i){var t=mediaType(m),th=t==='image'?m.src:m.poster;return '<button data-act="view-media" data-arg="'+esc(n.id)+'" data-i="'+i+'" title="'+esc(m.caption||'View')+'">'+(th?'<img src="'+esc(th)+'" alt="'+esc(m.caption||n.label)+'">':'<span class="m-ph">'+uiIcon('play',18)+'</span>')+'</button>';}).join('')+'</div>';
  if(n.fields&&n.fields.length)h+='<div class="src">'+n.fields.map(function(f){return '<code>'+esc(f)+'</code>';}).join('')+'</div>';
  if(hasInner(n))h+='<p><button class="btn solid" data-act="open-node" data-arg="'+esc(n.id)+'">'+uiIcon('open')+'<span>Open inner diagram</span></button></p>';
  c.innerHTML=h;c.hidden=false;placeCard();
}
function placeCard(){
  var c=$('#ss-card'),n=detailId&&findNode(detailId);
  if(!c||c.hidden||!n)return;
  var a=toScreen(n.x+nw(n)/2,n.y-nh(n)/2),b=toScreen(n.x-nw(n)/2,n.y),app=$('#app').getBoundingClientRect();
  var x=a.x+14,y=a.y;
  if(x+c.offsetWidth>app.width-8)x=b.x-c.offsetWidth-14;
  c.style.left=clamp(x,8,app.width-c.offsetWidth-8)+'px';c.style.top=clamp(y,70,app.height-c.offsetHeight-8)+'px';
}

