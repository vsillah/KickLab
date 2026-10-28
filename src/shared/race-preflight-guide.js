/* Read-only Race preflight guidance. Only recorded local Race clears affect skill tier. */
(function installRacePreflightGuide(root){
  'use strict';
  const ICONS=Object.freeze({
    whole:'<path d="M5 21h22l-2-7-5-4H11l-4 4-2 7Z"/><path d="M9 21v3m14-3v3M10 14h12"/>',
    suspension:'<path d="M7 5h18M7 27h18M14 7l-5 4 14 4-14 4 14 4-5 2"/>',
    'suspension:soft':'<path d="M8 5h16M8 27h16M15 7l-5 6 12 6-12 6 5 2"/>',
    'suspension:balanced':'<path d="M8 5h16M8 27h16M15 7l-6 5 14 5-14 5 6 5"/>',
    'suspension:firm':'<path d="M8 5h16M8 27h16M14 7l-5 4 14 4-14 4 14 4-5 2"/>',
    tires:'<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="5"/><path d="M16 5v5m0 12v5M5 16h5m12 0h5"/>',
    'tires:narrow':'<path d="M12 5h8v22h-8zM12 10h8m-8 6h8m-8 6h8"/>',
    'tires:balanced':'<path d="M9 5h14v22H9zM9 10h14M9 16h14M9 22h14M16 5v22"/>',
    'tires:wide':'<path d="M5 5h22v22H5zM5 10h22M5 16h22M5 22h22M12 5v22m8-22v22"/>',
    brakes:'<circle cx="15" cy="16" r="10"/><circle cx="15" cy="16" r="3"/><path d="M22 9h5v14h-5M15 6v3m0 14v3"/>',
    'brakes:standard':'<circle cx="15" cy="16" r="9"/><circle cx="15" cy="16" r="2"/><path d="M22 11h5v10h-5M15 8v3m0 10v3"/>',
    'brakes:sport':'<circle cx="14" cy="16" r="10"/><circle cx="14" cy="16" r="2"/><path d="M21 8h6v16h-6M9 11l3 3m5 5 3 3M9 21l3-3m5-5 3-3"/>',
    'brakes:endurance':'<circle cx="14" cy="16" r="10"/><circle cx="14" cy="16" r="2"/><path d="M21 10h6v12h-6M14 7v5m0 8v5M5 16h5m8 0h5"/>'
  });
  const PLAN=Object.freeze({
    drag:{beginner:{vehicle:'cobalt',parts:{suspension:'balanced',tires:'wide',brakes:'standard'},reasons:{vehicle:'A steady launch helps you learn the 240 m shift timing.',suspension:'Predictable turn-in keeps the straight easy to read.',tires:'More launch grip helps reach the trap speed.',brakes:'One straight finish does not need a heat-focused package.'}},practiced:{vehicle:'kestrel',parts:{suspension:'firm',tires:'wide',brakes:'standard'},reasons:{vehicle:'Low mass rewards a practiced launch and clean shifts.',suspension:'Sharper response suits a controlled straight-line run.',tires:'Extra grip limits wheelspin at launch.',brakes:'The short sprint favors a steady brake baseline.'}}},
    drift:{beginner:{vehicle:'cobalt',parts:{suspension:'soft',tires:'balanced',brakes:'standard'},reasons:{vehicle:'Predictable recovery helps link both curves.',suspension:'Soft recovery gives time between the two slides.',tires:'Standard grip leaves room to start and catch a slide.',brakes:'A steady stop helps reset between curves.'}},practiced:{vehicle:'kestrel',parts:{suspension:'soft',tires:'narrow',brakes:'standard'},reasons:{vehicle:'Quick rotation rewards careful wheel control.',suspension:'Soft recovery helps prepare the second curve.',tires:'Lower grip lets a practiced driver hold a controlled slide.',brakes:'A steady stop helps reset between curves.'}}},
    circuit:{beginner:{vehicle:'cobalt',parts:{suspension:'balanced',tires:'wide',brakes:'endurance'},reasons:{vehicle:'A steady car helps repeat the braking line.',suspension:'Predictable turn-in supports two consistent laps.',tires:'Wide grip gives more corner margin.',brakes:'Repeated bends reward cooler braking.'}},practiced:{vehicle:'aegis',parts:{suspension:'firm',tires:'wide',brakes:'endurance'},reasons:{vehicle:'Higher grip rewards a precise two-lap line.',suspension:'Sharper turn-in helps place a practiced car.',tires:'Wide grip raises the oval corner limit.',brakes:'Repeated bends reward cooler braking.'}}},
    hill:{beginner:{vehicle:'cobalt',parts:{suspension:'soft',tires:'wide',brakes:'sport'},reasons:{vehicle:'Balanced control helps learn the switchback.',suspension:'Soft recovery adds room on the climb.',tires:'Wide grip supports the tight hill corner.',brakes:'One strong first stop helps before the switchback.'}},practiced:{vehicle:'kestrel',parts:{suspension:'firm',tires:'wide',brakes:'sport'},reasons:{vehicle:'Low mass helps a practiced climb.',suspension:'Firm turn-in rewards a clean switchback entry.',tires:'Wide grip supports the tight hill corner.',brakes:'One strong first stop helps before the switchback.'}}},
    endurance:{beginner:{vehicle:'cobalt',parts:{suspension:'balanced',tires:'balanced',brakes:'endurance'},reasons:{vehicle:'Steady handling helps hold a repeatable three-lap pace.',suspension:'Predictable steering helps keep lap spread small.',tires:'Standard tires balance bend grip and heat.',brakes:'Cooler repeated stops help across three laps.'}},practiced:{vehicle:'aegis',parts:{suspension:'firm',tires:'wide',brakes:'endurance'},reasons:{vehicle:'Higher bend grip rewards practiced heat management.',suspension:'Sharper turn-in helps place the car each lap.',tires:'Wide grip raises the 100 m bend limit; watch heat.',brakes:'Cooler repeated stops help across three laps.'}}},
    marine:{beginner:{vehicle:'cobalt',parts:{suspension:'soft',tires:'wide',brakes:'endurance'},reasons:{vehicle:'Stable handling helps repeat the damp corner across two heats.',suspension:'Soft recovery leaves room to correct the wet entry.',tires:'Wide grip helps hold the damp corner.',brakes:'Two heats reward cooler, repeatable stops.'}},practiced:{vehicle:'aegis',parts:{suspension:'firm',tires:'wide',brakes:'endurance'},reasons:{vehicle:'More grip rewards a precise damp-corner entry.',suspension:'Firm turn-in helps place the car before the wet bend.',tires:'Wide grip raises the damp-corner margin.',brakes:'Two heats reward cooler, repeatable stops.'}}},
    forest:{beginner:{vehicle:'cobalt',parts:{suspension:'soft',tires:'wide',brakes:'endurance'},reasons:{vehicle:'Predictable recovery helps repeat the descending left turn.',suspension:'Soft recovery gives room on the downhill entry.',tires:'Wide grip supports the descending turn.',brakes:'Three heats reward cooler downhill braking.'}},practiced:{vehicle:'aegis',parts:{suspension:'firm',tires:'wide',brakes:'endurance'},reasons:{vehicle:'Higher grip rewards a clean descending line.',suspension:'Firm turn-in rewards a measured downhill entry.',tires:'Wide grip supports the descending turn.',brakes:'Three heats reward cooler downhill braking.'}}}
  });
  function skillTier(progress){
    const cleared=new Set(),best=progress?.raceModes?.version===1?progress.raceModes.best:{};
    for(const mode of Object.keys(PLAN))if(Object.prototype.hasOwnProperty.call(best||{},mode)&&Number.isFinite(Number(best[mode]))&&Number(best[mode])>=0)cleared.add(mode);
    const results=progress?.raceChampionship?.version===1?progress.raceChampionship.results:{};
    for(const mode of Object.keys(PLAN))if(Number(results?.[mode]?.score)>0)cleared.add(mode);
    return cleared.size>=2?'practiced':'beginner';
  }
  function recommend(mode,progress){const tier=skillTier(progress),plan=PLAN[mode]?.[tier]||PLAN.drag[tier];return{tier,vehicle:plan.vehicle,parts:{...plan.parts},reasons:{...plan.reasons}};}
  function icon(key){const shape=ICONS[key];return shape?`<svg class="race-part-icon" viewBox="0 0 32 32" focusable="false" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`:'';}
  const thumbsUp='<svg class="race-coach-thumb" viewBox="0 0 32 32" focusable="false" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v13H4zM10 14l6-9c1-2 4-1 4 1v6h6c2 0 3 2 2 4l-2 10c-.2 1-1 1-2 1H10z"/></svg>';
  root.KickLabRacePreflightGuide=Object.freeze({ICONS,PLAN,skillTier,recommend,icon,thumbsUp});
})(typeof globalThis!=='undefined'?globalThis:window);
