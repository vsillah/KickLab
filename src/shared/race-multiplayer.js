/* Device-only, in-memory two-seat Race contract. No profile or match storage. */
(function installRaceMultiplayer(root){
  'use strict';
  const enabled=()=>typeof location!=='undefined'&&!!root.KickLabRaceOrigin?.trusted()&&new URLSearchParams(location.search).get('raceMultiplayer')==='prototype';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const signature=contract=>JSON.stringify([contract.mode,contract.vehicle,contract.garage,contract.venue,contract.steer,contract.rules,contract.target,contract.mu,contract.radius,contract.force,contract.mass]);
  function create(seatA,seatB,contract){
    if(!seatA||!seatB||seatA===seatB||!contract||!contract.vehicle||!contract.target)throw Error('invalid_match_setup');
    const frozen=Object.freeze(copy(contract));Object.freeze(frozen.garage);
    return{phase:'readyA',seatA,seatB,contract:frozen,signature:signature(frozen),a:null,b:null,attempt:0};
  }
  function ready(match,profileId){return !!match&&(match.phase==='readyA'&&profileId===match.seatA||match.phase==='readyB'&&profileId===match.seatB);}
  function begin(match,profileId,liveContract){
    if(!ready(match,profileId)||signature(liveContract)!==match.signature)return false;
    match.phase=profileId===match.seatA?'runningA':'runningB';match.attempt++;return true;
  }
  function finish(match,profileId,liveContract,outcome,trace){
    const seat=profileId===match?.seatA?'A':profileId===match?.seatB?'B':null;
    if(!seat||match.phase!==`running${seat}`||signature(liveContract)!==match.signature){if(match)match.phase='blocked';return false;}
    if(outcome?.pass!==true||!Number.isFinite(outcome.score)||outcome.score<=0){match.phase=`retry${seat}`;return false;}
    const run={score:outcome.score,time:outcome.time,measure:String(outcome.measure||''),trace:copy(trace||[])};
    if(seat==='A'){match.a=run;match.phase='handoff';}else{match.b=run;match.phase='result';}
    return true;
  }
  function retry(match,profileId){const seat=profileId===match?.seatA?'A':profileId===match?.seatB?'B':null;if(!seat||match.phase!==`retry${seat}`)return false;match.phase=`ready${seat}`;return true;}
  function handoff(match,profileId){if(match?.phase!=='handoff'||profileId!==match.seatB)return false;match.phase='readyB';return true;}
  function result(match){if(match?.phase!=='result'||!match.a||!match.b)return null;const lower=match.contract.mode==='core',difference=Math.abs(match.a.score-match.b.score);return{winner:match.a.score===match.b.score?'tie':(lower?match.a.score<match.b.score:match.a.score>match.b.score)?'A':'B',difference};}
  root.KickLabRaceMultiplayer=Object.freeze({enabled,create,ready,begin,finish,retry,handoff,result,signature});
})(typeof globalThis!=='undefined'?globalThis:window);
