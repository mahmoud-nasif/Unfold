/* ================= sequence layout ================= */
function seqTop(l){return Math.max.apply(null,[30].concat(l.nodes.map(function(n){return nh(n)/2;})));}
function seqY(l,i){return seqTop(l)+SEQ.first+i*SEQ.step;}
function seqBottom(l){return seqY(l,Math.max(0,l.edges.length))+10;}
function seqLayout(l){
  var x=0;
  l.nodes.forEach(function(n,i){var w=nw(n);if(i)x+=SEQ.gap+w/2;n.x=snap(x);n.y=0;x+=w/2;});
}
