/* ================= media ================= */
var pendingMedia=null;
function attachFile(id,f){
  if(f.size>12*1024*1024){toast('That file is over 12 MB. Use a smaller file or link to it by URL.');return;}
  var rd=new FileReader(),video=/^video\//.test(f.type);
  function go(dim){
    commit(function(){
      var n=findNode(id);if(!n)return;
      var item={src:rd.result,type:video?'video':'image'},fresh=n.shape==='image'&&!mediaList(n).length;
      // a new picture node takes the picture's proportions, so nothing is cropped
      if(fresh&&dim){var W=260,H=Math.round(W*dim.h/dim.w)+38;if(H>380){H=380;W=Math.round((H-38)*dim.w/dim.h);}n.w=Math.max(120,W);n.h=Math.max(90,H);}
      setMedia(n,fresh?[item]:mediaList(n).concat([item]));
      if(n.shape==='image'&&(!n.label||n.label==='Image'))n.label=(f.name||'Image').replace(/\.[^.]+$/,'');
    });
    if(f.size>3*1024*1024)toast('Embedded '+Math.round(f.size/1048576)+' MB. Large files make the page slow to share.');
  }
  rd.onload=function(){
    if(video){go(null);return;}
    var im=new Image();im.onload=function(){go({w:im.naturalWidth||1,h:im.naturalHeight||1});};im.onerror=function(){go(null);};im.src=rd.result;
  };
  rd.readAsDataURL(f);
}
// a picture or video placed straight on the canvas becomes a node that links like any other
function addMediaNode(f,x,y){
  var id;commit(function(){var l=cur(),n=newNode(l,'image',x,y,(f.name||'Image').replace(/\.[^.]+$/,''));l.nodes.push(n);id=n.id;sel={nodes:[id],edge:null,group:null};});
  attachFile(id,f);return id;
}
function addUrlNode(url,x,y){
  var id;commit(function(){var l=cur(),n=newNode(l,'image',x,y,decodeURIComponent((url.split(/[?#]/)[0].split('/').pop()||'Image')).replace(/\.[^.]+$/,'')||'Image');n.media={src:url};n.w=260;n.h=200;l.nodes.push(n);id=n.id;sel={nodes:[id],edge:null,group:null};});
  return id;
}
// the viewer flies out of the node; with several items it pages through them (arrow keys too)
var viewing=null;
function openMedia(n,i){
  var list=mediaList(n);if(!list.length)return;i=clamp(i||0,0,list.length-1);
  var m=list[i],t=mediaType(m),v=$('#ss-viewer'),again=!!viewing&&viewing.id===n.id;viewing={id:n.id,i:i,n:list.length};
  var body=t==='video'?'<video src="'+esc(m.src)+'" controls playsinline'+(m.poster?' poster="'+esc(m.poster)+'"':'')+'></video>':
    t==='embed'?'<iframe src="'+esc(m.src)+'" title="'+esc(n.label)+'" allow="fullscreen; picture-in-picture" referrerpolicy="no-referrer"></iframe>':
    '<img src="'+esc(m.src)+'" alt="'+esc(m.caption||n.label)+'">';
  var nav=list.length>1?'<button class="ib v-prev" data-act="media-step" data-arg="-1" aria-label="Previous"'+(i?'':' disabled')+'>'+uiIcon('back')+'</button><button class="ib v-next" data-act="media-step" data-arg="1" aria-label="Next"'+(i<list.length-1?'':' disabled')+'>'+uiIcon('arrowR')+'</button>':'';
  v.innerHTML='<figure class="v-fig">'+body+'<figcaption><b>'+esc(n.label)+'</b>'+(m.caption?' '+esc(m.caption):'')+(list.length>1?' <span class="v-count">'+(i+1)+' / '+list.length+'</span>':'')+'</figcaption></figure>'+nav+'<button class="ib v-x" data-act="close-media" aria-label="Close">'+uiIcon('close')+'</button>';
  v.hidden=false;
  var fig=v.querySelector('.v-fig'),a=toScreen(n.x-nw(n)/2,n.y-nh(n)/2),b=toScreen(n.x+nw(n)/2,n.y+nh(n)/2),r=fig.getBoundingClientRect(),app=$('#app').getBoundingClientRect();
  if(!reduceMotion&&r.width&&!again){
    var sx=(b.x-a.x)/r.width,sy=(b.y-a.y)/r.height,tx=a.x+app.left-r.left,ty=a.y+app.top-r.top;
    fig.style.transformOrigin='0 0';fig.style.transform='translate('+tx+'px,'+ty+'px) scale('+sx+','+sy+')';fig.style.opacity='0.2';
    requestAnimationFrame(function(){fig.style.transition='transform .42s cubic-bezier(.2,.8,.2,1),opacity .3s';fig.style.transform='none';fig.style.opacity='1';});
  }
  (v.querySelector(again&&nav?(i?'.v-prev':'.v-next'):'.v-x')||v.querySelector('.v-x')).focus();
}
function stepMedia(d){if(!viewing)return;var n=findNode(viewing.id);if(n)openMedia(n,viewing.i+d);}
// the node's badge: a thumbnail of its first picture (with a count when there are more), or a play glyph
function mediaBadge(n,x,y){
  var ml=mediaList(n),m=ml[0],th=mediaType(m)==='image'?m.src:m.poster,s='<g class="enter media" transform="translate('+x+' '+y+')"><title>'+(ml.length>1?'View '+ml.length+' media items':'View media')+'</title>';
  if(th){var cid='mclip'+(++clipSeq);s+='<clipPath id="'+cid+'"><rect x="-22" y="-8" width="30" height="22" rx="5"/></clipPath><rect class="m-frame" x="-23" y="-9" width="32" height="24" rx="6"/><image href="'+esc(th)+'" x="-22" y="-8" width="30" height="22" preserveAspectRatio="xMidYMid slice" clip-path="url(#'+cid+')"/>';}
  else s+='<circle r="9"/><path d="M-2.5 -4 4 0 -2.5 4z" class="fillglyph"/>';
  if(ml.length>1)s+='<g class="m-count" transform="translate('+(th?8:8)+' '+(th?-9:-8)+')"><circle r="7"/><text y="3.5">'+ml.length+'</text></g>';
  return s+'</g>';
}
function closeMedia(){var v=$('#ss-viewer');v.hidden=true;v.innerHTML='';viewing=null;}
