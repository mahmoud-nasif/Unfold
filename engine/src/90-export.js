/* ================= export to images and other tools ================= */
// every level at or below `from` (default: the whole map), each with its full path and the labels below `from`
function allLevels(from){from=from||[];var out=[];(function walk(l,p,cr){out.push({path:p,l:l,crumbs:cr});l.nodes.forEach(function(n){if(hasInner(n))walk(n.children,p.concat([n.id]),cr.concat([n.label]));});})(levelAt(from),from,[]);return out;}
function trailOf(v,from){return (from&&from.length?[pathLabels(from).slice(-1)[0]]:['Overview']).concat(v.crumbs);}
// the map as a page of its own, rooted at one level: that level, everything inside it, and the tours that stay within it
function subtreeData(p){
  var d=clone(data);if(!p||!p.length)return d;
  var labels=pathLabels(p),parent=findNode(p[p.length-1],levelAt(p.slice(0,-1))),lv=levelAt(p);
  d.root=clone(lv);
  d.meta.subtitle='Part of '+data.meta.title+': '+['Overview'].concat(labels.slice(0,-1)).join(' / ');
  d.meta.title=labels.join(' / ');
  d.meta.summary=(parent&&parent.note)||lv.caption||data.meta.summary||'';
  var k=p.length;
  d.meta.tours=(data.meta.tours||[]).map(function(t){
    var steps=(t.steps||[]).filter(function(st){var sp=st.path||[];return sp.length>=k&&p.every(function(id,i){return sp[i]===id;});}).map(function(st){return Object.assign({},st,{path:(st.path||[]).slice(k)});});
    return steps.length?Object.assign({},t,{steps:steps}):null;
  }).filter(Boolean);
  if(!d.meta.tours.length)delete d.meta.tours;
  return d;
}
function subName(p){return slug(data.meta.title)+(p.length?'-'+slug(pathLabels(p).slice(-1)[0]):'');}
// draw any level as the viewer sees it, without changing what is on screen
function withLevel(p,fn){
  var keep={path:path,mode:mode,sel:sel,traceId:traceId};
  path=p;mode='view';sel={nodes:[],edge:null,group:null};traceId=null;
  try{return fn(levelAt(p));}finally{path=keep.path;mode=keep.mode;sel=keep.sel;traceId=keep.traceId;}
}
function sceneMarkup(l,flat){
  var s=flat?'':frameMarkup(l);
  if(isSeq(l)){var bt=seqBottom(l);l.nodes.forEach(function(n){s+='<line class="lifeline" style="--nc:'+colorVar(n.color)+'" x1="'+n.x+'" x2="'+n.x+'" y1="'+(n.y+nh(n)/2)+'" y2="'+bt+'"/>';});}
  l.groups.forEach(function(g){s+=groupMarkup(g,l);});
  s+=timelineMarkup(l);
  // a selected link is drawn last, so its label stays reachable where bundled links share a trunk
  l.edges.map(function(e,i){return i;}).sort(function(a,b){return (a===sel.edge)-(b===sel.edge)||a-b;}).forEach(function(i){s+=edgeMarkup(l.edges[i],i,l);});
  l.nodes.forEach(function(n){s+=nodeMarkup(n,l);});
  return s;
}
function levelSVG(p){
  return withLevel(p,function(l){
    var b=contentBox(l),P=32,x=b.x-P,y=b.y-P,w=b.w+2*P,h=b.h+2*P,css=document.getElementById('ss-css').textContent;
    return '<svg xmlns="'+NS+'" viewBox="'+x+' '+y+' '+w+' '+h+'" width="'+Math.round(w)+'" height="'+Math.round(h)+'" font-family="Hanken Grotesk, ui-sans-serif, system-ui, sans-serif">'+
      '<style>'+css+'\n.edge.flow .line{animation:none}</style>'+svg.querySelector('defs').outerHTML+
      '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="var(--paper)"/><g id="ss-scene">'+sceneMarkup(l,true)+'</g></svg>';
  });
}
function svgToPng(text,scale){
  return new Promise(function(res,rej){
    var img=new Image();
    img.onload=function(){var c=document.createElement('canvas');c.width=Math.ceil(img.width*scale);c.height=Math.ceil(img.height*scale);var g=c.getContext('2d');g.scale(scale,scale);g.drawImage(img,0,0);c.toBlob(function(bl){bl?res(bl):rej(new Error('PNG failed'));},'image/png');};
    img.onerror=function(){rej(new Error('The image could not be drawn'));};
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text);
  });
}
function downloadBlob(filename,blob){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);}
function levelName(){var lb=pathLabels(path);return slug(data.meta.title)+(lb.length?'-'+slug(lb[lb.length-1]):'');}
function exportSVG(){download(levelName()+'.svg',levelSVG(path.slice()));}
function exportPNG(){svgToPng(levelSVG(path.slice()),2).then(function(b){downloadBlob(levelName()+'.png',b);toast('Saved '+levelName()+'.png');}).catch(function(e){toast(e.message);});}
// one printed page per level, so "Save as PDF" in the print dialog gives the whole map
function printAll(from){
  var box=document.getElementById('ss-print');if(box)box.remove();
  box=document.createElement('div');box.id='ss-print';
  box.innerHTML=allLevels(from).map(function(v){
    return '<section><h2>'+esc(trailOf(v,from).join(' / '))+'</h2>'+(v.l.caption?'<p>'+esc(v.l.caption)+'</p>':'')+levelSVG(v.path).replace(/ width="\d+" height="\d+"/,'')+'</section>';
  }).join('');
  document.body.appendChild(box);
  var done=function(){box.remove();window.removeEventListener('afterprint',done);};window.addEventListener('afterprint',done);
  setTimeout(function(){window.print();},60);
}
function readmeSnippet(){
  var name=levelName();download(name+'.svg',levelSVG(path.slice()));
  var md='[![' + data.meta.title.replace(/[\[\]]/g,'') + '](docs/'+name+'.svg)](docs/'+slug(data.meta.title)+'.html)';
  copyText(md).then(function(){toast('Copied a README snippet. Put '+name+'.svg and the exported page in docs/.');});
}

