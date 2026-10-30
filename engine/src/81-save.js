/* ================= export, save, draft ================= */
function buildDocument(d){
  d=d||data;var css=document.getElementById('ss-css').textContent,js=document.getElementById('ss-engine').textContent;
  var json=JSON.stringify(d,null,1).replace(/</g,'\\u003c');
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>'+esc(d.meta.title)+'</title>\n'+FONT_LINKS+
    '\n<style id="ss-css">'+css+'</style>\n</head>\n<body>\n<div id="app"></div>\n<script type="application/json" id="story-data">'+json+'<\/script>\n<script id="ss-engine">'+js+'<\/script>\n</body>\n</html>\n';
}
async function download(filename,text){
  if(downloadsCap){
    try{await downloadsCap.save({filename:filename,data:text});toast('Saved '+filename);}
    catch(err){if(err&&err.code==='declined')return;if(err&&err.code==='rate_limited'){toast('A save prompt is already open.');return;}downloadsCap=null;anchorDownload(filename,text);}
    return;
  }
  anchorDownload(filename,text);
}
function anchorDownload(filename,text){
  var blob=new Blob([text],{type:/\.(json|excalidraw)$/.test(filename)?'application/json':/\.svg$/.test(filename)?'image/svg+xml':/\.(md)$/.test(filename)?'text/markdown':/\.drawio$/.test(filename)?'application/xml':'text/html'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);toast('Copied the diagram data');}
  catch(e){var ta=$('#ss-json');if(ta){ta.closest('details').open=true;ta.focus();ta.select();try{document.execCommand('copy');toast('Copied the diagram data');}catch(e2){toast('Press Ctrl+C to copy the selected data');}}}
}
async function saveToPage(){
  if(!artifactCap||!dirty)return;
  try{localStorage.removeItem(draftKey);}catch(e){}
  try{toast('Saving\u2026');await artifactCap.publish(buildDocument());}
  catch(err){
    try{localStorage.setItem(draftKey,snapshot());}catch(e){}
    var c=err&&err.code;
    if(c==='conflict')toast('A newer version was saved elsewhere. Reloading it now.');
    else if(['not_writer','not_granted','not_declared','capability_disabled','capability_removed','consent_required'].indexOf(c)>=0){readOnly=true;renderHeader();toast('This view is read-only. Use Export to keep your edits.');}
    else if(c==='rate_limited')toast('Saving too often. Wait a moment, then save again.');
    else toast('Saving failed: '+((err&&err.message)||'unknown error')+'. Your edits are kept in this browser.');
  }
}
var toastTimer=null;
function toast(msg,action){
  var t=$('#ss-toast');
  t.innerHTML='<span>'+esc(msg)+'</span>'+(action?'<button class="btn" data-act="'+action.act+'">'+esc(action.label)+'</button>':'');
  t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.hidden=true;},action?9000:3200);
}
function openModal(html){var m=$('#ss-modal');m.innerHTML='<div class="dialog" role="dialog" aria-modal="true">'+html+'</div>';m.hidden=false;var f=m.querySelector('button');if(f)f.focus();}
function closeModal(){var m=$('#ss-modal');m.hidden=true;m.innerHTML='';}
function openExport(){
  openModal('<div class="dlg-head"><h2>Export</h2><button class="ib" data-act="close-modal" aria-label="Close">'+uiIcon('close')+'</button></div>'+
    (path.length?'<h3 class="ex-h">This level and everything inside it: '+esc(pathLabels(path).slice(-1)[0])+'</h3><div class="row"><button class="btn" data-act="dl-sub-html">'+uiIcon('export')+'Page (.html)</button><button class="btn" data-act="dl-sub-json">Data (.json)</button><button class="btn" data-act="dl-sub-docs">Documentation (.md)</button><button class="btn" data-act="dl-sub-pdf">PDF</button><button class="btn" data-act="dl-sub-mermaid">Mermaid (.md)</button></div>':'')+
    '<h3 class="ex-h">The whole map</h3><div class="row"><button class="btn" data-act="dl-html">'+uiIcon('export')+'Page (.html)</button><button class="btn" data-act="dl-json">Data (.json)</button><button class="btn" data-act="dl-docs">Documentation (.md)</button><button class="btn" data-act="copy-json">Copy data</button></div>'+
    '<h3 class="ex-h">Pictures</h3><div class="row"><button class="btn" data-act="ex-png">'+uiIcon('image',16)+'This level (.png)</button><button class="btn" data-act="ex-svg">This level (.svg)</button><button class="btn" data-act="ex-pdf">All levels (PDF)</button><button class="btn" data-act="ex-readme">README embed</button></div>'+
    '<h3 class="ex-h">Other tools</h3><div class="row"><button class="btn" data-act="ex-mermaid">Mermaid (.md, all levels)</button><button class="btn" data-act="ex-drawio">draw.io (.drawio)</button><button class="btn" data-act="ex-excalidraw">Excalidraw (this level)</button></div>'+
    '<details><summary>Import a Mermaid diagram into this level</summary><textarea id="ss-mm" class="mono" spellcheck="false" rows="7" aria-label="Mermaid text" placeholder="flowchart LR&#10;  api[API] --> db[(Orders)]"></textarea>'+
    '<div class="row"><button class="btn" data-act="ex-import">Import</button><span id="ss-mm-err" class="err" role="alert"></span></div></details>'+
    '<details><summary>Edit the data directly</summary><textarea id="ss-json" spellcheck="false" aria-label="Diagram data">'+esc(JSON.stringify(data,null,2))+'</textarea>'+
    '<div class="row"><button class="btn" data-act="apply-json">Apply data</button><span id="ss-json-err" class="err" role="alert"></span></div></details>');
}
function openHelp(){
  var k=[['Click','Open a module, or show a step\u2019s details'],['Hover','Trace what flows into and out of a step'],['Esc','Back one level / clear selection'],['Wheel, pinch','Zoom'],['Drag background','Pan (view) / select area (edit)'],['Space + drag','Pan while editing'],['F','Fit to screen'],['E','Switch between View and Edit'],
    ['Double-click','Edit text, or add a node on empty canvas'],['Drag a blue dot','Draw a link: drop on (or near) a node to connect, on empty canvas to add a connected node'],['Link button','Link the selected node: then click the target'],['Select a link','Drag the line to bend it anywhere, slide its label along the line (double-click to edit), drag an end dot to another side or box; double-click a bend point to remove it'],['Drop or paste a picture','Drop an image or video on empty canvas (or paste a screenshot) to add it as a node you can link'],['Drop files on a node','Attach images or videos to it (or use the picture button)'],['Tab (while typing)','Add the next connected step'],['Enter','Edit the selected node\u2019s text'],['Shift + click','Add to selection'],['Ctrl+G / Ctrl+E','Group / nest the selection'],['Ctrl+D, Ctrl+C/V','Duplicate, copy, paste'],['Arrows','Nudge (Shift for 10\u00d7)'],['Delete','Remove selection'],['Ctrl+Z / Ctrl+Shift+Z','Undo / redo']];
  openModal('<div class="dlg-head"><h2>Shortcuts</h2><button class="ib" data-act="close-modal" aria-label="Close">'+uiIcon('close')+'</button></div><div class="keys">'+k.map(function(r){return '<kbd>'+r[0]+'</kbd><span>'+r[1]+'</span>';}).join('')+'</div>');
}
function applyJSON(){
  var ta=$('#ss-json'),err=$('#ss-json-err');
  try{var d=normalize(JSON.parse(ta.value));var before=snapshot();data=d;pushHistory(before);path=[];sel={nodes:[],edge:null,group:null};markDirty();closeModal();renderAll();fitView(0);toast('Applied the new data');}
  catch(e){err.textContent='Not applied: '+e.message;}
}
function discardDraft(){
  try{localStorage.removeItem(draftKey);}catch(e){}
  data=JSON.parse(originalJSON);undoStack=[];redoStack=[];path=[];sel={nodes:[],edge:null,group:null};dirty=false;
  renderAll();fitView(0);$('#ss-toast').hidden=true;
}
function setMode(m){
  if(m===mode)return;finishInline(true);if(m==='edit'&&tour)endTour();
  mode=m;document.body.classList.toggle('editing',mode==='edit');
  sel={nodes:[],edge:null,group:null};pop=null;detailId=null;setTrace(null);
  renderAll();if(!busy)fitView(320);
}

