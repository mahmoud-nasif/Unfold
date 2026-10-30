/* ================= geometry ================= */
function wavH(h){return Math.min(14,h*.16);}
function shapeSVG(n,cls,sw){
  var w=nw(n),h=nh(n),X=-w/2,Y=-h/2,c=cls||'sh',st=sw?' stroke-width="'+sw+'"':'',k;
  switch(n.shape){
    case 'rect':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="4"'+st+'/>';
    case 'pill':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="'+h/2+'"'+st+'/>';
    case 'diamond':return '<polygon class="'+c+'" points="0,'+Y+' '+w/2+',0 0,'+h/2+' '+X+',0"'+st+'/>';
    case 'parallelogram':k=Math.min(26,w*.16);return '<polygon class="'+c+'" points="'+(X+k)+','+Y+' '+w/2+','+Y+' '+(w/2-k)+','+h/2+' '+X+','+h/2+'"'+st+'/>';
    case 'circle':return '<ellipse class="'+c+'" cx="0" cy="0" rx="'+w/2+'" ry="'+h/2+'"'+st+'/>';
    case 'triangle':return '<polygon class="'+c+'" points="0,'+Y+' '+w/2+','+h/2+' '+X+','+h/2+'"'+st+'/>';
    case 'hexagon':k=Math.min(24,w*.16);return '<polygon class="'+c+'" points="'+(X+k)+','+Y+' '+(w/2-k)+','+Y+' '+w/2+',0 '+(w/2-k)+','+h/2+' '+(X+k)+','+h/2+' '+X+',0"'+st+'/>';
    case 'cylinder':k=Math.min(14,h*.14);
      return '<path class="'+c+'" d="M'+X+','+(Y+k)+' V'+(h/2-k)+' A'+w/2+','+k+' 0 0 0 '+w/2+','+(h/2-k)+' V'+(Y+k)+' A'+w/2+','+k+' 0 0 0 '+X+','+(Y+k)+'Z"'+st+'/>'+
        '<ellipse class="'+(c==='sh'?'sh-top':c)+'" cx="0" cy="'+(Y+k)+'" rx="'+w/2+'" ry="'+k+'"'+st+'/>';
    case 'document':k=wavH(h);
      return '<path class="'+c+'" d="M'+X+','+Y+' H'+w/2+' V'+(h/2-k)+' C'+(w/4)+','+(h/2+k*.7)+' '+(-w/4)+','+(h/2-k*2.3)+' '+X+','+(h/2-k*.6)+'Z"'+st+'/>';
    case 'cloud':
      var P=function(u,v){return (X+u*w).toFixed(1)+','+(Y+v*h).toFixed(1);};
      var A=function(r,u,v){return ' A'+(r*w).toFixed(1)+','+(r*h*1.25).toFixed(1)+' 0 0 1 '+P(u,v);};
      return '<path class="'+c+'" d="M'+P(.24,.9)+A(.17,.09,.56)+A(.2,.3,.2)+A(.22,.66,.14)+A(.19,.92,.46)+A(.17,.76,.9)+'Z"'+st+'/>';
    case 'text':return '<rect class="'+(c==='sh'?'sh-hit':c)+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="6"/>';
    case 'initial':return '<circle class="'+c+' fill-solid" cx="0" cy="0" r="'+w/2+'"'+st+'/>';
    case 'final':return '<circle class="'+c+'" cx="0" cy="0" r="'+w/2+'"'+st+'/><circle class="'+(c==='sh'?'sh fill-solid':c)+'" cx="0" cy="0" r="'+(w/2-6)+'"/>';
    case 'table':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="10"'+st+'/>'+
      '<path class="'+(c==='sh'?'sh-top':c)+'" d="M'+X+','+(Y+40)+' V'+(Y+10)+' Q'+X+','+Y+' '+(X+10)+','+Y+' H'+(w/2-10)+' Q'+w/2+','+Y+' '+w/2+','+(Y+10)+' V'+(Y+40)+'Z"'+st+'/>';
    case 'image':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="12"'+st+'/>';
    case 'class':return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="6"'+st+'/>';
    case 'person':k=Math.min(w,h)*.17;
      return '<circle class="'+c+'" cx="0" cy="'+(Y+k+1)+'" r="'+k+'"'+st+'/><rect class="'+c+'" x="'+X+'" y="'+(Y+2*k+6)+'" width="'+w+'" height="'+(h-2*k-6)+'" rx="'+Math.min(28,w*.22)+'"'+st+'/>';
    case 'node3d':k=Math.min(14,w*.08);
      return '<path class="'+c+'" d="M'+X+','+(Y+k)+' L'+(X+k)+','+Y+' H'+(w/2)+' V'+(h/2-k)+' L'+(w/2-k)+','+(h/2)+' H'+X+' Z"'+st+'/>'+
        '<path class="'+(c==='sh'?'sh-top':c)+'" d="M'+X+','+(Y+k)+' L'+(X+k)+','+Y+' H'+(w/2)+' L'+(w/2-k)+','+(Y+k)+' Z M'+(w/2-k)+','+(Y+k)+' L'+(w/2)+','+Y+' V'+(h/2-k)+' L'+(w/2-k)+','+(h/2)+' Z"'+st+'/>';
    default:return '<rect class="'+c+'" x="'+X+'" y="'+Y+'" width="'+w+'" height="'+h+'" rx="16"'+st+'/>';
  }
}
function textBox(n){
  // usable width factor and vertical centre offset for each shape
  var w=nw(n),h=nh(n),f=1,dy=0;
  switch(n.shape){
    case 'diamond':f=.56;break;case 'triangle':f=.5;dy=h*.18;break;case 'circle':f=.72;break;
    case 'hexagon':f=.8;break;case 'parallelogram':f=.8;break;case 'cloud':f=.66;dy=h*.05;break;
    case 'cylinder':dy=Math.min(14,h*.14)*.6;break;case 'document':dy=-wavH(h)*.4;break;case 'pill':f=.86;break;
  }
  if(n.shape==='image')return {w:w-24,h:30,dy:h/2-19};
  if(n.shape==='person'){var hk=Math.min(w,h)*.17,top=-h/2+2*hk+6;return {w:w-24,h:(h/2-top)*.86,dy:(top+h/2)/2};}
  if(n.shape==='node3d'){var dk=Math.min(14,w*.08);return {w:w-24-dk,h:(h-dk)*.82,dy:dk/2};}
  return {w:Math.max(30,(w-24)*f),h:h*(n.shape==='diamond'||n.shape==='triangle'?.55:.82),dy:dy};
}
function wrapText(text,maxc){
  var out=[];
  String(text||'').split('\n').forEach(function(par){
    var words=par.split(/\s+/).filter(Boolean),cur='';
    if(!words.length){out.push('');return;}
    words.forEach(function(w){
      while(w.length>maxc){if(cur){out.push(cur);cur='';}out.push(w.slice(0,maxc));w=w.slice(maxc);}
      if(!cur)cur=w;else if((cur+' '+w).length<=maxc)cur+=' '+w;else{out.push(cur);cur=w;}
    });
    if(cur)out.push(cur);
  });
  return out;
}
function iconShown(n){return !!n.icon&&nh(n)>=88&&['diamond','triangle','text','table','class','person','image','initial','final'].indexOf(n.shape)<0;}
// Every box offers eight anchors: the middle of each side and the four corners. A link starts and ends on one of them.
// A port is the anchor's point on the outline and the way a link leaves it (dx, dy). A corner leaves along the axis that
// points toward the far end, so the arrow always arrives the way the anchor faces.
var CORNER_R={rounded:16,rect:4,table:10,image:12,class:6,text:6,person:20};
function anchorPoint(n,a){
  var w=nw(n),h=nh(n),ext=showsInner(n)?6:0,hw=w/2,hh=h/2,sx=a.indexOf('r')>=0?1:-1,sy=a.indexOf('b')>=0?1:-1,k,r,by=hh;
  if(n.shape==='document')by=hh-wavH(h)*.35;
  var x,y;
  switch(n.shape){
    case 'diamond':x=sx*hw/2;y=sy*hh/2;break;
    case 'circle':case 'initial':case 'final':case 'cloud':r=n.shape==='cloud'?.62:.7071;x=sx*hw*r;y=sy*hh*r;break;
    case 'hexagon':k=Math.min(24,w*.16);x=sx*(hw-k);y=sy*hh;break;
    case 'parallelogram':k=Math.min(26,w*.16);x=sy<0?(sx>0?hw:-hw+k):(sx>0?hw-k:-hw);y=sy*hh;break;
    case 'triangle':x=sy<0?sx*hw/2:sx*hw;y=sy<0?0:hh;break;
    case 'cylinder':k=Math.min(14,h*.14);x=sx*hw;y=sy*(hh-k*.5);break;
    default:
      r=(n.shape==='pill'?hh:CORNER_R[n.shape]||16)*(1-.7071);r=Math.min(r,hw,hh);
      x=sx*(hw-r);y=sy*(sy>0?by-r:hh-r);
  }
  return {x:n.x+x+(sx>0?ext:0),y:n.y+y+(sy>0?ext:0)};
}
function port(n,a,toward,axis){
  var w=nw(n),h=nh(n),ix=w/2,iy=h/2,ext=showsInner(n)?6:0;
  if(n.shape==='parallelogram')ix=w/2-Math.min(26,w*.16)/2;
  if(n.shape==='triangle')ix=w/4;
  var by=iy;if(n.shape==='document')by=iy-wavH(h)*.35;
  if(a==='l')return {x:n.x-ix,y:n.y,dx:-1,dy:0};
  if(a==='r')return {x:n.x+ix+ext,y:n.y,dx:1,dy:0};
  if(a==='t')return {x:n.x,y:n.y-iy,dx:0,dy:-1};
  if(a==='b')return {x:n.x,y:n.y+by+ext,dx:0,dy:1};
  var q=anchorPoint(n,a),sx=a.indexOf('r')>=0?1:-1,sy=a.indexOf('b')>=0?1:-1;
  if(!axis){
    var tx=toward?toward.x-q.x:sx,ty=toward?toward.y-q.y:0,okx=sx*tx>0,oky=sy*ty>0;
    axis=okx&&!oky?'h':oky&&!okx?'v':Math.abs(tx)>=Math.abs(ty)?'h':'v';
  }
  q.dx=axis==='h'?sx:0;q.dy=axis==='v'?sy:0;return q;
}
// the anchor nearest a point
function anchorNear(n,p){
  var best='r',bd=Infinity;
  SIDES.forEach(function(a){var q=anchorPoint(n,a),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;best=a;}});
  return best;
}
// the pair of side middles a link between two boxes uses on its own
var SIDES=['t','tr','r','br','b','bl','l','tl'];
var SIDE_MIDS=['t','r','b','l'];
var ANCHOR_NAMES={t:'Top',tr:'Top right',r:'Right',br:'Bottom right',b:'Bottom',bl:'Bottom left',l:'Left',tl:'Top left'};
function sides(a,b,dir){
  var dx=b.x-a.x,dy=b.y-a.y,horiz;
  if(dir==='LR'){
    if(dx<-20&&Math.abs(dy)<(nh(a)+nh(b))*.75)return ['t','t'];
    horiz=Math.abs(dx)*100*1.6>Math.abs(dy)*170;
  }else{
    if(dy<-20&&Math.abs(dx)<(nw(a)+nw(b))*.5)return ['r','r'];
    if(dy<-20)return dx>=0?['r','l']:['l','r'];
    horiz=Math.abs(dx)*100*.6>Math.abs(dy)*170;
  }
  if(horiz)return dx>=0?['r','l']:['l','r'];
  return dy>=0?['b','t']:['t','b'];
}
function sideToward(n,p){var dx=(p.x-n.x)/(nw(n)/2),dy=(p.y-n.y)/(nh(n)/2);return Math.abs(dx)>=Math.abs(dy)?(dx>=0?'r':'l'):(dy>=0?'b':'t');}