/* ---- technical documentation (Markdown) for one level and everything inside it ---- */
function mdc(t){return String(t==null?'':t).replace(/\|/g,'\\|').replace(/\s*\n\s*/g,' ').trim();}
function ghAnchor(t){return String(t).toLowerCase().replace(/[^\w\- ]+/g,'').trim().replace(/ /g,'-');}
function docsMarkdown(from){
  from=from||[];
  var m=data.meta,labels=pathLabels(from),head=from.length?labels[labels.length-1]:m.title,lvAll=allLevels(from);
  var parent=from.length?findNode(from[from.length-1],levelAt(from.slice(0,-1))):null,rootL=levelAt(from);
  // numbered sections first, so a component can link to the section of its inner diagram
  var secs=[],used={},bySec={},counts={},nums={};
  lvAll.forEach(function(v){
    var depth=v.crumbs.length,name=depth?v.crumbs[depth-1]:(from.length?head:'Overview'),num='1';
    if(depth){var pk=v.path.slice(0,-1).join('/');counts[pk]=(counts[pk]||0)+1;num=nums[pk]+'.'+counts[pk];}
    nums[v.path.join('/')]=num;
    var a=ghAnchor(num+' '+name),c=used[a]=(used[a]||0)+1;if(c>1)a+='-'+(c-1);
    var sec={v:v,name:name,num:num,depth:depth,anchor:a};secs.push(sec);bySec[v.path.join('/')]=sec;
  });
  var out=['# '+head+' \u2014 technical documentation',''];
  var intro=(parent&&parent.note)||(!from.length&&m.summary)||rootL.caption||'';
  if(intro)out.push('> '+String(intro).replace(/\n/g,' '),'');
  var meta=[];if(from.length)meta.push('Part of **'+mdc(m.title)+'** ('+['Overview'].concat(labels.slice(0,-1)).join(' \u203a ')+')');
  if(m.repo&&m.repo.url)meta.push('Mapped from '+m.repo.url+(m.repo.commit?' at `'+String(m.repo.commit).slice(0,10)+'`':''));
  meta.push('Generated from an unfold map on '+new Date().toISOString().slice(0,10));
  out.push('_'+meta.join('. ')+'._','');
  if(secs.length>1){out.push('## Contents','');secs.forEach(function(x){out.push('  '.repeat(x.depth)+'- ['+x.num+' '+x.name+'](#'+x.anchor+')');});out.push('');}
  secs.forEach(function(x){
    var l=x.v.l,t=levelType(l),hs='#'.repeat(Math.min(6,2+x.depth));
    out.push(hs+' '+x.num+' '+x.name,'');
    if(l.caption)out.push(l.caption,'');
    out.push('_Diagram type: '+TYPE_NAMES[t]+'._','');
    if(l.nodes.length){out.push('```mermaid',mermaidLevel(l),'```','');}
    var ins=l.nodes.filter(function(n){return n.role==='input';}),outs=l.nodes.filter(function(n){return n.role==='output';});
    if(ins.length)out.push('**Inputs:** '+ins.map(function(n){return mdc(n.label);}).join(', '),'');
    if(outs.length)out.push('**Outputs:** '+outs.map(function(n){return mdc(n.label);}).join(', '),'');
    if(l.nodes.length){
      var dirx=levelDir(l)==='LR',ns=l.nodes.filter(function(n){return n.shape!=='text';}).sort(function(a,b){return dirx?(a.x-b.x)||(a.y-b.y):(a.y-b.y)||(a.x-b.x);});
      var anyTech=ns.some(function(n){return n.tech;}),anyTag=ns.some(function(n){return badged(n);});
      out.push('| Component | What it does | Source |'+(anyTech?' Tech |':'')+(anyTag?' Tags |':''),'|---|---|---|'+(anyTech?'---|':'')+(anyTag?'---|':''));
      ns.forEach(function(n){
        var sub=hasInner(n)?bySec[x.v.path.concat([n.id]).join('/')]:null;
        var cell=mdc(n.label)+(sub?' \u2192 [section '+sub.num+'](#'+sub.anchor+')':'');
        var what=mdc(n.note||'')+(n.confidence==='inferred'?' _(inferred, not confirmed in code)_':'');
        var src=(n.source||[]).map(function(q){var u=srcLink(q);return u?'['+mdc(q)+']('+u+')':'`'+mdc(q)+'`';}).join('<br>');
        out.push('| **'+cell+'** | '+what+' | '+src+' |'+(anyTech?' '+mdc(n.tech||'')+' |':'')+(anyTag?' '+mdc(((n.role?[n.role]:[]).concat(n.tags||[])).join(', '))+' |':''));
      });
      out.push('');
      ns.forEach(function(n){
        var rows=(n.fields||[]).concat(n.methods||[]);
        if(rows.length)out.push('**'+mdc(n.label)+'**'+(n.stereotype?' (\u00ab'+n.stereotype+'\u00bb)':'')+':','',rows.map(function(r){return '- `'+String(r).replace(/`/g,"'")+'`';}).join('\n'),'');
      });
    }
    var lab=function(id){var n=findNode(id,l);return '**'+mdc(n?n.label:id)+'**';};
    if(l.edges.length){
      out.push(t==='sequence'?'**Sequence**':'**Data flow**','');
      l.edges.forEach(function(e,i){
        var ar=e.arrow||defArrow(l),op=ar==='both'?'\u2194':ar==='none'?'\u2014':'\u2192';
        out.push((t==='sequence'?(i+1)+'. ':'- ')+lab(e.from)+' '+op+' '+lab(e.to)+(e.label?': '+mdc(e.label):'')+(e.style==='dashed'&&t!=='sequence'?' _(optional or async)_':''));
      });
      out.push('');
    }
  });
  var gl=Array.isArray(m.glossary)?m.glossary:[];
  if(gl.length){out.push('## Glossary','','| Term | Meaning |','|---|---|');gl.forEach(function(g){out.push('| '+mdc(g.term)+' | '+mdc(g.def)+' |');});out.push('');}
  return out.join('\n');
}

/* ---- Mermaid ---- */
function mmId(id){return String(id).replace(/[^A-Za-z0-9_]/g,'_').replace(/^(\d)/,'n$1')||'n';}
function mmText(t){return '"'+String(t||'').replace(/"/g,'#quot;').replace(/\n/g,'<br>')+'"';}
var MM_SHAPE={rounded:['(',')'],rect:['[',']'],pill:['([','])'],diamond:['{','}'],parallelogram:['[/','/]'],cylinder:['[(',')]'],document:['[',']'],hexagon:['{{','}}'],cloud:['(',')'],circle:['((','))'],triangle:['[',']'],text:['[',']'],table:['[',']'],image:['[',']'],class:['[',']'],person:['([','])'],node3d:['[[',']]'],initial:['((','))'],final:['((','))']};
function mermaidLevel(l){
  var t=levelType(l),L=[];
  if(t==='sequence'){
    L.push('sequenceDiagram');l.nodes.forEach(function(n){L.push('  participant '+mmId(n.id)+' as '+String(n.label).replace(/\n/g,' '));});
    l.edges.forEach(function(e){L.push('  '+mmId(e.from)+((e.style==='dashed')?'-->>':'->>')+mmId(e.to)+': '+String(e.label||' ').replace(/\n/g,' '));});
    return L.join('\n');
  }
  if(t==='state'){
    L.push('stateDiagram-v2');
    var kind={};l.nodes.forEach(function(n){kind[n.id]=n.shape;if(n.shape!=='initial'&&n.shape!=='final')L.push('  state '+mmText(n.label)+' as '+mmId(n.id));});
    var ref=function(id){return kind[id]==='initial'||kind[id]==='final'?'[*]':mmId(id);};
    l.edges.forEach(function(e){L.push('  '+ref(e.from)+' --> '+ref(e.to)+(e.label?' : '+e.label:''));});
    return L.join('\n');
  }
  if(t==='data'){
    L.push('erDiagram');
    l.nodes.forEach(function(n){var nm=mmId(n.label).toUpperCase();L.push('  '+nm+' {');(n.fields||[]).forEach(function(f){var m=String(f).match(/^\s*([^:\s]+)\s*:?\s*(\S*)\s*(.*)$/)||[0,f,'string',''];var keys=(m[3].match(/\b(PK|FK|UK)\b/g)||[]).join(',');L.push('    '+(m[2]||'string').replace(/[^\w]/g,'_')+' '+m[1].replace(/[^\w]/g,'_')+(keys?' '+keys:''));});L.push('  }');});
    var nm=function(id){var n=findNode(id,l);return mmId(n?n.label:id).toUpperCase();};
    l.edges.forEach(function(e){var c=String(e.label||''),card=/\*|many|n\b/i.test(c)?'||--o{':'||--||';L.push('  '+nm(e.from)+' '+card+' '+nm(e.to)+' : '+mmText(c||'relates'));});
    return L.join('\n');
  }
  if(t==='class'){
    L.push('classDiagram');
    l.nodes.forEach(function(n){var id=mmId(n.label);L.push('  class '+id+' {');if(n.stereotype)L.push('    <<'+n.stereotype+'>>');(n.fields||[]).concat(n.methods||[]).forEach(function(m){L.push('    '+String(m).replace(/^-\s*/,'-').replace(/^\+\s*/,'+').replace(/^#\s*/,'#'));});L.push('  }');});
    var cn=function(id){var n=findNode(id,l);return mmId(n?n.label:id);},OP={inherits:' <|-- ',implements:' <|.. ',composition:' *-- ',aggregation:' o-- ',association:' --> ',dependency:' ..> '};
    l.edges.forEach(function(e){var r=e.rel||'association',a=cn(e.from),b=cn(e.to);L.push('  '+(r==='inherits'||r==='implements'?b+OP[r]+a:a+OP[r]+b)+(e.label?' : '+e.label:''));});
    return L.join('\n');
  }
  if(t==='timeline'){
    L.push('timeline');l.nodes.forEach(function(n){L.push('  '+(n.date||'\u2022')+' : '+String(n.label).replace(/\n/g,' '));});return L.join('\n');
  }
  L.push('flowchart '+levelDir(l));
  var grouped={};l.groups.forEach(function(g){var mem=l.nodes.filter(function(n){return n.group===g.id;});if(!mem.length)return;L.push('  subgraph '+mmId(g.id)+' ['+mmText(g.label||g.id)+']');mem.forEach(function(n){grouped[n.id]=1;L.push('    '+mmNode(n));});L.push('  end');});
  l.nodes.forEach(function(n){if(!grouped[n.id])L.push('  '+mmNode(n));});
  l.edges.forEach(function(e){
    var st=e.style||defStyle(l),ar=e.arrow||defArrow(l),op=st==='dashed'?(ar==='none'?'-.-':'-.->'):(ar==='none'?'---':'-->');if(ar==='both')op='<'+op;
    L.push('  '+mmId(e.from)+' '+op+(e.label?'|'+mmText(e.label)+'|':'')+' '+mmId(e.to));
  });
  return L.join('\n');
}
function mmNode(n){var b=MM_SHAPE[n.shape]||MM_SHAPE.rounded;return mmId(n.id)+b[0]+mmText(n.label||' ')+b[1];}
function mermaidAll(from){
  from=from||[];var out=['# '+(from.length?pathLabels(from).join(' / '):data.meta.title),''];if(!from.length&&data.meta.summary)out.push(data.meta.summary,'');
  allLevels(from).forEach(function(v){out.push('## '+trailOf(v,from).join(' / '),'');if(v.l.caption)out.push(v.l.caption,'');out.push('```mermaid',mermaidLevel(v.l),'```','');});
  return out.join('\n');
}

/* ---- draw.io: one page per level, and inner diagrams link to their page ---- */
function hexOf(c,fallback){var v=getComputedStyle(document.body).getPropertyValue('--c-'+(COLORS.indexOf(c)>=0?c:'blue')).trim();if(/^#[0-9a-f]{3,8}$/i.test(c||''))v=c;return /^#[0-9a-f]{6}$/i.test(v)?v:(fallback||'#3B5BDB');}
function tint(hex,k){var n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;function m(v){return Math.round(v+(255-v)*k);}return '#'+((1<<24)+(m(r)<<16)+(m(g)<<8)+m(b)).toString(16).slice(1);}
var DIO_SHAPE={rounded:'rounded=1;arcSize=12;',rect:'rounded=0;',pill:'rounded=1;arcSize=50;',diamond:'rhombus;',parallelogram:'shape=parallelogram;perimeter=parallelogramPerimeter;',cylinder:'shape=cylinder3;boundedLbl=1;size=10;',document:'shape=document;boundedLbl=1;',hexagon:'shape=hexagon;perimeter=hexagonPerimeter2;',cloud:'ellipse;shape=cloud;',circle:'ellipse;',triangle:'triangle;direction=north;',text:'text;strokeColor=none;fillColor=none;',table:'swimlane;fontStyle=1;startSize=30;',image:'rounded=1;',initial:'ellipse;fillColor=#333333;',final:'ellipse;shape=doubleEllipse;',class:'swimlane;fontStyle=1;startSize=30;',person:'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;',node3d:'shape=cube;size=12;boundedLbl=1;'};
function xmlEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'&#10;');}
function drawioAll(){
  var lv=allLevels(),pid={};lv.forEach(function(v,i){pid[v.path.join('/')]='page'+i;});
  var pages=lv.map(function(v){
    var l=v.l,cells=['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'],k=0;
    l.nodes.forEach(function(n){
      var c=hexOf(n.color),w=nw(n),h=nh(n),st=(DIO_SHAPE[n.shape]||DIO_SHAPE.rounded)+'whiteSpace=wrap;html=1;strokeColor='+c+';'+(n.shape==='text'?'':'fillColor='+tint(c,.86)+';')+(n.style==='dashed'?'dashed=1;':'');
      var lab=n.label+((n.fields||[]).length||(n.methods||[]).length?'':'')+(n.tech?'\n['+n.tech+']':'');
      var inner=hasInner(n)?' link="data:page/id,'+pid[v.path.concat([n.id]).join('/')]+'"':'';
      if(inner)st+='fontStyle=1;';
      cells.push('<UserObject id="n_'+xmlEsc(n.id)+'" label="'+xmlEsc(lab)+'"'+inner+(n.note?' tooltip="'+xmlEsc(n.note)+'"':'')+'><mxCell style="'+st+'" vertex="1" parent="1"><mxGeometry x="'+(n.x-w/2)+'" y="'+(n.y-h/2)+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell></UserObject>');
      var rows=(n.fields||[]).concat(n.methods||[]);
      if((n.shape==='table'||n.shape==='class')&&rows.length)rows.forEach(function(r,i){cells.push('<mxCell id="r'+(k++)+'" value="'+xmlEsc(r)+'" style="text;align=left;spacingLeft=6;fontFamily=Courier New;" vertex="1" parent="n_'+xmlEsc(n.id)+'"><mxGeometry y="'+(30+i*20)+'" width="'+w+'" height="20" as="geometry"/></mxCell>');});
    });
    l.edges.forEach(function(e,i){
      if(isSeq(l))return;
      var st=e.style||defStyle(l),ar=e.arrow||defArrow(l),rt=edgeRoute(e,l),r=REL[e.rel];
      var s='html=1;rounded=1;'+(rt==='orthogonal'?'edgeStyle=orthogonalEdgeStyle;':rt==='curved'?'curved=1;':'')+(st!=='solid'||(r&&r.st==='dashed')?'dashed=1;':'')+
        (r?(r.end==='tri'?'endArrow=block;endFill=0;':r.end==='open'?'endArrow=open;':'endArrow=none;')+(r.start==='dia'?'startArrow=diamondThin;startFill=1;':r.start==='odia'?'startArrow=diamondThin;startFill=0;':''):(ar==='none'?'endArrow=none;':ar==='both'?'startArrow=classic;':''));
      var pts=(e.points||[]).map(function(q){return '<mxPoint x="'+q[0]+'" y="'+q[1]+'"/>';}).join('');
      cells.push('<mxCell id="e'+i+'" value="'+xmlEsc(e.label||'')+'" style="'+s+'" edge="1" parent="1" source="n_'+xmlEsc(e.from)+'" target="n_'+xmlEsc(e.to)+'"><mxGeometry relative="1" as="geometry">'+(pts?'<Array as="points">'+pts+'</Array>':'')+'</mxGeometry></mxCell>');
    });
    return '<diagram id="'+pid[v.path.join('/')]+'" name="'+xmlEsc(['Overview'].concat(v.crumbs).join(' / '))+'"><mxGraphModel grid="1" gridSize="10" guides="1"><root>'+cells.join('')+'</root></mxGraphModel></diagram>';
  });
  return '<mxfile host="unfold" type="device">'+pages.join('')+'</mxfile>';
}

/* ---- Excalidraw: the current level, bound arrows and contained labels ---- */
function excalidrawLevel(l){
  var els=[],seed=1,now=Date.now();
  function base(o){return Object.assign({angle:0,strokeColor:'#1e1e1e',backgroundColor:'transparent',fillStyle:'solid',strokeWidth:1.5,strokeStyle:'solid',roughness:1,opacity:100,groupIds:[],frameId:null,roundness:null,seed:seed++,version:1,versionNonce:seed*7919,isDeleted:false,boundElements:[],updated:now,link:null,locked:false},o);}
  var byId={};
  l.nodes.forEach(function(n){
    var w=nw(n),h=nh(n),c=hexOf(n.color),type=n.shape==='diamond'?'diamond':(n.shape==='circle'||n.shape==='initial'||n.shape==='final')?'ellipse':'rectangle',id='n_'+n.id,tid='t_'+n.id;
    var rows=(n.fields||[]).concat(n.methods||[]),txt=n.label+(n.tech?'\n['+n.tech+']':'')+(rows.length?'\n'+rows.join('\n'):'');
    var el=base({id:id,type:type,x:n.x-w/2,y:n.y-h/2,width:w,height:h,strokeColor:c,backgroundColor:n.shape==='text'?'transparent':tint(c,.86),roundness:/rounded|pill|cloud|person/.test(n.shape)?{type:3}:null,boundElements:[{type:'text',id:tid}],strokeStyle:n.shape==='text'?'dotted':'solid'});
    els.push(el);byId[n.id]=el;
    els.push(base({id:tid,type:'text',x:n.x-w/2+8,y:n.y-10,width:w-16,height:20,text:txt,originalText:txt,fontSize:16,fontFamily:1,textAlign:'center',verticalAlign:'middle',containerId:id,lineHeight:1.25,autoResize:true}));
  });
  l.edges.forEach(function(e,i){
    var a=byId[e.from],b=byId[e.to];if(!a||!b||a===b)return;
    var g=isSeq(l)?null:edgeGeom(e,l),pts=g&&g.poly?g.poly:[{x:a.x+a.width/2,y:a.y+a.height/2},{x:b.x+b.width/2,y:b.y+b.height/2}];
    var x0=pts[0].x,y0=pts[0].y,id='e'+i,st=e.style||defStyle(l),ar=e.arrow||defArrow(l);
    var el=base({id:id,type:'arrow',x:x0,y:y0,width:Math.abs(pts[pts.length-1].x-x0),height:Math.abs(pts[pts.length-1].y-y0),points:pts.map(function(p){return [p.x-x0,p.y-y0];}),strokeStyle:st==='solid'?'solid':'dashed',
      startBinding:{elementId:a.id,focus:0,gap:4},endBinding:{elementId:b.id,focus:0,gap:4},startArrowhead:ar==='both'?'arrow':null,endArrowhead:ar==='none'?null:(REL[e.rel]&&REL[e.rel].end==='tri'?'triangle':'arrow'),roundness:{type:2}});
    if(e.label){var lid='l'+i;el.boundElements=[{type:'text',id:lid}];els.push(base({id:lid,type:'text',x:x0,y:y0,width:e.label.length*8,height:20,text:e.label,originalText:e.label,fontSize:14,fontFamily:1,textAlign:'center',verticalAlign:'middle',containerId:id,lineHeight:1.25,autoResize:true}));}
    els.push(el);a.boundElements.push({type:'arrow',id:id});b.boundElements.push({type:'arrow',id:id});
  });
  return JSON.stringify({type:'excalidraw',version:2,source:'https://github.com/mahmoud-nasif/Unfold',elements:els,appState:{viewBackgroundColor:'#ffffff',gridSize:null},files:{}},null,1);
}

/* ---- Mermaid in: flowcharts, sequences, states, classes and ER diagrams become a level ---- */
function parseMermaid(src){
  var lines=String(src).replace(/\r/g,'').split('\n').map(function(x){return x.replace(/%%.*$/,'').trim();}).filter(Boolean);
  if(!lines.length)throw new Error('The text is empty.');
  var head=lines[0],m;
  var lv={nodes:[],edges:[],groups:[]},ids={};
  function node(id,label,shape){id=String(id).trim();if(!ids[id]){ids[id]={id:id,label:label||id};lv.nodes.push(ids[id]);}var n=ids[id];if(label)n.label=label;if(shape)n.shape=shape;return n;}
  function unq(t){t=String(t==null?'':t).trim();if(/^".*"$/.test(t))t=t.slice(1,-1);return t.replace(/<br\s*\/?>/gi,'\n').replace(/#quot;/g,'"');}
  if(/^(flowchart|graph)\b/i.test(head)){
    m=head.match(/^(?:flowchart|graph)\s+(TB|TD|BT|LR|RL)/i);var dir=m?m[1].toUpperCase():'TB';
    lv.type=dir==='LR'||dir==='RL'?'architecture':'process';lv.direction=dir==='LR'||dir==='RL'?'LR':'TB';
    var SH=[['([','])','pill'],['[[',']]','rect'],['[(',')]','cylinder'],['((','))','circle'],['{{','}}','hexagon'],['[/','/]','parallelogram'],['[\\','\\]','parallelogram'],['[/','\\]','parallelogram'],['[\\','/]','parallelogram'],['(',')','rounded'],['[',']','rect'],['{','}','diamond'],['>',']','rect']];
    var grp=null;
    var ref=function(t){
      t=t.trim().replace(/:::\w+$/,'');var mm=t.match(/^([A-Za-z0-9_\-.]+)\s*([\s\S]*)$/);if(!mm)return null;
      var rest=mm[2].trim(),shape=null,label=null;
      for(var i=0;i<SH.length&&rest;i++){var o=SH[i];if(rest.indexOf(o[0])===0&&rest.slice(-o[1].length)===o[1]){label=unq(rest.slice(o[0].length,rest.length-o[1].length));shape=o[2];break;}}
      var n=node(mm[1],label,shape);if(grp&&!n.group)n.group=grp;return n;
    };
    var LINK=/\s*(<?)((?:-{2,}|={2,}|-\.+-)(?:>|o|x)?|~~~)\s*(?:\|([^|]*)\|)?\s*/;
    lines.slice(1).forEach(function(line){
      if(/^(classDef|class|style|linkStyle|click)\b/.test(line))return;
      var sg=line.match(/^subgraph\s+([^\[\s]+)\s*(?:\[(.*)\])?\s*$/);
      if(sg){grp=mmId(sg[1]);lv.groups.push({id:grp,label:unq(sg[2]||sg[1])});return;}
      if(/^end$/.test(line)){grp=null;return;}
      if(/^direction\s/.test(line))return;
      line=line.replace(/--\s+([^->|][^>]*?)\s+-->/g,'-->|$1|').replace(/-\.\s+([^.]+?)\s+\.->/g,'-.->|$1|').replace(/==\s+([^=]+?)\s+==>/g,'==>|$1|');
      var parts=[],rest=line,mm2;
      while((mm2=rest.match(LINK))&&mm2.index>0){parts.push(rest.slice(0,mm2.index));parts.push(mm2);rest=rest.slice(mm2.index+mm2[0].length);}
      parts.push(rest);
      var prev=null;
      for(var i=0;i<parts.length;i+=2){
        var here=parts[i].split('&').map(ref).filter(Boolean);
        if(prev&&i>0){var lk=parts[i-1],op=lk[2],e={};if(/^-\./.test(op))e.style='dashed';else if(/^=/.test(op))e.style='solid';if(!/[>ox]$/.test(op))e.arrow='none';if(lk[1]==='<')e.arrow='both';if(lk[3])e.label=unq(lk[3]);
          prev.forEach(function(a){here.forEach(function(b){lv.edges.push(Object.assign({from:a.id,to:b.id},e));});});}
        prev=here;
      }
    });
  }else if(/^sequenceDiagram/.test(head)){
    lv.type='sequence';
    lines.slice(1).forEach(function(line){
      var p=line.match(/^(?:participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/);if(p){var n=node(p[1],unq(p[2]||p[1]));if(/^actor/.test(line))n.shape='pill';return;}
      var msg=line.match(/^([^-\s>]+?)\s*(--?)(>>|>|x|\))\s*[+-]?([^:\s]+)\s*:\s*(.*)$/);
      if(msg){node(msg[1]);node(msg[4]);var e={from:msg[1],to:msg[4],label:unq(msg[5])};if(msg[2]==='--')e.style='dashed';lv.edges.push(e);}
    });
  }else if(/^stateDiagram/.test(head)){
    lv.type='state';var ini=null,fin=null;
    var st=function(t){t=t.trim();if(t==='[*]')return null;return node(t).id;};
    lines.slice(1).forEach(function(line){
      var d=line.match(/^state\s+"([^"]+)"\s+as\s+(\S+)/);if(d){node(d[2],d[1]);return;}
      var tr=line.match(/^(\S+)\s*-->\s*(\S+)(?:\s*:\s*(.*))?$/);if(!tr)return;
      var a=tr[1]==='[*]'?(ini=ini||node('start','','initial')).id:st(tr[1]),b=tr[2]==='[*]'?(fin=fin||node('done','Done','final')).id:st(tr[2]);
      var e={from:a,to:b};if(tr[3])e.label=unq(tr[3]);lv.edges.push(e);
    });
  }else if(/^classDiagram/.test(head)){
    lv.type='class';var open=null;
    var cls=function(id){var n=node(id);n.shape='class';return n;};
    var add=function(n,mem){mem=mem.trim();if(!mem)return;if(/^<<(.+)>>$/.test(mem)){n.stereotype=mem.slice(2,-2);return;}var k=/\(/.test(mem)?'methods':'fields';(n[k]=n[k]||[]).push(mem);};
    var OPS=[['<|--','inherits',true],['--|>','inherits',false],['<|..','implements',true],['..|>','implements',false],['*--','composition',false],['--*','composition',true],['o--','aggregation',false],['--o','aggregation',true],['-->','association',false],['<--','association',true],['..>','dependency',false],['<..','dependency',true],['--','association',false],['..','dependency',false]];
    lines.slice(1).forEach(function(line){
      if(open){if(line==='}'){open=null;return;}add(open,line);return;}
      var c=line.match(/^class\s+(\w+)(?:~\w+~)?\s*(\{)?\s*$/);if(c){var n=cls(c[1]);if(c[2])open=n;return;}
      var mb=line.match(/^(\w+)\s*:\s*(.+)$/);
      for(var i=0;i<OPS.length;i++){
        var op=OPS[i],at=line.indexOf(op[0]);if(at<0)continue;
        var left=line.slice(0,at).replace(/"[^"]*"/g,'').trim(),right=line.slice(at+op[0].length),lab=null,lm=right.match(/^(.*?):(.*)$/);if(lm){right=lm[1];lab=unq(lm[2]);}
        right=right.replace(/"[^"]*"/g,'').trim();if(!/^\w+$/.test(left)||!/^\w+$/.test(right))continue;
        cls(left);cls(right);
        var from=left,to=right;
        if(op[1]==='inherits'||op[1]==='implements'){if(op[2]){from=right;to=left;}}else if(op[2]){from=right;to=left;}
        var e={from:from,to:to,rel:op[1]};if(lab)e.label=lab;lv.edges.push(e);return;
      }
      if(mb)add(cls(mb[1]),mb[2]);
    });
  }else if(/^erDiagram/.test(head)){
    lv.type='data';var ent=null;
    var en=function(id){var n=node(id);n.shape='table';n.fields=n.fields||[];return n;};
    lines.slice(1).forEach(function(line){
      if(ent){if(line==='}'){ent=null;return;}var f=line.split(/\s+/);ent.fields.push(f[1]+': '+f[0]+(f[2]&&/PK|FK|UK/.test(f[2])?' '+f[2]:''));return;}
      var b=line.match(/^([\w-]+)\s*\{\s*$/);if(b){ent=en(b[1]);return;}
      var r=line.match(/^([\w-]+)\s+([|}o]{2})(--|\.\.)([|{o]{2})\s+([\w-]+)\s*:\s*(.+)$/);
      if(r){en(r[1]);en(r[5]);var many=/\{/.test(r[4])||/\}/.test(r[2]);lv.edges.push({from:r[1],to:r[5],label:unq(r[6])+(many?' (1..*)':'')});}
    });
  }else throw new Error('Unfold reads flowchart, graph, sequenceDiagram, stateDiagram, classDiagram and erDiagram. This text starts with \u201c'+head.slice(0,30)+'\u201d.');
  if(!lv.nodes.length)throw new Error('No nodes were found in that diagram.');
  return lv;
}
function importMermaid(){
  var ta=$('#ss-mm'),err=$('#ss-mm-err'),lv;
  try{lv=parseMermaid(ta.value);}catch(e){err.textContent=e.message;return;}
  var l=cur();
  if(l.nodes.length&&!confirm('Replace what is on this level with the imported diagram?'))return;
  commit(function(){var c=cur();var keep={caption:c.caption};Object.keys(c).forEach(function(k){delete c[k];});Object.assign(c,lv,keep);normLevel(c,{},!path.length);layoutAny(c);});
  closeModal();fitView(320);toast('Imported '+lv.nodes.length+' nodes and '+lv.edges.length+' links.');
}

