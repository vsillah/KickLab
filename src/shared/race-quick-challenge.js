/* Portable, device-only Race packets. The checksum detects damage, not identity. */
(function installRaceQuickChallenge(root){
  'use strict';
  const PREFIX='KLQ1',MAX_CODE=12000,MAX_FRAMES=96;
  const modes=new Set(['core','drag','drift','circuit','hill','endurance']);
  const venues=new Set(['highland','marine','forest']);
  const choices={body:new Set(['kart','street','race']),suspension:new Set(['soft','balanced','firm']),tires:new Set(['narrow','balanced','wide']),brakes:new Set(['standard','sport','endurance'])};
  const finite=(n,low,high)=>typeof n==='number'&&Number.isFinite(n)&&n>=low&&n<=high;
  const alias=value=>typeof value==='string'&&/^[\p{L}\p{N} ._-]{1,24}$/u.test(value.trim());
  const checksum=value=>{let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16).padStart(8,'0');};
  const bytes=value=>new TextEncoder().encode(value);
  const base64=value=>{let binary='';for(const byte of bytes(value))binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
  const unbase64=value=>new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),char=>char.charCodeAt(0)));
  function contract(c){if(!c||typeof c!=='object'||!modes.has(c.mode)||!choices.body.has(c.vehicle)||!venues.has(c.venue)||!['you','auto'].includes(c.steer)||!['race-expansion-v1','race-core-v1'].includes(c.rules)||c.rules!==(c.mode==='core'?'race-core-v1':'race-expansion-v1')||!c.garage||c.garage.version!==1||c.garage.body!==c.vehicle||Object.entries(choices).some(([key,set])=>!set.has(c.garage[key]))||!finite(c.mu,.3,1.6)||!finite(c.radius,20,60)||!finite(c.force,1000,15000)||!finite(c.mass,150,2000))throw Error('Invalid race setup');
    const expected=c.mode==='core'?'Finish the same core course':root.KickLabRaceModes?.MODES?.[c.mode]?.target;
    if(c.target!==expected)throw Error('Invalid race target');
    return{mode:c.mode,vehicle:c.vehicle,garage:{version:1,body:c.garage.body,suspension:c.garage.suspension,tires:c.garage.tires,brakes:c.garage.brakes},venue:c.venue,steer:c.steer,rules:c.rules,target:expected,mu:c.mu,radius:c.radius,force:c.force,mass:c.mass};}
  function run(raw){if(!raw||!finite(raw.score,.001,100000)||!finite(raw.time,.001,600)||!Array.isArray(raw.trace)||raw.trace.length<2||raw.trace.length>MAX_FRAMES)throw Error('Invalid race result');
    let last=-1;const trace=raw.trace.map(frame=>{if(!Array.isArray(frame)||frame.length!==5||!finite(frame[0],0,600)||frame[0]<last||!finite(frame[1],-100,5000)||!finite(frame[2],-1000,5000)||!finite(frame[3],-7,7)||!finite(frame[4],0,5000))throw Error('Invalid ghost frame');last=frame[0];return frame;});
    if(Math.abs(trace.at(-1)[0]-raw.time)>2)throw Error('Ghost time differs from result');return{score:raw.score,time:raw.time,trace};}
  function encode(data){const json=JSON.stringify(data);if(bytes(json).length>8500)throw Error('Challenge is too large');const code=`${PREFIX}.${base64(json)}.${checksum(json)}`;if(code.length>MAX_CODE)throw Error('Challenge is too large');return code;}
  function decode(code){if(typeof code!=='string'||code.length>MAX_CODE||!/^KLQ1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(code.trim()))throw Error('Invalid challenge code');const [,payload,digest]=code.trim().split('.');let json;try{json=unbase64(payload);}catch(_){throw Error('Damaged challenge code');}if(bytes(json).length>8500||checksum(json)!==digest)throw Error('Damaged challenge code');let data;try{data=JSON.parse(json);}catch(_){throw Error('Damaged challenge code');}if(!data||data.v!==1||!['challenge','response'].includes(data.kind)||!alias(data.alias))throw Error('Unsupported challenge code');
    if(data.kind==='challenge'){const c=contract(data.contract),a=run(data.run);return{v:1,kind:'challenge',alias:data.alias.trim(),contract:c,run:a};}
    if(!/^[0-9a-f]{8}$/.test(data.challenge)||!finite(data.score,.001,100000)||!finite(data.time,.001,600))throw Error('Invalid response code');return{v:1,kind:'response',alias:data.alias.trim(),challenge:data.challenge,score:data.score,time:data.time};}
  const challenge=(name,c,a)=>{if(!alias(name))throw Error('Use a short letters-and-numbers alias');return encode({v:1,kind:'challenge',alias:name.trim(),contract:contract(c),run:run(a)});};
  const response=(name,challengeCode,b)=>{if(!alias(name))throw Error('Use a short letters-and-numbers alias');const decoded=decode(challengeCode);if(decoded.kind!=='challenge')throw Error('A challenge code is required');const valid=run(b);return encode({v:1,kind:'response',alias:name.trim(),challenge:checksum(challengeCode.trim()),score:valid.score,time:valid.time});};
  root.KickLabRaceQuickChallenge=Object.freeze({challenge,response,decode,checksum,MAX_CODE,MAX_FRAMES});
})(typeof globalThis!=='undefined'?globalThis:window);
