/* ================= layered auto-layout ================= */
// With no direction set, try both and keep the one that fits a landscape screen best.
function autoLayout(l){
  var dirs=(l.direction==='LR'||l.direction==='TB')?[l.direction]:['LR','TB'];
  var pref=l.direction||(levelType(l)==='process'?'TB':'LR'),best=null;
  dirs.forEach(function(d){
    for(var k=1;k<=3;k++){
      l.direction=d;var L=layoutLevel(l,k);if(k>1&&(L<7||L<=k*3))break;
      var b=contentBox(l),sc=Math.min(1400/Math.max(b.w,1),760/Math.max(b.h,1))*(d===pref?1.25:1)*Math.pow(.85,k-1);
      if(!best||sc>best.s)best={s:sc,d:d,pos:l.nodes.map(function(n){return [n.x,n.y];})};
    }
  });
  l.direction=best.d;l.nodes.forEach(function(n,i){n.x=best.pos[i][0];n.y=best.pos[i][1];});
}
// Pack items along a line in their given order: each wants a centre, neighbours keep a gap, all stay in [lo,hi].
// Least-squares fit by pooling adjacent violators.
function packLine(want,size,gap,lo,hi){
  var n=want.length,off=[0],i;
  for(i=1;i<n;i++)off[i]=off[i-1]+(size[i-1]+size[i])/2+gap[i];
  var bl=[];
  for(i=0;i<n;i++){bl.push({s:want[i]-off[i],c:1});while(bl.length>1&&bl[bl.length-2].s/bl[bl.length-2].c>bl[bl.length-1].s/bl[bl.length-1].c){var t=bl.pop();bl[bl.length-1].s+=t.s;bl[bl.length-1].c+=t.c;}}
  var L=lo+size[0]/2,H=hi-size[n-1]/2-off[n-1],out=[],k=0;
  bl.forEach(function(b){var v=clamp(b.s/b.c,L,Math.max(L,H));for(var j=0;j<b.c;j++,k++)out.push(v+off[k]);});
  return out;
}
function layoutLevel(l,chunks){
  var ns=l.nodes,N=ns.length;if(!N)return 0;chunks=chunks||1;
  var dir=levelDir(l),idx={};ns.forEach(function(n,i){idx[n.id]=i;});
  var out=ns.map(function(){return [];});
  // inheritance points from child to parent, but parents sit first
  l.edges.forEach(function(e){var a=idx[e.from],b=idx[e.to];if(a==null||b==null||a===b)return;if(e.rel==='inherits'||e.rel==='implements'){var t=a;a=b;b=t;}if(out[a].indexOf(b)<0)out[a].push(b);});
  // break cycles with a DFS that starts from inputs, then sources
  var hasIn=new Array(N).fill(false);out.forEach(function(vs){vs.forEach(function(v){hasIn[v]=true;});});
  var order=[];ns.forEach(function(n,i){if(n.role==='input')order.push(i);});
  ns.forEach(function(n,i){if(order.indexOf(i)<0&&!hasIn[i])order.push(i);});
  ns.forEach(function(n,i){if(order.indexOf(i)<0)order.push(i);});
  var st=new Array(N).fill(0),dag=ns.map(function(){return [];}),seen=[];
  function dfs(u){st[u]=1;seen.push(u);out[u].forEach(function(v){if(st[v]===1){if(dag[v].indexOf(u)<0)dag[v].push(u);}else{if(dag[u].indexOf(v)<0)dag[u].push(v);if(!st[v])dfs(v);}});st[u]=2;}
  order.forEach(function(u){if(!st[u])dfs(u);});
  var pred=ns.map(function(){return [];});dag.forEach(function(vs,u){vs.forEach(function(v){pred[v].push(u);});});
  // longest-path layering (Kahn)
  var indeg=pred.map(function(p){return p.length;}),layer=new Array(N).fill(0),q=[];
  for(var i=0;i<N;i++)if(!indeg[i])q.push(i);
  while(q.length){var u=q.shift();dag[u].forEach(function(v){layer[v]=Math.max(layer[v],layer[u]+1);if(--indeg[v]===0)q.push(v);});}
  // pull plain sources (not marked inputs) right, next to their first consumer
  for(var pass=0;pass<2;pass++)ns.forEach(function(n,i){if(!pred[i].length&&dag[i].length){var m=Math.min.apply(null,dag[i].map(function(v){return layer[v];}));layer[i]=Math.max(layer[i],m-1);}});
  var maxL=Math.max.apply(null,layer);
  ns.forEach(function(n,i){if(n.role==='output'&&!dag[i].length)layer[i]=Math.max(layer[i],maxL);});
  // an edge that skips layers gets a placeholder in each layer it crosses: ordering then sees it, and a lane is kept free for its route
  var S=dag.map(function(v){return v.slice();}),P=pred.map(function(v){return v.slice();}),grp=ns.map(function(n){return n.group||'';}),M=N,gr={};
  ns.forEach(function(n,i){var k=grp[i],r=gr[k]=gr[k]||{a:Infinity,b:-Infinity};r.a=Math.min(r.a,layer[i]);r.b=Math.max(r.b,layer[i]);});
  function within(k,L){var r=gr[k];return !!r&&L>=r.a&&L<=r.b;}
  for(var u0=0;u0<N;u0++)dag[u0].forEach(function(v){
    var span=layer[v]-layer[u0];if(span<2)return;
    S[u0].splice(S[u0].indexOf(v),1);P[v].splice(P[v].indexOf(u0),1);
    var prev=u0;
    for(var k=1;k<span;k++){var d=M++,L1=layer[u0]+k;layer[d]=L1;grp[d]=within(grp[u0],L1)?grp[u0]:within(grp[v],L1)?grp[v]:'';S[d]=[];P[d]=[prev];S[prev].push(d);prev=d;}
    S[prev].push(v);P[v].push(prev);
  });
  var layers=[];for(var L=0;L<=maxL;L++)layers.push([]);
  seen.forEach(function(u){layers[layer[u]].push(u);});
  for(var d0=N;d0<M;d0++)layers[layer[d0]].push(d0);
  var pos=new Array(M).fill(0);
  layers.forEach(function(ly){ly.forEach(function(u,k){pos[u]=k-(ly.length-1)/2;});});
  var gOrder={};l.groups.forEach(function(g,k){gOrder[g.id]=k;});
  function sweep(down){
    var seq=down?layers.slice(1):layers.slice(0,-1).reverse();
    seq.forEach(function(ly){
      var bc={};
      ly.forEach(function(u){
        var nb=down?P[u]:S[u];
        bc[u]=nb.length?nb.reduce(function(s,v){return s+pos[v];},0)/nb.length:pos[u];
      });
      // cluster by group so members stay together
      var clusters={},keys=[];
      ly.forEach(function(u){var k=grp[u]?'g:'+grp[u]:'n:'+u;if(!clusters[k]){clusters[k]=[];keys.push(k);}clusters[k].push(u);});
      keys.forEach(function(k){clusters[k].sort(function(a,b){return bc[a]-bc[b];});});
      var cb={};keys.forEach(function(k){cb[k]=clusters[k].reduce(function(s,u){return s+bc[u];},0)/clusters[k].length;});
      keys.sort(function(a,b){return cb[a]-cb[b];});
      var res=[];keys.forEach(function(k){res=res.concat(clusters[k]);});
      ly.length=0;Array.prototype.push.apply(ly,res);
      ly.forEach(function(u,k){pos[u]=k-(ly.length-1)/2;});
    });
  }
  for(var it=0;it<8;it++)sweep(it%2===0);
  // coordinates: each group gets its own band across the cross axis, so group boxes never overlap
  var GAPM=dir==='LR'?110:80,GAPC=dir==='LR'?56:64,BAND=l.groups.length?120:GAPC,LANE=14;
  var main=function(u){return u>=N?0:dir==='LR'?nw(ns[u]):nh(ns[u]);};
  var crossS=function(u){return u>=N?LANE:dir==='LR'?nh(ns[u]):nw(ns[u]);};
  var gapOf=function(a,b){return a>=N||b>=N?22:GAPC;};
  var bands={},bkeys=[];
  layers.forEach(function(ly,li){ly.forEach(function(u){var k=grp[u];if(!bands[k]){bands[k]={sum:0,c:0,size:0,a:li,b:li};bkeys.push(k);}var B=bands[k];B.sum+=pos[u];B.c++;B.a=Math.min(B.a,li);B.b=Math.max(B.b,li);});});
  bkeys.sort(function(a,b){return bands[a].sum/bands[a].c-bands[b].sum/bands[b].c;});
  function span(mem){var t=0;mem.forEach(function(u,i){t+=crossS(u)+(i?gapOf(mem[i-1],u):0);});return t;}
  var perLayer=layers.map(function(ly){
    var m={};bkeys.forEach(function(k){m[k]=ly.filter(function(u){return grp[u]===k;}).sort(function(a,b){return pos[a]-pos[b];});});
    bkeys.forEach(function(k){bands[k].size=Math.max(bands[k].size,span(m[k]));});
    return m;
  });
  // bands only need their own cross-axis room where their layers overlap; groups that follow one another share a line
  var placed=[],lo0=Infinity,hi0=-Infinity;
  bkeys.forEach(function(k){
    var B=bands[k],c=0,clash=placed.filter(function(o){return o.a<=B.b&&B.a<=o.b;});
    if(clash.length){
      var cand=[0];clash.forEach(function(o){cand.push(o.c+(o.size+B.size)/2+BAND,o.c-(o.size+B.size)/2-BAND);});
      cand=cand.filter(function(x){return clash.every(function(o){return Math.abs(x-o.c)>=(o.size+B.size)/2+BAND-1;});});
      cand.sort(function(x,y){return Math.abs(x)-Math.abs(y)||y-x;});c=cand[0];
    }
    B.c=c;B.start=c-B.size/2;placed.push(B);lo0=Math.min(lo0,B.start);hi0=Math.max(hi0,B.start+B.size);
  });
  var total=hi0-lo0;bkeys.forEach(function(k){bands[k].start-=lo0+total/2;bands[k].c-=lo0+total/2;});
  // long flows wrap into several columns (TB) or rows (LR)
  var R=Math.ceil(layers.length/chunks),CH=140,mpos=0,mainAt=[],coffAt=[],cr=new Array(M);
  layers.forEach(function(ly,li){
    if(li%R===0)mpos=0;
    coffAt[li]=Math.floor(li/R)*(total+CH);
    var ext=ly.length?Math.max.apply(null,ly.map(main)):0;
    mainAt[li]=mpos+ext/2;
    bkeys.forEach(function(k){
      var mem=perLayer[li][k];if(!mem.length)return;
      var c=bands[k].start+(bands[k].size-span(mem))/2;
      mem.forEach(function(u,i){if(i)c+=gapOf(mem[i-1],u);var sz=crossS(u);cr[u]=c+sz/2;c+=sz;});
    });
    if(ly.length)mpos+=ext+GAPM;
  });
  // straighten: pull each item to the median of its neighbours, keeping the order, the gaps and its group band
  function median(a){a=a.slice().sort(function(x,y){return x-y;});var m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;}
  for(var it2=0;it2<8;it2++){
    var down=it2%2===0,lis=layers.map(function(_,i){return i;});if(!down)lis.reverse();
    lis.forEach(function(li){
      bkeys.forEach(function(k){
        var mem=perLayer[li][k];if(!mem.length)return;
        // real nodes line up with real neighbours first, so a chain stays straight even when long edges pass beside it
        var want=mem.map(function(u){var nb=(down?P[u]:S[u]).concat(it2>3?(down?S[u]:P[u]):[]),rn=u<N?nb.filter(function(v){return v<N;}):nb;if(rn.length)nb=rn;return nb.length?median(nb.map(function(v){return cr[v];})):cr[u];});
        var got=packLine(want,mem.map(crossS),mem.map(function(u,i){return i?gapOf(mem[i-1],u):0;}),bands[k].start,bands[k].start+bands[k].size);
        mem.forEach(function(u,i){cr[u]=got[i];});
      });
    });
  }
  layers.forEach(function(ly,li){ly.forEach(function(u){if(u>=N)return;var c=cr[u]+coffAt[li];if(dir==='LR'){ns[u].x=snap(mainAt[li]);ns[u].y=snap(c);}else{ns[u].y=snap(mainAt[li]);ns[u].x=snap(c);}});});
  return layers.length;
}

