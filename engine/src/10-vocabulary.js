/* ================= vocabulary ================= */
//@@ICONS@@
var UI={
  tag:['M3 12V4h8l10 10-8 8z','M7.5 8h.01'],edit:['M4 20h4L20 8l-4-4L4 16z','M14 6l4 4'],export:['M12 4v12','M7 11l5 5 5-5','M4 20h16'],
  save:['M5 3h11l3 3v15H5z','M8 3v5h7V3','M8 21v-7h8v7'],plus:['M12 5v14M5 12h14'],minus:['M5 12h14'],
  fit:['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'],close:['M6 6l12 12M18 6 6 18'],back:['M19 12H5','M11 6l-6 6 6 6'],
  undo:['M9 14 4 9l5-5','M4 9h11a5 5 0 0 1 0 10h-3'],redo:['M15 14l5-5-5-5','M20 9H9a5 5 0 0 0 0 10h3'],
  trash:['M4 7h16','M9 7V4h6v3','M6 7l1 13h10l1-13'],copy:['r 8 8 12 12 2','M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2'],
  nest:['r 3 3 18 18 3','r 8 8 8 8 2'],open:['M15 3h6v6','M10 14 21 3','M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  group:['r 3 5 18 14 3','M7 9h5'],ungroup:['r 3 5 18 14 3','M3 9h18'],info:['c 12 12 9','M12 11v6','M12 7.5h.01'],
  bold:['M7 5h6a3.5 3.5 0 0 1 0 7H7z','M7 12h7a3.5 3.5 0 0 1 0 7H7z'],italic:['M10 5h8','M6 19h8','M14 5l-4 14'],
  tidy:['r 3 4 6 5 1','r 15 4 6 5 1','r 9 15 6 5 1','M6 9v2h12V9','M12 11v4'],reverse:['M7 7h13l-4-4','M17 17H4l4 4'],
  chev:['M6 9l6 6 6-6'],help:['c 12 12 9','M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7','M12 17h.01'],
  arrowR:['M4 12h16','M14 6l6 6-6 6'],arrowB:['M4 12h16','M14 6l6 6-6 6','M10 6l-6 6 6 6'],arrowN:['M4 12h16'],
  lineFlow:['M3 12h3M9 12h3M15 12h3'],lineSolid:['M3 12h18'],lineDot:['M4 12h.01M9 12h.01M14 12h.01M19 12h.01'],
  dirLR:['M3 12h14','M13 8l4 4-4 4','r 18 9 3 6 1'],dirTB:['M12 3v14','M8 13l4 4 4-4','r 9 18 6 3 1'],
  textsize:['M4 18 9 6l5 12','M6 14h6','M15 18l3-7 3 7','M16 16h4'],
  image:['r 3 4 18 16 2','c 9 10 2','M21 16l-5-5-9 9'],play:['M8 5l11 7-11 7z'],about:['c 12 12 9','M12 16v-4','M12 8h.01'],
  up:['M12 19V5','M6 11l6-6 6 6'],down:['M12 5v14','M6 13l6 6 6-6'],
  link:['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1','M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  'route-curved':['M4 19C12 19 12 5 20 5','c 4 19 1.5','c 20 5 1.5'],'route-orthogonal':['M4 19h8V5h8','c 4 19 1.5','c 20 5 1.5'],'route-straight':['M4 19 20 5','c 4 19 1.5','c 20 5 1.5']
};
var ROUTE_NAMES={curved:'Curved',orthogonal:'Elbow',straight:'Straight'};
var SHAPES={
  rounded:{name:'Component',w:176,h:116},
  rect:{name:'Process step',w:168,h:72},
  pill:{name:'Start / end',w:156,h:58},
  diamond:{name:'Decision',w:196,h:120},
  parallelogram:{name:'Data in / out',w:184,h:72},
  cylinder:{name:'Database / store',w:150,h:108},
  document:{name:'Document / file',w:164,h:92},
  hexagon:{name:'Preparation',w:176,h:80},
  cloud:{name:'External service',w:184,h:112},
  circle:{name:'Circle / event',w:100,h:100},
  triangle:{name:'Triangle',w:136,h:112},
  text:{name:'Text',w:180,h:40},
  table:{name:'Table / entity',w:250,h:120},
  image:{name:'Image or video',w:240,h:170},
  initial:{name:'Initial state',w:30,h:30},
  final:{name:'Final state',w:34,h:34},
  class:{name:'Class',w:240,h:120},
  person:{name:'Person',w:132,h:132},
  node3d:{name:'Server / device',w:184,h:112}
};
var SHAPE_ORDER=['rounded','rect','pill','diamond','parallelogram','cylinder','document','hexagon','cloud','table','class','person','node3d','image','circle','initial','final','triangle','text'];
var TYPE_NAMES={architecture:'Architecture',process:'Process',sequence:'Sequence',state:'State machine',data:'Data model',class:'Class diagram',c4:'C4',deployment:'Deployment',dependency:'Dependencies',tree:'Tree / mind map',behaviour:'Behaviour tree',timeline:'Timeline'};
var TYPE_HINTS={architecture:'Parts and how data moves between them',process:'Steps and decisions in order',sequence:'Who calls whom, in time order',state:'States and the events that move between them',data:'Entities, their fields and relations',
  class:'Classes, their members, inheritance and ownership',c4:'People, systems and containers, with their technology',deployment:'What runs where: machines, devices, containers',dependency:'Which module depends on which',
  tree:'A hierarchy, children in order',behaviour:'A behaviour tree: sequences, selectors and actions, run left to right',timeline:'Events in order along a time axis'};
var BT_GLYPH={sequence:'\u2192',selector:'?',parallel:'\u21c9',decorator:'\u25c7'};
var BT_NAMES={sequence:'Sequence: runs children in order until one fails',selector:'Selector: tries children in order until one succeeds',parallel:'Parallel: runs children together',decorator:'Decorator: changes its child\u2019s result',action:'Action',condition:'Condition'};
var REL={inherits:{st:'solid',end:'tri'},implements:{st:'dashed',end:'tri'},composition:{st:'solid',start:'dia'},aggregation:{st:'solid',start:'odia'},association:{st:'solid',end:'open'},dependency:{st:'dashed',end:'open'}};
var SEQ={gap:70,first:84,step:54};
var COLORS=['blue','teal','amber','rose','violet','slate','neutral'];
var KIND_TO_COLOR={core:'blue',data:'teal',infra:'amber',interface:'rose',external:'slate'};
var FS={s:12.5,m:14.5,l:18};

function shapes(spec){
  return spec.map(function(s){
    var p=s.split(' ');
    if(p[0]==='c')return '<circle cx="'+p[1]+'" cy="'+p[2]+'" r="'+p[3]+'"/>';
    if(p[0]==='r')return '<rect x="'+p[1]+'" y="'+p[2]+'" width="'+p[3]+'" height="'+p[4]+'" rx="'+(p[5]||0)+'"/>';
    if(p[0]==='e')return '<ellipse cx="'+p[1]+'" cy="'+p[2]+'" rx="'+p[3]+'" ry="'+p[4]+'"/>';
    return '<path d="'+s+'"/>';
  }).join('');
}
function uiIcon(name,size){size=size||18;var spec=UI[name]||ICONS[name];return '<svg class="ui-i" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" aria-hidden="true">'+(spec?shapes(spec):'')+'</svg>';}
function shapeIcon(shape,size){
  size=size||26;var n={shape:shape,w:SHAPES[shape].w,h:SHAPES[shape].h};
  var k=Math.min((size-4)/n.w,(size-4)/n.h)*(shape==='text'?1:1);
  if(shape==='text')return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" aria-hidden="true"><text x="12" y="17" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">T</text></svg>';
  return '<svg viewBox="'+(-size/2)+' '+(-size/2)+' '+size+' '+size+'" width="'+size+'" height="'+size+'" aria-hidden="true"><g transform="scale('+k+')" class="ps-wrap">'+shapeSVG(n,'ps',1.5/k)+'</g></svg>';
}

