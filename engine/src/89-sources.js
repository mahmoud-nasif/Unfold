/* ================= sources ================= */
// meta.repo {url, commit, root} turns each source into a permalink at the mapped commit
function srcLink(s){
  var r=data.meta.repo;if(!r||!r.url||!/^https?:\/\//.test(r.url))return null;
  var m=String(s).match(/^([^:#\s]+)(?::(\d+)(?:-(\d+))?|#L(\d+)(?:-L?(\d+))?|:[A-Za-z_$][\w$.]*)?$/);if(!m)return null;
  var file=m[1],a=m[2]||m[4],b=m[3]||m[5],base=r.url.replace(/\.git$/,'').replace(/\/$/,''),ref=r.commit||'HEAD',p=(r.root?String(r.root).replace(/^\/|\/$/g,'')+'/':'')+file.replace(/^\.\//,'');
  if(/gitlab/.test(base))return base+'/-/blob/'+ref+'/'+p+(a?'#L'+a+(b?'-'+b:''):'');
  if(/bitbucket/.test(base))return base+'/src/'+ref+'/'+p+(a?'#lines-'+a+(b?':'+b:''):'');
  return base+'/blob/'+ref+'/'+p+(a?'#L'+a+(b?'-L'+b:''):'');
}
var CONF_TEXT={read:'Read in the code',peeked:'Checked in a code excerpt',inferred:'Inferred: not confirmed in the code'};
var DIFF_TEXT={added:'New',removed:'Removed',changed:'Changed'};

