/* ================= hover hints ================= */
var hintTimer=null,hintId=null;
function hintText(n){
  var t=firstSentence(n.note,110),cue=hasInner(n)?'Click to open '+TYPE_NAMES[levelType(n.children)].toLowerCase():(mediaList(n).length?'Click to view':(n.source&&n.source.length&&!t?n.source[0]:''));
  return {t:t,cue:cue};
}
function showHint(id){
  clearTimeout(hintTimer);
  if(!id||mode!=='view'||busy||detailId){hideHint();return;}
  if(id===hintId)return;
  hintTimer=setTimeout(function(){
    var n=findNode(id),el=$('#ss-hint');if(!n)return;var h=hintText(n);if(!h.t&&!h.cue){hideHint();return;}
    el.innerHTML=(h.t?'<span>'+esc(h.t)+'</span>':'')+(h.cue?'<small>'+esc(h.cue)+'</small>':'');el.hidden=false;hintId=id;
    var a=toScreen(n.x,n.y-nh(n)/2-(badged(n)?26:0)),app=$('#app').getBoundingClientRect();
    el.style.left=clamp(a.x-el.offsetWidth/2,8,app.width-el.offsetWidth-8)+'px';el.style.top=Math.max(8,a.y-el.offsetHeight-10)+'px';
  },380);
}
function hideHint(){clearTimeout(hintTimer);hintId=null;var el=$('#ss-hint');if(el)el.hidden=true;}
