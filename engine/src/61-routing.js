function levelRoute(l){return l.route==='orthogonal'||l.route==='straight'||l.route==='curved'?l.route:'orthogonal';}
function edgeRoute(e,l){return e.route==='orthogonal'||e.route==='straight'||e.route==='curved'?e.route:levelRoute(l);}
function edgeGeom(e,l){var i=l.edges.indexOf(e);return i<0?null:levelRoutes(l)[i]||null;}
// All edges of a level are routed together. Links end on one of a box's eight anchors; links that share an end share its
// anchor and travel as one bundle. Routes go around other nodes, and each route pays to reuse a lane an earlier one took,
// so links that are not related stay apart.
// leaving or arriving by a side other than the flow's own has to save more than this (about one and a half bends)
var FLOW_BIAS=60;
var routeMemo={key:null,res:null};
function levelRoutes(l){
  var key=JSON.stringify([mode,l.route,l.direction,l.nodes.map(function(n){return [n.id,n.x,n.y,n.w,n.h,n.shape,n.role,n.tags,!!n.children];}),l.edges.map(function(e){return [e.from,e.to,e.route,e.points,e.fromSide,e.toSide];})]);
  if(routeMemo.key===key&&routeMemo.l===l)return routeMemo.res;
  var dir=levelDir(l),ends=[],res=[];
  var obs=l.nodes.map(function(n){var b=nodeBox(n),P=14;return {id:n.id,x0:b.x-P,y0:b.y-P,x1:b.x+b.w+P,y1:b.y+b.h+P};});
  l.edges.forEach(function(e,i){
    var a=findNode(e.from,l),b=findNode(e.to,l);if(!a||!b||a===b)return;
    var pts=Array.isArray(e.points)?e.points.filter(function(p){return Array.isArray(p)&&isFinite(p[0])&&isFinite(p[1]);}).map(function(p){return {x:+p[0],y:+p[1]};}):[];
    var up=e.rel==='inherits'||e.rel==='implements',rt=edgeRoute(e,l),sd=pts.length?[sideToward(a,pts[0]),sideToward(b,pts[pts.length-1])]:rt==='straight'?[sideToward(a,b),sideToward(b,a)]:up?sides(b,a,dir).reverse():sides(a,b,dir);
    // ends the user pinned to an anchor keep it
    var fs=SIDES.indexOf(e.fromSide)>=0?e.fromSide:null,ts=SIDES.indexOf(e.toSide)>=0?e.toSide:null;
    if(fs)sd[0]=fs;if(ts)sd[1]=ts;
    var ta=pts.length?pts[0]:b,tb=pts.length?pts[pts.length-1]:a;
    // a route that has to go around things leaves from whichever pair of sides gives the cheapest way round
    if(!pts.length&&rt!=='straight'&&(rt==='orthogonal'||!clearOf(bezier(port(a,sd[0],ta),port(b,sd[1],tb),sd).samples,obs,a.id,b.id))){
      var best=null;sideCands(a,b,sd).forEach(function(c){if((fs&&c[0]!==fs)||(ts&&c[1]!==ts))return;var r=orthRoute(port(a,c[0],ta),port(b,c[1],tb),obs,{});var cost=r&&r.cost+(c[0]!==sd[0]?FLOW_BIAS:0)+(c[1]!==sd[1]?FLOW_BIAS:0);if(r&&(!best||cost<best.cost))best={cost:cost,sd:c};});
      if(best)sd=best.sd;
    }
    ends[i]={a:a,b:b,pts:pts,sd:sd,fs:fs,ts:ts,ta:ta,tb:tb,ax:[null,null]};
  });
  // an arrow must never run along a link that leaves the same anchor, so an anchor used both ways hands its
  // minority over to the nearest corner of that side (the link still leaves along the side's own axis)
  var held={};
  ends.forEach(function(x,i){if(x)[0,1].forEach(function(j){var k=(j?x.b:x.a).id+'|'+x.sd[j];(held[k]=held[k]||[]).push({i:i,j:j});});});
  Object.keys(held).forEach(function(k){
    var h=held[k],outs=h.filter(function(s){return !s.j;}),ins=h.filter(function(s){return s.j;}),side=k.slice(k.lastIndexOf('|')+1);
    if(!outs.length||!ins.length||side.length>1)return;
    var mv=ins.length<outs.length?ins:outs;
    mv.forEach(function(s){
      var x=ends[s.i];if(x.pts.length||(s.j?x.ts:x.fs))return;
      var n=s.j?x.b:x.a,far=s.j?x.a:x.b,hz=side==='l'||side==='r',c=hz?(far.y<n.y?'t':'b'):(far.x<n.x?'l':'r');
      x.sd[s.j]=hz?c+side:side+c;x.ax[s.j]=hz?'h':'v';
    });
  });
  // links through a corner anchor
  function portOf(x,j){return port(j?x.b:x.a,x.sd[j],j?x.tb:x.ta,x.ax[j]);}
  var order=ends.map(function(x,i){return i;}).filter(function(i){return ends[i];});
  order.sort(function(i,j){var p=ends[i],q=ends[j];return (Math.abs(p.a.x-p.b.x)+Math.abs(p.a.y-p.b.y))-(Math.abs(q.a.x-q.b.x)+Math.abs(q.a.y-q.b.y));});
  // a link with a clear way gets a curve; one that has to go around things is routed, and routes
  // sharing a lane are nudged apart, so unrelated links never run on top of each other
  var used={},routed=[];
  order.forEach(function(i){
    var x=ends[i],e=l.edges[i],pa=portOf(x,0),pb=portOf(x,1),rt=edgeRoute(e,l);
    x.pa=pa;x.pb=pb;
    if(x.pts.length)res[i]=throughPoints(pa,pb,x.pts,rt);
    else if(rt==='straight')res[i]=polyGeom([pa,pb],0);
    else{
      var bz=bezier(pa,pb,x.sd);
      if(rt==='curved'&&clearOf(bz.samples,obs,x.a.id,x.b.id))res[i]=bz;
      else{
        // elbow links that share an anchor are one bundle: they run together, branching near their targets
        var tags=rt==='orthogonal'?['o'+x.a.id+'|'+x.sd[0],'i'+x.b.id+'|'+x.sd[1]]:null,pl=orthRoute(pa,pb,obs,used,tags);
        if(pl)routed.push({i:i,pts:pl.pts,R:rt==='curved'?28:10,tags:tags});else res[i]=bz;
      }
    }
  });
  nudge(routed);
  routed.forEach(function(r){res[r.i]=polyGeom(simplify(r.pts),r.R);});
  ends.forEach(function(x,i){if(x&&res[i]){res[i].pa=x.pa;res[i].pb=x.pb;res[i].sd=x.sd;}});
  spreadLabels(l,res);
  routeMemo={key:key,l:l,res:res};
  return res;
}
// Labels sit halfway along their link. Links that travel as one bundle share their middle, so a label that would
// land on another one slides along its own path to the nearest free spot.
function spreadLabels(l,res){
  var placed=[];
  l.edges.forEach(function(e,i){
    var g=res[i];if(!g||!e.label)return;
    var w=e.label.length*6.9+18,p=labelXY(e,g);
    function free(q){return !placed.some(function(o){return Math.abs(o.x-q.x)<(o.w+w)/2+4&&Math.abs(o.y-q.y)<26;});}
    if(g.poly&&!(typeof e.labelT==='number'&&isFinite(e.labelT))&&!free(p)){
      var fs=[.38,.62,.26,.74,.14,.86],k;
      for(k=0;k<fs.length;k++){var q=alongPoly(g.poly,fs[k]);if(free(q)){g.mx=q.x;g.my=q.y;p=q;break;}}
    }
    placed.push({x:p.x,y:p.y,w:w});
  });
}
function bezier(pa,pb,sd){
  var dist=Math.hypot(pb.x-pa.x,pb.y-pa.y),k=sd[0]===sd[1]?Math.max(70,dist*.3):Math.min(140,dist*.45),k1=k,k2=k;
  var c1={x:pa.x+pa.dx*k1,y:pa.y+pa.dy*k1},c2={x:pb.x+pb.dx*k2,y:pb.y+pb.dy*k2},sm=[];
  for(var t=0;t<=1.0001;t+=1/24)sm.push(cubicAt(pa,c1,c2,pb,t));
  var m=cubicAt(pa,c1,c2,pb,.5);
  return {d:'M'+pa.x+' '+pa.y+'C'+c1.x+' '+c1.y+' '+c2.x+' '+c2.y+' '+pb.x+' '+pb.y,mx:m.x,my:m.y,samples:sm,mids:[{x:m.x,y:m.y,k:0}]};
}
function cubicAt(p0,p1,p2,p3,t){var u=1-t;return {x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y};}
function clearOf(pts,obs,ida,idb){
  return !pts.some(function(p,k){if(k<2||k>pts.length-3)return false;return obs.some(function(o){if(o.id===ida||o.id===idb)return false;return p.x>o.x0+10&&p.x<o.x1-10&&p.y>o.y0+10&&p.y<o.y1-10;});});
}
// Orthogonal route on the grid of obstacle borders and the lanes between them (A*, bends and reused lanes cost extra).
// Links that share a bundle tag (the same end) find a lane their bundle already took cheaper, so they run together.
var orthSeq=0;
function orthRoute(pa,pb,obs,used,tags){
  function stub(p){
    var o=null;obs.forEach(function(b){if(p.x>=b.x0-1&&p.x<=b.x1+1&&p.y>=b.y0-1&&p.y<=b.y1+1){var d=p.dx>0?b.x1-p.x:p.dx<0?p.x-b.x0:p.dy>0?b.y1-p.y:p.y-b.y0;if(!o||d>o)o=d;}});
    var d=Math.max(16,(o||0)+2);return {x:p.x+p.dx*d,y:p.y+p.dy*d};
  }
  var s=stub(pa),t=stub(pb),xs=[s.x,t.x],ys=[s.y,t.y],lo={x:Math.min(s.x,t.x),y:Math.min(s.y,t.y)},hi={x:Math.max(s.x,t.x),y:Math.max(s.y,t.y)};
  obs.forEach(function(b){xs.push(b.x0,b.x1);ys.push(b.y0,b.y1);lo.x=Math.min(lo.x,b.x0);lo.y=Math.min(lo.y,b.y0);hi.x=Math.max(hi.x,b.x1);hi.y=Math.max(hi.y,b.y1);});
  xs.push(lo.x-30,hi.x+30);ys.push(lo.y-30,hi.y+30);
  function lanes(v){v=v.map(function(z){return Math.round(z);}).sort(function(a,b){return a-b;}).filter(function(z,i,a){return !i||z!==a[i-1];});var r=[];v.forEach(function(z,i){if(i&&z-v[i-1]>24)r.push(Math.round((z+v[i-1])/2));r.push(z);});return r;}
  xs=lanes(xs);ys=lanes(ys);
  var X=xs.length,Y=ys.length,ix=xs.indexOf(Math.round(s.x)),iy=ys.indexOf(Math.round(s.y)),tx=xs.indexOf(Math.round(t.x)),ty=ys.indexOf(Math.round(t.y));
  if(ix<0||iy<0||tx<0||ty<0)return null;
  function inside(x,y){for(var k=0;k<obs.length;k++){var b=obs[k];if(x>b.x0&&x<b.x1&&y>b.y0&&y<b.y1)return true;}return false;}
  var DX=[1,-1,0,0],DY=[0,0,1,-1],BEND=40,CROSS=45,me=tags||['~'+(++orthSeq)];
  function mine(u){return u.some(function(g){return me.indexOf(g)>=0;});}
  function foreign(u){return !mine(u);}
  var d0=pa.dx>0?0:pa.dx<0?1:pa.dy>0?2:3,dEnd=pb.dx>0?1:pb.dx<0?0:pb.dy>0?3:2;
  var cost=new Float64Array(X*Y*4).fill(Infinity),from=new Int32Array(X*Y*4).fill(-1),heap=[];
  function push(st,c){heap.push([c,st]);var i=heap.length-1;while(i){var p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;var tmp=heap[p];heap[p]=heap[i];heap[i]=tmp;i=p;}}
  function pop(){var top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;var i=0;for(;;){var a=2*i+1,b=a+1,m=i;if(a<heap.length&&heap[a][0]<heap[m][0])m=a;if(b<heap.length&&heap[b][0]<heap[m][0])m=b;if(m===i)break;var tmp=heap[m];heap[m]=heap[i];heap[i]=tmp;i=m;}}return top;}
  function hcost(x,y){return Math.abs(xs[x]-xs[tx])+Math.abs(ys[y]-ys[ty]);}
  var s0=(iy*X+ix)*4+d0;cost[s0]=0;push(s0,hcost(ix,iy));
  var goal=-1,guard=0;
  while(heap.length&&guard++<60000){
    var it=pop(),st=it[1],c=cost[st],dd=st%4,cell=(st-dd)/4,cx=cell%X,cy=(cell-cx)/X;
    if(it[0]>c+hcost(cx,cy)+1e-6)continue;
    if(cx===tx&&cy===ty){goal=st;break;}
    for(var nd=0;nd<4;nd++){
      if((nd^1)===dd&&nd>>1===dd>>1)continue;
      var nx=cx+DX[nd],ny=cy+DY[nd];if(nx<0||ny<0||nx>=X||ny>=Y)continue;
      var mx=(xs[cx]+xs[nx])/2,my=(ys[cy]+ys[ny])/2;if(inside(mx,my))continue;
      var seg=nd<2?'h'+Math.min(cx,nx)+','+cy:'v'+cx+','+Math.min(cy,ny);
      var vk=nx+','+ny,len=Math.abs(xs[nx]-xs[cx])+Math.abs(ys[ny]-ys[cy]),us=used[seg]||[],nc=c+len*(us.some(mine)?.35:1)+(nd!==dd?BEND:0)+us.filter(foreign).length*60+((nd<2?used['V'+vk]:used['H'+vk])||[]).filter(foreign).length*CROSS;
      if(nx===tx&&ny===ty&&nd!==dEnd)nc+=BEND;
      var ns2=(ny*X+nx)*4+nd;if(nc<cost[ns2]){cost[ns2]=nc;from[ns2]=st;push(ns2,nc+hcost(nx,ny));}
    }
  }
  if(goal<0)return null;
  var cells=[];for(var g=goal;g>=0;g=from[g])cells.push((g-g%4)/4);cells.reverse();
  // remember the lanes and crossing points this route took, so later routes avoid running on it or across it
  for(var q=1;q<cells.length;q++){
    var a1=cells[q-1],b1=cells[q],ax=a1%X,ay=(a1-ax)/X,bx=b1%X,by=(b1-bx)/X,hz=ay===by,key=hz?'h'+Math.min(ax,bx)+','+ay:'v'+ax+','+Math.min(ay,by);
    (used[key]=used[key]||[]).push(me);
    [(hz?'H':'V')+ax+','+ay,(hz?'H':'V')+bx+','+by].forEach(function(m){(used[m]=used[m]||[]).push(me);});
  }
  var pts=[{x:pa.x,y:pa.y}];cells.forEach(function(c){var x=c%X;pts.push({x:xs[x],y:ys[(c-x)/X]});});pts.push({x:pb.x,y:pb.y});
  // the stubs leave the ports straight; keep the port's own coordinate so the first and last legs are exact
  pts[1]=pa.dx?{x:pts[1].x,y:pa.y}:{x:pa.x,y:pts[1].y};pts[pts.length-2]=pb.dx?{x:pts[pts.length-2].x,y:pb.y}:{x:pb.x,y:pts[pts.length-2].y};
  return {pts:simplify(pts),cost:cost[goal]};
}
function sideCands(a,b,sd){
  var hz=Math.abs(b.x-a.x)/(nw(a)+nw(b))>=Math.abs(b.y-a.y)/(nh(a)+nh(b)),fa=sideToward(a,b),fb=sideToward(b,a);
  var pa=hz?(b.y>=a.y?'b':'t'):(b.x>=a.x?'r':'l'),pb=hz?(a.y>=b.y?'b':'t'):(a.x>=b.x?'r':'l');
  var out=[];[sd,[fa,fb],[pa,fb],[fa,pb],[pa,pb]].forEach(function(c){if(!out.some(function(o){return o[0]===c[0]&&o[1]===c[1];}))out.push(c);});
  return out;
}
// Segments of different routes that share a line are spread across it, ordered so they don't cross:
// a run that comes from (and goes back to) the low side of the bundle sits on the low side.
// End segments stay put, since they are attached to ports.
function nudge(routes){
  ['h','v'].forEach(function(ax){
    var c=ax==='h'?'y':'x',o=ax==='h'?'x':'y',segs=[];
    routes.forEach(function(r){
      for(var k=1;k<r.pts.length-2;k++){
        var p=r.pts[k],q=r.pts[k+1];if(Math.abs(p[c]-q[c])>.5)continue;
        var pr=r.pts[k-1],nx=r.pts[k+2];
        segs.push({r:r,k:k,c:p[c],a:Math.min(p[o],q[o]),b:Math.max(p[o],q[o]),side:(pr[c]-p[c])+(nx[c]-p[c])});
      }
    });
    segs.sort(function(s1,s2){return s1.c-s2.c||s1.a-s2.a;});
    for(var i=0;i<segs.length;){
      var j=i+1,end=segs[i].b;
      while(j<segs.length&&Math.abs(segs[j].c-segs[i].c)<1&&segs[j].a<end-1){end=Math.max(end,segs[j].b);j++;}
      var bundle=segs.slice(i,j);i=j;
      if(bundle.length<2||bundle.every(function(s){return s.r===bundle[0].r;}))continue;
      // routes of one bundle (they share an end) already agree on this lane: they move together
      var lanes=[];
      bundle.forEach(function(s){
        var ln=lanes.find(function(q){return q.segs.some(function(o){return o.r===s.r||(s.r.tags&&o.r.tags&&s.r.tags.some(function(g){return o.r.tags.indexOf(g)>=0;}));});});
        if(ln){ln.segs.push(s);ln.side+=s.side;}else lanes.push({segs:[s],side:s.side});
      });
      if(lanes.length<2)continue;
      lanes.sort(function(p,q){return p.side/p.segs.length-q.side/q.segs.length;});
      var sp=Math.min(10,24/(lanes.length-1));
      lanes.forEach(function(ln,n){var d=(n-(lanes.length-1)/2)*sp;ln.segs.forEach(function(s){s.r.pts[s.k][c]+=d;s.r.pts[s.k+1][c]+=d;});});
    }
  });
}
function simplify(pts){
  var out=[pts[0]];
  for(var i=1;i<pts.length;i++){
    var p=pts[i],a=out[out.length-1];if(Math.abs(p.x-a.x)<.5&&Math.abs(p.y-a.y)<.5)continue;
    if(out.length>1){var b=out[out.length-2];if((Math.abs(b.x-a.x)<.5&&Math.abs(a.x-p.x)<.5)||(Math.abs(b.y-a.y)<.5&&Math.abs(a.y-p.y)<.5)){out[out.length-1]=p;continue;}}
    out.push(p);
  }
  return out;
}
// a polyline with rounded corners; its label sits halfway along it
function polyGeom(pts,R){
  var d='M'+pts[0].x+' '+pts[0].y;
  for(var i=1;i<pts.length;i++){
    var p=pts[i];
    if(i<pts.length-1&&R){
      var a=pts[i-1],b=pts[i+1],la=Math.hypot(p.x-a.x,p.y-a.y),lb=Math.hypot(b.x-p.x,b.y-p.y),r=Math.min(R,la/2,lb/2);
      d+=' L'+(p.x+(a.x-p.x)*r/la)+' '+(p.y+(a.y-p.y)*r/la)+' Q'+p.x+' '+p.y+' '+(p.x+(b.x-p.x)*r/lb)+' '+(p.y+(b.y-p.y)*r/lb);
    }else d+=' L'+p.x+' '+p.y;
  }
  var m=alongPoly(pts,.5);
  return {d:d,mx:m.x,my:m.y,poly:pts,mids:[{x:m.x,y:m.y,k:0}]};
}
function alongPoly(pts,f){
  var L=0,i;for(i=1;i<pts.length;i++)L+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  var want=L*f;for(i=1;i<pts.length;i++){var s=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);if(want<=s&&s>0){var t=want/s;return {x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*t};}want-=s;}
  return pts[pts.length-1];
}
// a route through bend points the user placed. It leaves and arrives the way its anchors face: a short stub
// goes out of each end before the first bend, so moving an end to another anchor turns the arrow with it.
function throughPoints(pa,pb,pts,rt){
  var S=rt==='straight'?0:18,sa=S?{x:pa.x+pa.dx*S,y:pa.y+pa.dy*S}:null,sb=S?{x:pb.x+pb.dx*S,y:pb.y+pb.dy*S}:null;
  var C=[pa].concat(sa?[sa]:[],pts,sb?[sb]:[],[pb]),off=sa?1:0,tail=sb?2:1,g;
  // the handle halfway along leg j (from C[j-1] to C[j]) adds a bend at that place; the stubs get none
  function mid(j,x,y){return j>off&&j<=C.length-tail?{x:x,y:y,k:Math.min(pts.length,j-1-off)}:null;}
  function mids(){return C.slice(1).map(function(b,j){return mid(j+1,(C[j].x+b.x)/2,(C[j].y+b.y)/2);}).filter(Boolean);}
  if(rt==='orthogonal'){
    var P=[pa],hz=!!pa.dx,ms=[];
    for(var j=1;j<C.length;j++){
      var a=P[P.length-1],b=C[j];
      if(Math.abs(a.x-b.x)>.5&&Math.abs(a.y-b.y)>.5){
        // the turn into the last stub is made so the final leg runs along the anchor's own axis
        var el=sb&&j===C.length-2?(pb.dx?{x:b.x,y:a.y}:{x:a.x,y:b.y}):(hz?{x:b.x,y:a.y}:{x:a.x,y:b.y}),m=mid(j,el.x,el.y);
        if(m)ms.push(m);P.push(el);
      }else{var m2=mid(j,(a.x+b.x)/2,(a.y+b.y)/2);if(m2)ms.push(m2);}
      P.push(b);hz=Math.abs(b.y-P[P.length-2].y)<.5;
    }
    g=polyGeom(simplify(P),10);g.mids=ms;return g;
  }
  // curved: a polyline with soft corners that goes exactly where the bends are, and cannot overshoot or loop
  g=polyGeom(C,rt==='curved'?34:6);g.mids=mids();return g;
}
