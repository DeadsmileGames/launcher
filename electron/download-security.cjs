const https = require('node:https');
const dns = require('node:dns/promises');
const net = require('node:net');

function publicAddress(address) {
  const ip = String(address).toLowerCase();
  const family = net.isIP(ip);
  if (family === 4) {
    const [a,b,c] = ip.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===192&&b===0)||(a===192&&b===2)||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
  }
  if(family===6) return /^[23][0-9a-f]{3}:/.test(ip) && !ip.startsWith('2001:db8:') && !ip.startsWith('2002:');
  return false;
}

async function downloadResponse(value, { signal, headers = {}, lookup = dns.lookup } = {}) {
  let url = new URL(value);
  for (let hop=0;hop<6;hop++) {
    if(url.protocol!=='https:' || url.username || url.password || url.port && url.port!=='443') throw new Error('DOWNLOAD_NOT_AUTHORIZED');
    const host=url.hostname.replace(/^\[|\]$/g,'');
    const addresses=net.isIP(host)?[{address:host,family:net.isIP(host)}]:await lookup(host,{all:true});
    if(!addresses.length || addresses.some(({address})=>!publicAddress(address))) throw new Error('DOWNLOAD_NOT_AUTHORIZED');
    const pinned=addresses[0];
    const response=await new Promise((resolve,reject)=>{
      const request=https.get(url,{signal,headers,lookup:(_host,options,callback)=>{ if(options.all) callback(null,[pinned]);else callback(null,pinned.address,pinned.family); }},resolve);
      request.once('error',reject);
      request.setTimeout(60_000,()=>request.destroy(new Error('GAME_DOWNLOAD_FAILED')));
    });
    if([301,302,303,307,308].includes(response.statusCode)) {
      const location=response.headers.location;
      response.destroy();
      if(!location) throw new Error('GAME_DOWNLOAD_FAILED');
      url=new URL(location,url);
      continue;
    }
    return {ok:response.statusCode>=200&&response.statusCode<300,body:response,headers:{get:(name)=>response.headers[name.toLowerCase()]||null}};
  }
  throw new Error('GAME_DOWNLOAD_FAILED');
}
module.exports={publicAddress,downloadResponse};
