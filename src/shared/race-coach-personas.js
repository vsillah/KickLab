(function installRaceCoachPersonas(root){
  'use strict';
  const params=typeof location==='undefined'?null:new URLSearchParams(location.search);
  const enabled=!!(root.KickLabRaceOrigin?.trusted()&&params?.get('raceExpansion')==='prototype'&&params.get('raceInstruments')==='prototype'&&params.get('raceCoaching')==='prototype'&&params.get('raceCoachPersonas')==='prototype');
  const roster=Object.freeze([
    Object.freeze({id:'nia',name:'Coach Nia',role:'Race engineer',style:'Clear and practical',sample:'Shift in the bright band.',description:'A young Black woman with deep brown skin, sculpted curls, and a teal racing jacket.',color:'#7fdcff'}),
    Object.freeze({id:'imani',name:'Coach Imani',role:'Race mentor',style:'Warm and steady',sample:'You’ve got this: Shift in the bright band.',description:'An older Black woman with silver locs and a plum racing jacket.',color:'#deb4e2'}),
    Object.freeze({id:'mateo',name:'Coach Mateo',role:'Race analyst',style:'Brief and technical',sample:'Timing: Shift in the bright band.',description:'A middle-aged Latino man with olive skin, dark wavy hair, a mustache, and an amber racing jacket.',color:'#ffd18a'}),
    Object.freeze({id:'arun',name:'Coach Arun',role:'Race strategist',style:'Bright and energetic',sample:'Go time: Shift in the bright band.',description:'A young South Asian man with brown skin, long hair tied back, and a cobalt racing jacket.',color:'#9ec3ff'})
  ]);
  const expressions=Object.freeze(['ready','celebrate','concern','focus','encourage']);
  const get=id=>roster.find(coach=>coach.id===id)||roster[0];
  const normalize=id=>get(id).id;
  const expressionFor=(event)=>({setup:'ready',correct:'celebrate',mistake:'concern',recovery:'encourage',award:'celebrate',win:'celebrate',loss:'encourage',pause:'encourage',instruction:'focus'}[event]||'ready');
  const openings=Object.freeze({
    nia:Object.freeze({setup:'',shift:'',nos:'',drift:'',heat:'',correction:'',recovery:'',win:'',loss:'',general:''}),
    imani:Object.freeze({setup:'With you: ',shift:'You’ve got this: ',nos:'With you: ',drift:'I’m with you: ',heat:'Take care: ',correction:'We can adjust: ',recovery:'One step at a time: ',win:'Well done: ',loss:'We can build on this: ',general:'With you: '}),
    mateo:Object.freeze({setup:'Setup check: ',shift:'Timing: ',nos:'NOS: ',drift:'Angle: ',heat:'Heat: ',correction:'Correction: ',recovery:'Recovery: ',win:'Result: ',loss:'Next run: ',general:'Cue: '}),
    arun:Object.freeze({setup:'Ready: ',shift:'Go time: ',nos:'NOS cue: ',drift:'Drift cue: ',heat:'Heat alert: ',correction:'Next try: ',recovery:'Recovery cue: ',win:'Run note: ',loss:'Next run: ',general:'Heads up: '})
  });
  const intent=message=>{
    const value=String(message||'');
    if(/\b(nos|nitro|pulse|tank)\b/i.test(value))return'nos';
    if(/\b(shift|gear|rpm|bright band)\b/i.test(value))return'shift';
    if(/\b(drift|slide|angle|grip)\b/i.test(value))return'drift';
    if(/\b(heat|hot|cool|temperature|power loss)\b/i.test(value))return'heat';
    if(/\b(recover|returning|back on the line|off course)\b/i.test(value))return'recovery';
    if(/\b(failed|lost|did not|next focus)\b/i.test(value))return'loss';
    if(/\b(brake|retry|earlier|later|ease|missed|mistake|adjust)\b/i.test(value))return'correction';
    if(/\b(finish|complete|passed|worked|on target|win)\b/i.test(value))return'win';
    if(/\b(setup|suggested|starting|start heat|choose)\b/i.test(value))return'setup';
    return'general';
  };
  const prefix=(message,id)=>openings[get(id).id][intent(message)];
  const canonical=message=>{
    const raw=String(message||'').trim(),match=raw.match(/^Coach (Nia|Imani|Mateo|Arun)(?: here| on the radio)?[.:]?\s*/i);
    if(!match)return raw;
    const coach=roster.find(item=>item.name.toLowerCase()===`coach ${match[1].toLowerCase()}`),body=raw.slice(match[0].length);
    const opening=coach&&Object.values(openings[coach.id]).find(value=>value&&body.startsWith(value));
    return(opening?body.slice(opening.length):body).trim();
  };
  const frame=(message,id)=>enabled?`${prefix(canonical(message),id)}${canonical(message)}`:String(message||'');
  const present=(message,id)=>enabled?`${get(id).name}: ${frame(message,id)}`:String(message||'');
  const live=(message,id)=>{
    const core=canonical(message).split(/(?<=[.!?])\s+/)[0];
    if(!enabled)return core.slice(0,72);
    const opening=prefix(core,id);
    return(opening.length+core.length<=72?opening+core:core.slice(0,72));
  };
  root.KickLabRaceCoachPersonas=Object.freeze({enabled,roster,expressions,get,normalize,expressionFor,intent,canonical,frame,present,live});
})(typeof globalThis!=='undefined'?globalThis:window);
