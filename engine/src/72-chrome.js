/* ================= chrome ================= */
function renderHeader(){
  var t=$('#ss-title'),s=$('#ss-subtitle'),ed=mode==='edit';
  if(document.activeElement!==t)t.textContent=data.meta.title;
  if(document.activeElement!==s)s.textContent=data.meta.subtitle||'';
  t.contentEditable=s.contentEditable=ed?'true':'false';
  s.hidden=!ed&&!data.meta.subtitle;
  document.title=data.meta.title;
  var c=$('#ss-crumbs');
  if(!path.length){c.hidden=true;c.innerHTML='';}
  else{
    var labels=pathLabels(path),h='<button class="crumb-back" data-act="back" title="Back one level (Esc)" aria-label="Back one level">'+uiIcon('back',16)+'</button><button data-act="crumb" data-arg="0">Overview</button>';
    labels.forEach(function(lb,i){h+='<span class="sep" aria-hidden="true">/</span>'+(i===labels.length-1?'<span aria-current="location">'+esc(lb)+'</span>':'<button data-act="crumb" data-arg="'+(i+1)+'">'+esc(lb)+'</button>');});
    c.innerHTML=h;c.hidden=false;
  }
  var tb='<div class="seg" role="group" aria-label="Mode"><button data-act="mode-view" aria-pressed="'+(mode==='view')+'">View</button><button data-act="mode-edit" aria-pressed="'+(mode==='edit')+'">Edit</button></div>';
  if(ed)tb+='<span class="sep"></span><button class="ib" data-act="undo" title="Undo (Ctrl+Z)" aria-label="Undo"'+(undoStack.length?'':' disabled')+'>'+uiIcon('undo')+'</button><button class="ib" data-act="redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo"'+(redoStack.length?'':' disabled')+'>'+uiIcon('redo')+'</button>';
  if(ed&&artifactCap&&!readOnly)tb+='<button class="btn" data-act="save"'+(dirty?'':' disabled')+' title="Save edits into this page">'+uiIcon('save')+'<span>Save</span>'+(dirty?'<i class="dirty-dot" aria-label="unsaved changes"></i>':'')+'</button>';
  tb+='<button class="ib" data-act="search" title="Search (/)" aria-label="Search the map">'+uiIcon('search')+'</button>';
  if(!ed)tb+='<button class="btn" data-act="tours" title="Guided tour (T)">'+uiIcon('flag')+'<span>Tour</span></button><button class="ib" data-act="present" title="Present (P)" aria-label="Present">'+uiIcon('monitor')+'</button>';
  tb+='<button class="btn" data-act="export" title="Download page or data">'+uiIcon('export')+'<span>Export</span></button>';
  tb+='<button class="ib" data-act="about" title="About this diagram and how to read it" aria-label="About this diagram">'+uiIcon('help')+'</button>'+
    '<button class="ib" data-act="info" title="Info: who made this map, and what it cost" aria-label="Map info" aria-pressed="'+infoOpen+'">'+uiIcon('info')+'</button>';
  $('#ss-topbar').innerHTML=tb;
}
function renderPalette(){
  var p=$('#ss-palette');
  if(mode!=='edit'){p.hidden=true;return;}
  p.innerHTML='<div class="pal-h">Shapes</div>'+SHAPE_ORDER.map(function(s){return '<button data-shape="'+s+'" title="'+SHAPES[s].name+' (drag or click)" aria-label="Add '+SHAPES[s].name+'">'+shapeIcon(s,26)+'</button>';}).join('')+
    '<div class="pal-hint">Space + drag to pan</div>';
  p.hidden=false;
}
function renderLevelbar(){
  var el=$('#ss-levelbar'),l=cur(),h='';
  if(path.length)h+='<button class="ib" data-act="back" title="Back one level (Esc)" aria-label="Back one level">'+uiIcon('back')+'</button>';
  if(mode==='edit'){
    var tp=levelType(l),dr=levelDir(l);
    h+='<select class="type-sel" data-field="ltype" aria-label="Diagram type" title="'+esc(TYPE_HINTS[tp])+'">'+Object.keys(TYPE_NAMES).map(function(k){return '<option value="'+k+'"'+(k===tp?' selected':'')+'>'+TYPE_NAMES[k]+'</option>';}).join('')+'</select>'+
      '<input class="cap" data-field="caption" value="'+esc(l.caption||'')+'" placeholder="One line: what is this level for?" aria-label="Level caption">'+
      (isSeq(l)?'':'<button class="ib" data-act="ldir" title="Layout direction: '+(dr==='LR'?'left to right':'top to bottom')+'" aria-label="Toggle layout direction">'+uiIcon(dr==='LR'?'dirLR':'dirTB')+'</button>'+
        '<button class="ib" data-act="lroute" title="Paths: '+ROUTE_NAMES[levelRoute(l)].toLowerCase()+' (click to change)" aria-label="Path style for this level">'+uiIcon('route-'+levelRoute(l))+'</button>')+
      '<button class="btn" data-act="tidy" title="Auto-arrange this level">'+uiIcon('tidy')+'<span>Tidy</span></button>';
  }else{
    h+='<span class="type-badge" title="'+esc(TYPE_HINTS[levelType(l)])+'">'+TYPE_NAMES[levelType(l)]+'</span>';
    if(l.caption)h+='<p class="cap">'+esc(l.caption)+'</p>';
    h+=legendChips(l);
  }
  el.innerHTML=h;el.hidden=false;
}
function renderLegend(){renderAbout();}
function legendChips(l){
  var hasIn=l.nodes.some(function(n){return n.role==='input';}),hasOut=l.nodes.some(function(n){return n.role==='output';});
  var df={};l.nodes.forEach(function(n){if(DIFF_TEXT[n.diff])df[n.diff]=1;});
  var dc=Object.keys(DIFF_TEXT).filter(function(k){return df[k];}).map(function(k){return '<span><i class="sw diff-'+k+'"></i>'+DIFF_TEXT[k]+'</span>';}).join('');
  var np=l.nodes.filter(isPlanned).length,pc=np?'<span><i class="sw planned-sw"></i>'+np+' planned</span>':'';
  return (hasIn||hasOut||dc||pc)?'<span class="keys-inline">'+(hasIn?'<span><i class="sw" style="--rc:var(--in)"></i>In</span>':'')+(hasOut?'<span><i class="sw" style="--rc:var(--out)"></i>Out</span>':'')+dc+pc+'</span>':'';
}
var infoOpen=false;
function numFmt(n){return Number(n).toLocaleString('en-US');}
function fmtCost(g){var c=+g.cost,cur={USD:'$',EUR:'\u20ac',GBP:'\u00a3'}[g.currency||'USD'];return (cur||(g.currency+' '))+(c>=1?c.toFixed(2):c.toFixed(c>=.01?3:4));}
// meta.generation is written by `unfold.py usage`: what the agent session spent on this map. Unfold only displays it.
function renderInfo(){
  var el=$('#ss-info');if(!el)return;
  if(!infoOpen){el.hidden=true;return;}
  var m=data.meta,g=m.generation,rows=[];
  function row(k,v){if(v!=null&&v!=='')rows.push('<dt>'+k+'</dt><dd>'+v+'</dd>');}
  var h='<div class="in-head"><h3>About this map</h3><button class="ib" data-act="info" aria-label="Close">'+uiIcon('close',16)+'</button></div>';
  if(m.intent)row('Made to',esc(m.intent)+(m.audience?' for '+esc(m.audience):''));
  if(m.repo&&m.repo.url)row('Mapped from',esc(m.repo.url.replace(/^https?:\/\//,''))+(m.repo.commit?' @ <code>'+esc(String(m.repo.commit).slice(0,10))+'</code>':''));
  if(g){
    row('Generated',g.generated_at?esc(String(g.generated_at).slice(0,16).replace('T',' '))+(String(g.generated_at).length>10?' UTC':''):'');
    row('Agent',esc([g.agent,g.model].filter(Boolean).join(' \u00b7 ')));
    if(g.duration_s!=null)row('Time',Math.floor(g.duration_s/60)+' min '+Math.round(g.duration_s%60)+' s');
  }
  h+=rows.length?'<dl>'+rows.join('')+'</dl>':'';
  if(g&&(g.input_tokens!=null||g.output_tokens!=null||g.cost!=null)){
    var tot=['input_tokens','output_tokens','cache_read_tokens','cache_write_tokens'].reduce(function(a,k){return a+(+g[k]||0);},0);
    h+='<h4>What it cost to generate</h4><dl class="in-tok">'+
      (g.input_tokens!=null?'<dt>Input tokens</dt><dd>'+numFmt(g.input_tokens)+'</dd>':'')+(g.output_tokens!=null?'<dt>Output tokens</dt><dd>'+numFmt(g.output_tokens)+'</dd>':'')+
      (g.cache_read_tokens?'<dt>Cache reads</dt><dd>'+numFmt(g.cache_read_tokens)+'</dd>':'')+(g.cache_write_tokens?'<dt>Cache writes</dt><dd>'+numFmt(g.cache_write_tokens)+'</dd>':'')+
      '<dt>All tokens</dt><dd><b>'+numFmt(tot)+'</b></dd>'+(g.cost!=null?'<dt>Cost</dt><dd><b>'+esc(fmtCost(g))+'</b></dd>':'')+'</dl>'+
      (g.note?'<p class="muted small">'+esc(g.note)+'</p>':'')+
      '<p class="muted small">Reported by the agent session that wrote this map; Unfold does not measure it.</p>';
  }else h+='<p class="muted small">No usage recorded for this map. After generating it, run <code>unfold.py usage diagram.json --latest</code> and rebuild the page.</p>';
  el.innerHTML=h;el.hidden=false;
}
var aboutOpen=null;
function aboutKey(){return 'unfold:about:'+draftKey;}
function renderAbout(){
  var el=$('#ss-about'),m=data.meta;
  if(aboutOpen===null){var seen=false;try{seen=!!localStorage.getItem(aboutKey());}catch(e){}aboutOpen=!seen&&!!m.summary;}
  if(!aboutOpen||mode!=='view'){el.hidden=true;return;}
  var g=Array.isArray(m.glossary)?m.glossary.slice(0,8):[];
  el.innerHTML='<p class="ab-sum">'+esc(m.summary||m.subtitle||'')+'</p>'+
    '<ul class="ab-tips"><li>'+uiIcon('open',15)+'Click a part to open it</li><li>'+uiIcon('arrowR',15)+'Hover to trace its data</li><li>'+uiIcon('back',15)+'Esc or zoom out to go back</li></ul>'+
    (g.length?'<dl class="ab-glos">'+g.map(function(x){return '<div><dt>'+esc(x.term)+'</dt><dd>'+esc(x.def)+'</dd></div>';}).join('')+'</dl>':'')+
    '<div class="ab-foot">'+(data.meta.intent==='learn'||(data.meta.tours||[]).length?'<button class="btn solid" data-act="tour-start">'+uiIcon('flag',16)+'Start the tour</button><button class="btn" data-act="about-close">Explore</button>':'<button class="btn solid" data-act="about-close">Got it</button>')+'<button class="btn" data-act="help">All shortcuts</button></div>';
  el.hidden=false;
}
function renderChrome(){renderInfo();renderHeader();renderPalette();renderLevelbar();renderLegend();}
function renderAll(){renderScene();renderChrome();renderToolbar();renderCard();}

