/* ================= helpers ================= */
function $(s,r){return (r||document).querySelector(s);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36);}
function slug(s){return (String(s||'unfold').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'unfold');}
function snap(v,free){return free?Math.round(v):Math.round(v/SNAP)*SNAP;}
function clone(o){return JSON.parse(JSON.stringify(o));}
function nw(n){return n.w||(SHAPES[n.shape]||SHAPES.rounded).w;}
function nh(n){if(n.h)return n.h;if(n.shape==='table')return 46+Math.max(1,(n.fields||[]).length)*24;if(n.shape==='class')return 44+Math.max(1,(n.fields||[]).length)*20+Math.max(1,(n.methods||[]).length)*20+(n.stereotype?14:0);return (SHAPES[n.shape]||SHAPES.rounded).h;}
function colorVar(c){return COLORS.indexOf(c)>=0?'var(--c-'+c+')':(/^#[0-9a-f]{3,8}$/i.test(c||'')?c:'var(--c-blue)');}
function roleVar(r){return r==='input'?'var(--in)':r==='output'?'var(--out)':'transparent';}
function levelType(l){return TYPE_NAMES[l&&l.type]?l.type:'architecture';}
function levelDir(l){return l.direction==='TB'||l.direction==='LR'?l.direction:({process:1,class:1,behaviour:1,dependency:1}[levelType(l)]?'TB':'LR');}
function defShape(l){return {process:'rect',state:'pill',data:'table',class:'class',deployment:'node3d',dependency:'rect',tree:'pill',behaviour:'rect'}[levelType(l)]||'rounded';}
function defStyle(l){var t=levelType(l);return t==='architecture'||t==='process'||t==='c4'?'flow':'solid';}
function defArrow(l){return {data:1,tree:1,behaviour:1,timeline:1}[levelType(l)]?'none':'end';}
function isTree(l){var t=levelType(l);return t==='tree'||t==='behaviour';}
// every level type has one layout: sequences by order, trees by hierarchy, timelines along an axis, the rest layered
function layoutAny(l){var t=levelType(l);if(t==='sequence')seqLayout(l);else if(isTree(l))treeLayout(l);else if(t==='timeline')timelineLayout(l);else autoLayout(l);}
function isSeq(l){return levelType(l)==='sequence';}
function mediaType(m){if(!m||!m.src)return null;if(m.type)return m.type;var s=String(m.src);if(/^data:video\/|\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(s))return 'video';if(/youtube\.com|youtu\.be|vimeo\.com|\/embed\//i.test(s))return 'embed';return 'image';}
// a node holds one media item (an object) or several (an array); strings are shorthand for {src}
function mediaList(n){var m=n&&n.media;if(!m)return [];return (Array.isArray(m)?m:[m]).map(function(x){return typeof x==='string'?{src:x}:x;}).filter(function(x){return x&&typeof x.src==='string'&&x.src;});}
function setMedia(n,list){if(!list.length)delete n.media;else n.media=list.length===1?list[0]:list;}
function firstSentence(t,max){t=String(t||'').trim();var m=t.match(/^[\s\S]*?[.!?](\s|$)/);t=(m?m[0]:t).trim();return t.length>max?t.slice(0,max-1)+'\u2026':t;}

