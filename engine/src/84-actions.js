/* ================= actions ================= */
function onClick(e){
  var b=e.target.closest&&e.target.closest('[data-act]');
  if(infoOpen&&!(e.target.closest&&e.target.closest('#ss-info,[data-act="info"]'))){infoOpen=false;renderInfo();renderHeader();}
  if(!b){if(e.target.id==='ss-modal')closeModal();return;}
  if(b.disabled)return;
  var a=b.dataset.act,arg=b.dataset.arg,l=cur(),one=sel.nodes.length===1?findNode(sel.nodes[0]):null;
  switch(a){
    case 'mode-view':setMode('view');break;
    case 'mode-edit':setMode('edit');break;
    case 'export':openExport();break;
    case 'help':openHelp();break;
    case 'save':saveToPage();break;
    case 'back':goToPath(path.slice(0,-1));break;
    case 'crumb':goToPath(path.slice(0,+arg));break;
    case 'zin':animateCam(scaleBox(cam,.75),220);break;
    case 'zout':animateCam(scaleBox(cam,1.33),220);break;
    case 'fit':fitView();break;
    case 'close-card':detailId=null;renderCard();break;
    case 'open-node':detailId=null;renderCard();goToPath(path.concat([arg]));break;
    case 'undo':undo();break;
    case 'redo':redo();break;
    case 'pop':pop=pop===arg?null:arg;renderToolbar();break;
    case 'set-shape':if(one)commit(function(){var s=SHAPES[arg];one.shape=arg;one.w=s.w;one.h=s.h;if(arg==='rounded'&&!one.icon)one.icon='box';pop=null;});break;
    case 'set-color':commit(function(){
      if(sel.group){var g=l.groups.find(function(x){return x.id===sel.group;});if(g)g.color=arg;}
      else sel.nodes.forEach(function(id){var n=findNode(id);if(n)n.color=arg;});pop=null;});break;
    case 'set-icon':if(one)commit(function(){if(arg)one.icon=arg;else delete one.icon;pop=null;});break;
    case 'set-size':if(one)commit(function(){one.text=Object.assign({},one.text||{},{size:arg});if(arg==='m')delete one.text.size;if(!Object.keys(one.text).length)delete one.text;pop=null;});break;
    case 'bold':case 'italic':if(one)commit(function(){var tx=Object.assign({},one.text||{});if(tx[a])delete tx[a];else tx[a]=true;if(Object.keys(tx).length)one.text=tx;else delete one.text;});break;
    case 'tag-toggle':if(one)commit(function(){if(arg==='input'||arg==='output'){if(one.role===arg)delete one.role;else one.role=arg;}else{var t=cleanTags((one.tags||[]).concat([arg])),had=(one.tags||[]).some(function(x){return x.toLowerCase()===arg.toLowerCase();});one.tags=had?(one.tags||[]).filter(function(x){return x.toLowerCase()!==arg.toLowerCase();}):t;if(!one.tags.length)delete one.tags;}});break;
    case 'tag-del':if(one)commit(function(){one.tags=(one.tags||[]).filter(function(x){return x!==arg;});if(!one.tags.length)delete one.tags;});break;
    case 'tag-add':addTagFromInput();break;
    case 'role':if(one)commit(function(){if(one.role===arg)delete one.role;else one.role=arg;});break;
    case 'open-inner':if(one){pop=null;goToPath(path.concat([one.id]));}break;
    case 'create-inner':if(one)createInner(one.id,arg);break;
    case 'unnest':if(one)unnest(one.id);break;
    case 'drop-inner':if(one&&confirm('Remove the inner diagram of \u201c'+one.label+'\u201d and everything in it?'))commit(function(){delete one.children;pop=null;});break;
    case 'nest-sel':nestNodes(sel.nodes.slice());break;
    case 'nest-group':var gid=sel.group;nestNodes(l.nodes.filter(function(n){return n.group===gid;}).map(function(n){return n.id;}));break;
    case 'group':groupSel();break;
    case 'ungroup':ungroup();break;
    case 'glabel':startInline('group',sel.group);break;
    case 'dup':duplicate();break;
    case 'del':deleteSel();break;
    case 'estyle':commit(function(){var ed=l.edges[sel.edge];if(arg===defStyle(l))delete ed.style;else ed.style=arg;});break;
    case 'earrow':commit(function(){var ed=l.edges[sel.edge];if(arg===defArrow(l))delete ed.arrow;else ed.arrow=arg;});break;
    case 'emove':commit(function(){var i=sel.edge,j=i+(+arg);if(j<0||j>=l.edges.length)return;var t=l.edges[i];l.edges[i]=l.edges[j];l.edges[j]=t;sel.edge=j;});break;
    case 'upload-media':pendingMedia={id:sel.nodes[0]};$('#ss-file').click();break;
    case 'media-del':if(one)commit(function(){var ml=mediaList(one);ml.splice(+arg,1);setMedia(one,ml);});break;
    case 'media-view':if(one)openMedia(one,+arg);break;
    case 'media-url':var mu=$('#ss-murl'),uv=mu&&mu.value.trim();if(one&&uv)commit(function(){setMedia(one,mediaList(one).concat([{src:uv}]));});break;
    case 'media-step':stepMedia(+arg);break;
    case 'link':if(one)startLink(one.id);break;
    case 'eroute':commit(function(){var ed=l.edges[sel.edge];if(arg===levelRoute(l))delete ed.route;else ed.route=arg;});break;
    case 'set-rel':commit(function(){var ed=l.edges[sel.edge];if(arg)ed.rel=arg;else delete ed.rel;pop=null;});break;
    case 'ereset':commit(function(){var ed=l.edges[sel.edge];delete ed.points;delete ed.labelT;delete ed.fromSide;delete ed.toSide;});break;
    case 'eside':commit(function(){var ed=l.edges[sel.edge],pr=arg.split(':'),k=pr[0]+'Side';if(pr[1])ed[k]=pr[1];else delete ed[k];});break;
    case 'lroute':commit(function(){var o=['curved','orthogonal','straight'],nx=o[(o.indexOf(levelRoute(l))+1)%3];delete l.route;if(levelRoute(l)!==nx)l.route=nx;});toast('Paths on this level: '+ROUTE_NAMES[levelRoute(l)].toLowerCase()+'.');break;
    case 'info':infoOpen=!infoOpen;renderInfo();renderHeader();break;
    case 'about':aboutOpen=!aboutOpen||mode!=='view';if(mode!=='view')setMode('view');renderAbout();fitView(420);break;
    case 'about-close':aboutOpen=false;try{localStorage.setItem(aboutKey(),'1');}catch(err){}renderAbout();fitView(420);break;
    case 'close-media':closeMedia();break;
    case 'view-media':var vm=findNode(arg);if(vm)openMedia(vm,+(b.dataset.i||0));break;
    case 'ereverse':commit(function(){var ed=l.edges[sel.edge],f=ed.from;ed.from=ed.to;ed.to=f;});break;
    case 'elabel':startInline('edge',sel.edge);break;
    case 'ltype':commit(function(){l.type=arg;});break;
    case 'ldir':commit(function(){l.direction=levelDir(l)==='LR'?'TB':'LR';});break;
    case 'tidy':tidy();break;
    case 'close-modal':closeModal();break;
    case 'dl-html':download(slug(data.meta.title)+'.html',buildDocument());break;
    case 'dl-json':download(slug(data.meta.title)+'.json',JSON.stringify(data,null,2));break;
    case 'dl-sub-html':download(subName(path)+'.html',buildDocument(subtreeData(path)));break;
    case 'dl-sub-json':download(subName(path)+'.json',JSON.stringify(subtreeData(path),null,2));break;
    case 'dl-sub-docs':download(subName(path)+'-docs.md',docsMarkdown(path.slice()));break;
    case 'dl-sub-pdf':closeModal();printAll(path.slice());break;
    case 'dl-sub-mermaid':download(subName(path)+'-mermaid.md',mermaidAll(path.slice()));break;
    case 'dl-docs':download(slug(data.meta.title)+'-docs.md',docsMarkdown([]));break;
    case 'copy-json':copyText(JSON.stringify(data,null,2));break;
    case 'apply-json':applyJSON();break;
    case 'discard-draft':discardDraft();break;
    case 'search':openSearch();break;
    case 'ex-png':exportPNG();break;
    case 'ex-svg':exportSVG();break;
    case 'ex-pdf':closeModal();printAll([]);break;
    case 'ex-readme':readmeSnippet();break;
    case 'ex-mermaid':download(slug(data.meta.title)+'.md',mermaidAll([]));break;
    case 'ex-drawio':download(slug(data.meta.title)+'.drawio',drawioAll());break;
    case 'ex-excalidraw':download(levelName()+'.excalidraw',excalidrawLevel(cur()));break;
    case 'ex-import':importMermaid();break;
    case 'tours':openTours();break;
    case 'tour-start':aboutOpen=false;try{localStorage.setItem(aboutKey(),'1');}catch(err){}startTour(+(arg||0),false);break;
    case 'tour-present':closeModal();startTour(+(arg||0),true);break;
    case 'tour-go':closeModal();startTour(+(arg||0),false);break;
    case 'present':startTour(0,true);break;
    case 'tour-step':stepTour(+arg);break;
    case 'tour-end':endTour();break;
    case 'notes':openNotes();break;
  }
}

