(function installRaceCoachPersonas(root){
  'use strict';
  const params=typeof location==='undefined'?null:new URLSearchParams(location.search);
  const enabled=!!(root.KickLabRaceOrigin?.trusted()&&params?.get('raceExpansion')==='prototype'&&params.get('raceInstruments')==='prototype'&&params.get('raceCoaching')==='prototype'&&params.get('raceCoachPersonas')==='prototype');
  const roster=Object.freeze([
    Object.freeze({id:'nia',name:'Coach Nia',role:'Race engineer',style:'Clear and practical',sample:'Shift in the bright band.',description:'A young Black woman with deep brown skin, sculpted curls, and a teal racing jacket.',color:'#7fdcff'}),
    Object.freeze({id:'imani',name:'Coach Imani',role:'Race mentor',style:'Warm and steady',sample:'You can do this. Shift in the bright band.',description:'An older Black woman with silver locs and a plum racing jacket.',color:'#deb4e2'}),
    Object.freeze({id:'mateo',name:'Coach Mateo',role:'Race analyst',style:'Brief and technical',sample:'Bright band. Shift there.',description:'A middle-aged Latino man with olive skin, dark wavy hair, a mustache, and an amber racing jacket.',color:'#ffd18a'}),
    Object.freeze({id:'arun',name:'Coach Arun',role:'Race strategist',style:'Bright and energetic',sample:'Ready? Shift in the bright band!',description:'A young South Asian man with brown skin, long hair tied back, and a cobalt racing jacket.',color:'#9ec3ff'})
  ]);
  const expressions=Object.freeze(['ready','celebrate','concern','focus','encourage']);
  const get=id=>roster.find(coach=>coach.id===id)||roster[0];
  const normalize=id=>get(id).id;
  const expressionFor=(event)=>({setup:'ready',correct:'celebrate',mistake:'concern',recovery:'encourage',award:'celebrate',win:'celebrate',loss:'encourage',pause:'encourage',instruction:'focus'}[event]||'ready');
  const canonical=message=>String(message||'').replace(/^Coach (?:Nia|Imani|Mateo|Arun)(?: here| on the radio)?[.:]?\s*/i,'').trim();
  const present=(message,id)=>enabled?`${get(id).name}: ${canonical(message)}`:String(message||'');
  root.KickLabRaceCoachPersonas=Object.freeze({enabled,roster,expressions,get,normalize,expressionFor,canonical,present});
})(typeof globalThis!=='undefined'?globalThis:window);
