/* ================= floating toolbar ================= */
function popGrid(items,cols,size){return '<div class="pop-grid" style="grid-template-columns:repeat('+cols+','+size+'px)">'+items+'</div>';}
function renderToolbar(){
  var t=$('#ss-ftb');
  if(mode!=='edit'||!hasSel()||busy||inlineEd){t.hidden=true;t.innerHTML='';return;}
  var l=cur(),h='',p='';
  if(sel.nodes.length===1){
    var n=findNode(sel.nodes[0]);if(!n){sel.nodes=[];t.hidden=true;return;}
    var tx=n.text||{};
    h+='<button class="ib" data-act="pop" data-arg="shape" title="Shape" aria-label="Change shape">'+shapeIcon(n.shape,22)+'</button>'+
      '<button class="ib" data-act="pop" data-arg="color" title="Colour" aria-label="Change colour"><i class="swatch" style="--nc:'+colorVar(n.color)+'"></i></button>'+
      '<button class="ib" data-act="pop" data-arg="icon" title="Icon" aria-label="Change icon">'+(n.icon&&ICONS[n.icon]?uiIcon(n.icon):'<b>'+esc(n.icon||'\u2205')+'</b>')+'</button>'+
      '<span class="sep"></span>'+
      '<button class="tb-txt" data-act="pop" data-arg="tags" aria-pressed="'+(badged(n))+'" title="Tags: input, output, planned, or your own">'+uiIcon('tag',16)+'Tags'+((n.tags||[]).length+(n.role?1:0)?' <b class="tb-n">'+((n.tags||[]).length+(n.role?1:0))+'</b>':'')+uiIcon('chev',14)+'</button>'+
      '<span class="sep"></span>'+
      '<button class="ib" data-act="pop" data-arg="size" title="Text size" aria-label="Text size">'+uiIcon('textsize')+'</button>'+
      '<button class="ib" data-act="bold" aria-pressed="'+(!!tx.bold)+'" title="Bold" aria-label="Bold">'+uiIcon('bold')+'</button>'+
      '<button class="ib" data-act="italic" aria-pressed="'+(!!tx.italic)+'" title="Italic" aria-label="Italic">'+uiIcon('italic')+'</button>'+
      '<span class="sep"></span>'+
      '<button class="ib" data-act="link" title="Link to another node: click it next (or drag a blue dot)" aria-label="Link to another node">'+uiIcon('link')+'</button>'+
      '<button class="ib" data-act="pop" data-arg="media" title="Images and videos" aria-label="Images and videos"'+(mediaList(n).length?' aria-pressed="true"':'')+'>'+uiIcon('image')+'</button>'+
      '<button class="tb-txt" data-act="pop" data-arg="nest" title="Inner diagram">'+uiIcon('nest',16)+(n.children?'Inside':'Nest')+uiIcon('chev',14)+'</button>'+
      '<button class="ib" data-act="pop" data-arg="details" title="Notes, source files, tag" aria-label="Details">'+uiIcon('info')+'</button>'+
      '<button class="ib" data-act="dup" title="Duplicate (Ctrl+D)" aria-label="Duplicate">'+uiIcon('copy')+'</button>'+
      '<button class="ib tb-danger" data-act="del" title="Delete (Del)" aria-label="Delete">'+uiIcon('trash')+'</button>';
    if(pop==='shape')p=popGrid(SHAPE_ORDER.map(function(s){return '<button data-act="set-shape" data-arg="'+s+'" title="'+SHAPES[s].name+'" aria-pressed="'+(n.shape===s)+'" style="width:40px;height:38px">'+shapeIcon(s,26)+'</button>';}).join(''),6,40);
    if(pop==='color')p=colorPop(n.color);
    if(pop==='icon')p=popGrid('<button data-act="set-icon" data-arg="" title="No icon" style="width:30px;height:30px" aria-pressed="'+(!n.icon)+'">\u2205</button>'+Object.keys(ICONS).map(function(k){return '<button data-act="set-icon" data-arg="'+k+'" title="'+k+'" aria-pressed="'+(n.icon===k)+'" style="width:30px;height:30px">'+uiIcon(k,18)+'</button>';}).join(''),8,30)+
      '<label style="margin:8px 0 0">Or an emoji / letters<input data-field="icon" value="'+esc(n.icon&&!ICONS[n.icon]?n.icon:'')+'" maxlength="4"></label>';
    if(pop==='size')p='<div class="seg" role="group" aria-label="Text size">'+['s','m','l'].map(function(z){return '<button data-act="set-size" data-arg="'+z+'" aria-pressed="'+((tx.size||'m')===z)+'">'+{s:'Small',m:'Medium',l:'Large'}[z]+'</button>';}).join('')+'</div>';
    if(pop==='tags'){
      var have=(n.tags||[]).map(function(x){return x.toLowerCase();}),cur_=[];
      if(n.role)cur_.push('<span class="chip on role-'+n.role+'">'+(n.role==='input'?'Input':'Output')+'<button data-act="tag-toggle" data-arg="'+n.role+'" aria-label="Remove '+n.role+'">'+uiIcon('close',12)+'</button></span>');
      (n.tags||[]).forEach(function(t){cur_.push('<span class="chip on">'+esc(t)+'<button data-act="tag-del" data-arg="'+esc(t)+'" aria-label="Remove '+esc(t)+'">'+uiIcon('close',12)+'</button></span>');});
      var sug=['input','output'].concat(TAG_SUGGEST).filter(function(t){return t==='input'||t==='output'?n.role!==t:have.indexOf(t)<0;});
      p='<div class="tag-pop" style="width:280px"><div class="chips">'+(cur_.join('')||'<span class="muted small">No tags yet.</span>')+'</div>'+
        '<div class="pal-h">Suggested</div><div class="chips">'+sug.map(function(t){return '<button class="chip" data-act="tag-toggle" data-arg="'+esc(t)+'">+ '+(t==='input'?'Input':t==='output'?'Output':esc(t))+'</button>';}).join('')+'</div>'+
        '<div class="row m-url"><input id="ss-tagin" maxlength="24" placeholder="Custom tag, then Enter" aria-label="Custom tag"><button class="btn" data-act="tag-add">Add</button></div></div>';
    }
    if(pop==='nest'){
      p='<div class="menu">'+(n.children?
        '<button data-act="open-inner">'+uiIcon('open')+'<span>Open inner diagram<small>'+(n.children.nodes.length)+' nodes, '+levelType(n.children)+'</small></span></button>'+
        '<button data-act="unnest">'+uiIcon('ungroup')+'<span>Expand here<small>Replace this node with what is inside</small></span></button>'+
        '<button data-act="drop-inner" class="tb-danger">'+uiIcon('trash')+'<span>Remove inner diagram</span></button>':
        '<button data-act="create-inner" data-arg="architecture">'+uiIcon('nest')+'<span>Nest an architecture diagram<small>Parts that work together</small></span></button>'+
        '<button data-act="create-inner" data-arg="process">'+uiIcon('nest')+'<span>Nest a process diagram<small>Steps and decisions in order</small></span></button>')+'</div>';
    }
    if(pop==='details')p='<div style="width:300px"><label>Note <small>shown when someone clicks it</small><textarea data-field="note" rows="3">'+esc(n.note||'')+'</textarea></label>'+
      '<label>Source <small>files or symbols, one per line</small><textarea class="mono" data-field="source" rows="3" spellcheck="false">'+esc((n.source||[]).join('\n'))+'</textarea></label>'+
      (n.shape==='table'||n.shape==='class'?'<label>'+(n.shape==='class'?'Attributes':'Fields')+' <small>one per line, e.g. '+(n.shape==='class'?'- items: list[Item]':'id: int PK')+'</small><textarea class="mono" data-field="fields" rows="4" spellcheck="false">'+esc((n.fields||[]).join('\n'))+'</textarea></label>':'')+
      (n.shape==='class'?'<label>Methods <small>one per line, e.g. + total(): Money</small><textarea class="mono" data-field="methods" rows="3" spellcheck="false">'+esc((n.methods||[]).join('\n'))+'</textarea></label><label>Stereotype <small>e.g. interface, abstract</small><input data-field="stereotype" value="'+esc(n.stereotype||'')+'"></label>':'')+
      (levelType(l)==='behaviour'?'<label>Behaviour <small>how this node runs</small><select data-field="bt">'+['','sequence','selector','parallel','decorator','action','condition'].map(function(k){return '<option value="'+k+'"'+((n.bt||'')===k?' selected':'')+'>'+(k?k.charAt(0).toUpperCase()+k.slice(1):'\u2014')+'</option>';}).join('')+'</select></label>':'')+
      (levelType(l)==='timeline'?'<label>Date <small>shown on the axis, e.g. 2026-10 or v0.4</small><input data-field="date" value="'+esc(n.date||'')+'"></label>':'')+
      '<label style="margin:0">Technology <small>shown under the label, e.g. Python, ROS 2</small><input data-field="tech" value="'+esc(n.tech||'')+'"></label>'+
      '</div>';
    if(pop==='media'){
      var ml=mediaList(n);
      p='<div class="media-pop" style="width:300px">'+(ml.length?'<ul class="m-list">'+ml.map(function(m,i){var t=mediaType(m),th=t==='image'?m.src:m.poster;
          return '<li>'+(th?'<img src="'+esc(th)+'" alt="">':'<span class="m-ph">'+uiIcon(t==='image'?'image':'play',16)+'</span>')+
            '<input data-field="media.caption.'+i+'" value="'+esc(m.caption||'')+'" placeholder="Caption" aria-label="Caption for item '+(i+1)+'">'+
            '<button class="ib" data-act="media-view" data-arg="'+i+'" title="Preview" aria-label="Preview">'+uiIcon('play',16)+'</button>'+
            '<button class="ib tb-danger" data-act="media-del" data-arg="'+i+'" title="Remove" aria-label="Remove">'+uiIcon('trash',16)+'</button></li>';}).join('')+'</ul>':
          '<p class="m-empty">Attach screenshots, short videos or an embed (YouTube, Vimeo) to show this part working.</p>')+
        '<div class="row"><button class="btn solid" data-act="upload-media">'+uiIcon('image',16)+'Upload</button></div>'+
        '<div class="row m-url"><input id="ss-murl" placeholder="Or paste an image, video or embed URL" aria-label="Media URL"><button class="btn" data-act="media-url">Add</button></div>'+
        '<p class="m-hint">You can also drop files straight onto the node. Viewers open them from its \u25b6 badge.</p></div>';
    }
  }else if(sel.nodes.length>1){
    var grouped=sel.nodes.every(function(id){var x=findNode(id);return x&&x.group&&x.group===findNode(sel.nodes[0]).group;});
    h+='<span class="tb-txt" style="cursor:default">'+sel.nodes.length+' selected</span><span class="sep"></span>'+
      '<button class="ib" data-act="pop" data-arg="color" title="Colour" aria-label="Change colour"><i class="swatch" style="--nc:var(--c-neutral)"></i></button>'+
      '<button class="tb-txt" data-act="nest-sel" title="Collapse into one module with an inner diagram (Ctrl+E)">'+uiIcon('nest',16)+'Nest</button>'+
      (grouped?'<button class="tb-txt" data-act="ungroup" title="Ungroup">'+uiIcon('ungroup',16)+'Ungroup</button>':'<button class="tb-txt" data-act="group" title="Draw a labelled group around them (Ctrl+G)">'+uiIcon('group',16)+'Group</button>')+
      '<button class="ib" data-act="dup" title="Duplicate (Ctrl+D)" aria-label="Duplicate">'+uiIcon('copy')+'</button>'+
      '<button class="ib tb-danger" data-act="del" title="Delete (Del)" aria-label="Delete">'+uiIcon('trash')+'</button>';
    if(pop==='color')p=colorPop(null);
  }else if(sel.edge!=null){
    var e=l.edges[sel.edge];if(!e){sel.edge=null;t.hidden=true;return;}
    var stl=e.style||defStyle(l),ar=e.arrow||defArrow(l);
    if(isSeq(l))h+='<button class="ib" data-act="emove" data-arg="-1" title="Earlier in the sequence" aria-label="Move message earlier"'+(sel.edge===0?' disabled':'')+'>'+uiIcon('up')+'</button><button class="ib" data-act="emove" data-arg="1" title="Later in the sequence" aria-label="Move message later"'+(sel.edge===l.edges.length-1?' disabled':'')+'>'+uiIcon('down')+'</button><span class="sep"></span>';
    h+='<button class="ib" data-act="estyle" data-arg="flow" aria-pressed="'+(stl==='flow')+'" title="Moving: data flows along it" aria-label="Moving line">'+uiIcon('lineFlow')+'</button>'+
      '<button class="ib" data-act="estyle" data-arg="solid" aria-pressed="'+(stl==='solid')+'" title="Solid: dependency or call" aria-label="Solid line">'+uiIcon('lineSolid')+'</button>'+
      '<button class="ib" data-act="estyle" data-arg="dashed" aria-pressed="'+(stl==='dashed')+'" title="Dotted: optional, fallback, async" aria-label="Dotted line">'+uiIcon('lineDot')+'</button><span class="sep"></span>'+
      '<button class="ib" data-act="earrow" data-arg="end" aria-pressed="'+(ar==='end')+'" title="Arrow at end" aria-label="Arrow at end">'+uiIcon('arrowR')+'</button>'+
      '<button class="ib" data-act="earrow" data-arg="both" aria-pressed="'+(ar==='both')+'" title="Arrows both ways" aria-label="Arrows both ways">'+uiIcon('arrowB')+'</button>'+
      '<button class="ib" data-act="earrow" data-arg="none" aria-pressed="'+(ar==='none')+'" title="No arrow" aria-label="No arrow">'+uiIcon('arrowN')+'</button><span class="sep"></span>'+
      (isSeq(l)?'':['curved','orthogonal','straight'].map(function(r){return '<button class="ib" data-act="eroute" data-arg="'+r+'" aria-pressed="'+(edgeRoute(e,l)===r)+'" title="'+ROUTE_NAMES[r]+' path" aria-label="'+ROUTE_NAMES[r]+' path">'+uiIcon('route-'+r)+'</button>';}).join('')+
        '<button class="tb-txt" data-act="pop" data-arg="ends" title="Which side of each box the link attaches to (or drag the end dots)">Ends'+uiIcon('chev',14)+'</button>'+
        (e.points&&e.points.length||e.labelT!=null||e.fromSide||e.toSide?'<button class="tb-txt" data-act="ereset" title="Back to automatic bends, label position and ends">Reset</button>':'')+'<span class="sep"></span>')+
      (levelType(l)==='class'||e.rel?'<button class="tb-txt" data-act="pop" data-arg="rel" title="UML relation">'+(e.rel?e.rel.charAt(0).toUpperCase()+e.rel.slice(1):'Relation')+uiIcon('chev',14)+'</button>':'')+
      '<button class="tb-txt" data-act="elabel" title="Edit label (double-click)">Label</button>'+
      '<button class="ib" data-act="ereverse" title="Reverse direction" aria-label="Reverse">'+uiIcon('reverse')+'</button>'+
      '<button class="ib tb-danger" data-act="del" title="Delete (Del)" aria-label="Delete">'+uiIcon('trash')+'</button>';
    if(pop==='ends'){
      // each end picks one of the box's eight anchors, laid out like the box itself; the middle is automatic
      var GRID=['tl','t','tr','l','','r','bl','b','br'];
      p='<div class="ends-pop">'+[['from','Starts at',e.fromSide],['to','Ends at',e.toSide]].map(function(r){
        return '<div class="ends-row"><span>'+r[1]+'</span><div class="anchors" role="group" aria-label="'+r[1]+'">'+GRID.map(function(k){return '<button data-act="eside" data-arg="'+r[0]+':'+k+'" class="'+(k?'a-'+k:'a-auto')+'" aria-pressed="'+((r[2]||'')===k)+'" title="'+(k?ANCHOR_NAMES[k]:'Automatic')+'" aria-label="'+(k?ANCHOR_NAMES[k]:'Automatic')+'"><i></i></button>';}).join('')+'</div></div>';}).join('')+'</div>';
    }
    if(pop==='rel')p='<div class="menu">'+['','inherits','implements','composition','aggregation','association','dependency'].map(function(k){return '<button data-act="set-rel" data-arg="'+k+'" aria-pressed="'+((e.rel||'')===k)+'"><span>'+(k?k.charAt(0).toUpperCase()+k.slice(1):'None')+'<small>'+({'':'A plain link',inherits:'Child \u2192 parent class',implements:'Class \u2192 interface',composition:'Owner \u25c6\u2192 part that lives and dies with it',aggregation:'Owner \u25c7\u2192 part that can exist alone',association:'Holds a reference',dependency:'Uses it for a while'}[k])+'</small></span></button>';}).join('')+'</div>';
  }else if(sel.group){
    var g=l.groups.find(function(x){return x.id===sel.group;});if(!g){sel.group=null;t.hidden=true;return;}
    h+='<button class="tb-txt" data-act="glabel" title="Rename (double-click)">Rename</button>'+
      '<button class="ib" data-act="pop" data-arg="color" title="Colour" aria-label="Change colour"><i class="swatch" style="--nc:'+colorVar(g.color||'slate')+'"></i></button>'+
      '<button class="tb-txt" data-act="nest-group" title="Collapse the group into one module">'+uiIcon('nest',16)+'Nest</button>'+
      '<button class="tb-txt" data-act="ungroup" title="Remove the group, keep its nodes">'+uiIcon('ungroup',16)+'Ungroup</button>';
    if(pop==='color')p=colorPop(g.color||'slate');
  }
  t.innerHTML=h+(p?'<div class="pop" id="ss-pop">'+p+'</div>':'');
  t.hidden=false;
  placeOverlays();
}
function colorPop(cur){return popGrid(COLORS.map(function(c){return '<button data-act="set-color" data-arg="'+c+'" title="'+c+'" aria-label="'+c+'" aria-pressed="'+(cur===c)+'" style="width:32px;height:32px"><i class="swatch" style="--nc:var(--c-'+c+');width:20px;height:20px"></i></button>';}).join(''),7,32);}
function selBox(){
  var l=cur();
  if(sel.nodes.length){var x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;sel.nodes.forEach(function(id){var n=findNode(id);if(!n)return;var b=nodeBox(n);x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h);});return x0===Infinity?null:{x:x0,y:y0,w:x1-x0,h:y1-y0};}
  if(sel.edge!=null){var e=l.edges[sel.edge],g=e&&(isSeq(l)?seqGeom(e,sel.edge,l):edgeGeom(e,l));if(!g)return null;var lq=labelXY(e,g);return {x:lq.x-1,y:lq.y-12,w:2,h:24};}
  if(sel.group){var gr=l.groups.find(function(x){return x.id===sel.group;});return gr?groupBox(gr,l):null;}
  return null;
}
function placeOverlays(){
  var t=$('#ss-ftb');
  if(t&&!t.hidden){
    var b=selBox();
    if(!b){t.hidden=true;}
    else{
      var a=toScreen(b.x,b.y),z=toScreen(b.x+b.w,b.y+b.h),app=$('#app').getBoundingClientRect();
      var tw=t.offsetWidth,th=t.offsetHeight,x=(a.x+z.x)/2-tw/2,y=a.y-th-12,below=false;
      if(y<70){y=z.y+12;below=true;}
      x=clamp(x,8,app.width-tw-8);y=clamp(y,8,app.height-th-8);
      t.style.left=x+'px';t.style.top=y+'px';
      var pp=$('#ss-pop');
      if(pp){pp.classList.toggle('up',!below&&y+th+pp.offsetHeight+20>app.height);pp.style.left=Math.max(0,Math.min(tw-pp.offsetWidth,0))+'px';}
    }
  }
  placeCard();
  if(inlineEd)placeInline();
}

