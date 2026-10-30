/* ================= zoom transitions ================= */
// tours and presentations move more slowly than exploring does
var pace=1;
function ms(v){return Math.round(v*pace);}
function wait(t){return new Promise(function(r){setTimeout(r,reduceMotion?0:t);});}
async function zoomIn(id,fast){
  var l=cur(),n=findNode(id,l);if(!n||!n.children)return false;
  finishInline(true);
  var d1=ms(fast?300:520),d2=ms(fast?360:620);
  detailId=null;traceId=null;$('#ss-card').hidden=true;$('#ss-ftb').hidden=true;
  scene.classList.remove('tracing');scene.classList.add('zooming');
  var el=scene.querySelector('.node[data-id="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]');if(el)el.classList.add('target');
  await animateCam(fitTo({x:n.x-nw(n)/2,y:n.y-nh(n)/2,w:nw(n),h:nh(n)},{t:0,r:0,b:0,l:0}),d1);
  path.push(id);sel={nodes:[],edge:null,group:null};pop=null;
  scene.classList.remove('zooming');scene.classList.add('arriving');
  renderAll();renderAbout();
  var fit=fitTo(viewTarget());setCam(scaleBox(fit,3.2));
  void scene.getBoundingClientRect();scene.classList.remove('arriving');
  await animateCam(fit,d2);
  return true;
}
async function zoomOut(fast){
  if(!path.length)return;
  finishInline(true);
  var d1=ms(fast?260:440),d2=ms(fast?360:620),id=path[path.length-1];
  detailId=null;traceId=null;$('#ss-card').hidden=true;$('#ss-ftb').hidden=true;
  scene.classList.add('leaving');
  await animateCam(scaleBox(cam,3.2),d1);
  path.pop();sel={nodes:[],edge:null,group:null};pop=null;
  renderAll();
  var n=findNode(id);if(n)setCam(fitTo({x:n.x-nw(n)/2,y:n.y-nh(n)/2,w:nw(n),h:nh(n)},{t:0,r:0,b:0,l:0}));
  scene.classList.remove('leaving');
  await animateCam(fitTo(viewTarget()),d2);
}
async function dissolveTo(target){
  finishInline(true);
  detailId=null;traceId=null;$('#ss-card').hidden=true;$('#ss-ftb').hidden=true;
  scene.classList.remove('tracing');scene.classList.add('leaving');
  await wait(ms(380));
  path=target.slice();validatePath();sel={nodes:[],edge:null,group:null};pop=null;
  renderAll();renderAbout();
  var fit=fitTo(viewTarget());setCam(scaleBox(fit,1.15));
  scene.classList.add('arriving');scene.classList.remove('leaving');void scene.getBoundingClientRect();scene.classList.remove('arriving');
  await animateCam(fit,ms(720));
}
var fromHistory=false;
async function goToPath(target){
  if(busy)return;busy=true;hideHint();var before=path.join('/');
  try{
    var common=0;while(common<path.length&&common<target.length&&path[common]===target[common])common++;
    var hops=(path.length-common)+(target.length-common);
    // several levels at once: dissolve to the new level instead of chaining quick zooms, which reads as a glitch
    if(hops>1)await dissolveTo(target);
    else{
      while(path.length>common)await zoomOut(false);
      for(var k=common;k<target.length;k++){if(!(await zoomIn(target[k],false)))break;}
    }
  }finally{
    busy=false;renderToolbar();
    if(tour&&tour.again&&!tour.moving)runStep();
    if(!fromHistory&&path.join('/')!==before){try{history.pushState({unfold:path.slice()},'');}catch(e){}}
    fromHistory=false;
  }
}
function activate(id){
  var n=findNode(id);if(!n)return;
  if(answerQuiz(id))return;
  hideHint();
  if(hasInner(n))goToPath(path.concat([id]));
  else if(mediaList(n).length&&!n.note&&!(n.source&&n.source.length))openMedia(n,0);
  else{detailId=id;renderCard();}
}

