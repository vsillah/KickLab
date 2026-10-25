(function installRaceCompetition(root){
  'use strict';
  const CATEGORIES=Object.freeze([
    {id:'core',name:'Core run',unit:'s',higher:false,goal:'Finish a core run'},
    {id:'drag',name:'Drag Sprint',unit:'pts',higher:true,goal:'Meet the drag target'},
    {id:'drift',name:'Drift Trial',unit:'pts',higher:true,goal:'Meet the drift target'},
    {id:'circuit',name:'Circuit Laps',unit:'pts',higher:true,goal:'Meet the circuit target'},
    {id:'hill',name:'Hill / Time Attack',unit:'pts',higher:true,goal:'Meet the hill target'},
    {id:'endurance',name:'Endurance',unit:'pts',higher:true,goal:'Meet the endurance target'}
  ]);
  const AWARDS=Object.freeze({
    core:{name:'Checkered Flag',perk:'Checkered profile crest',chapter:'The starting line',requirement:'Finish a Core run or meet the Drag Sprint target',next:'Complete Core or Drag Sprint',after:null},
    drag:{name:'Launch Ace',perk:'Launch Ace title',chapter:'Find your speed',requirement:'Meet the Drag Sprint target',next:'Complete Drag Sprint',after:'core'},
    drift:{name:'Slide Scholar',perk:'Slide Scholar title',chapter:'Own the corners',requirement:'Meet the Drift Trial target',next:'Complete Drift Trial',after:'drag'},
    circuit:{name:'Lap Keeper',perk:'Lap Keeper title',chapter:'Find your rhythm',requirement:'Meet the Circuit Laps target',next:'Complete Circuit Laps',after:'drift'},
    hill:{name:'Summit Runner',perk:'Summit Runner title',chapter:'Climb the limit',requirement:'Meet the Hill target',next:'Complete Hill / Time Attack',after:'circuit'},
    endurance:{name:'Heat Tactician',perk:'Heat Tactician title',chapter:'The long game',requirement:'Meet the Endurance target',next:'Complete Endurance',after:'hill'}
  });
  const enabled=()=>typeof location!=='undefined'&&!!root.KickLabRaceOrigin?.trusted()&&new URLSearchParams(location.search).get('raceCompetition')==='prototype';
  const safe=raw=>raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  function normalize(raw){const source=safe(raw),bests={},awards={};for(const cat of CATEGORIES){const entry=safe(safe(source.bests)[cat.id]),score=Number(entry.score);if(Number.isFinite(score)&&score>0&&score<1000000)bests[cat.id]={score,vehicle:String(entry.vehicle||'').slice(0,32),at:Number.isFinite(entry.at)?entry.at:0,previous:Number.isFinite(entry.previous)?entry.previous:null};if(safe(source.awards)[cat.id])awards[cat.id]=true;}return{version:1,bests,awards};}
  function missingBefore(state,index){return CATEGORIES.slice(0,index).find(cat=>!state.awards[cat.id]);}
  function journey(raw){const state=normalize(raw);return CATEGORIES.map((cat,index)=>{const award=AWARDS[cat.id],earned=!!state.awards[cat.id],missing=missingBefore(state,index);return{id:cat.id,index,chapter:award.chapter,name:award.name,requirement:award.requirement,perk:award.perk,status:earned?'earned':missing?'locked':'available',progress:earned?'Collected':missing?`First collect ${AWARDS[missing.id].name}`:award.next,score:state.bests[cat.id]?.score??null};});}
  function record(raw,event){const state=normalize(raw),index=CATEGORIES.findIndex(item=>item.id===event?.category),cat=CATEGORIES[index];if(!cat||event.passed!==true)return{state,earned:null,awardId:null,improved:false};const score=Number(event.score);if(!Number.isFinite(score)||score<=0||score>=1000000)return{state,earned:null,awardId:null,improved:false};const previous=state.bests[cat.id],improved=!previous||(cat.higher?score>previous.score:score<previous.score);if(improved)state.bests[cat.id]={score,vehicle:String(event.vehicle||'').slice(0,32),at:Number.isFinite(event.at)?event.at:Date.now(),previous:previous?.score??null};const awardId=cat.id==='drag'&&!state.awards.core?'core':cat.id,awardIndex=CATEGORIES.findIndex(item=>item.id===awardId);const earned=state.awards[awardId]||missingBefore(state,awardIndex)?null:AWARDS[awardId];if(earned)state.awards[awardId]=true;return{state,earned,awardId:earned?awardId:null,improved};}
  function rows(profiles,category){const cat=CATEGORIES.find(item=>item.id===category);if(!cat)return[];let rank=0,prior=null;return profiles.map((profile,index)=>({profileId:profile.id,alias:`Racer ${index+1}`,score:normalize(profile.progress?.raceCompetition).bests[category]?.score||0})).filter(row=>row.score>0).sort((a,b)=>(cat.higher?b.score-a.score:a.score-b.score)||a.alias.localeCompare(b.alias)).map((row,index)=>{if(row.score!==prior)rank=index+1;prior=row.score;return{...row,rank};});}
  root.KickLabRaceCompetition=Object.freeze({CATEGORIES,AWARDS,enabled,normalize,journey,record,rows});
})(typeof globalThis!=='undefined'?globalThis:window);
