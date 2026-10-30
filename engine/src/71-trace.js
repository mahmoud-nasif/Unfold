/* ================= flow tracing ================= */
function traceSets(id,l){
  var down={},up={},ed={};
  function walk(start,fwd,acc){
    var q=[start];acc[start]=1;
    while(q.length){var u=q.shift();l.edges.forEach(function(e,i){var a=fwd?e.from:e.to,b=fwd?e.to:e.from;if(a===u){ed[i]=1;if(!acc[b]){acc[b]=1;q.push(b);}}});}
  }
  walk(id,true,down);walk(id,false,up);
  return {nodes:Object.assign({},down,up),edges:ed};
}
function applyTrace(id){
  var l=cur(),t=traceSets(id,l);
  scene.classList.add('tracing');
  scene.querySelectorAll('.node').forEach(function(el){el.classList.toggle('lit',!!t.nodes[el.dataset.id]);el.classList.toggle('origin',el.dataset.id===id);});
  scene.querySelectorAll('.edge').forEach(function(el){el.classList.toggle('lit',!!t.edges[el.dataset.i]);});
}
function setTrace(id){
  if(id===traceId)return;traceId=id;
  if(!id){scene.classList.remove('tracing');scene.querySelectorAll('.lit,.origin').forEach(function(el){el.classList.remove('lit','origin');});return;}
  applyTrace(id);
}

