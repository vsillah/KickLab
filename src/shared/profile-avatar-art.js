(function installKickLabProfileAvatarArt(root){
  'use strict';
  // Original local vector art. Every attribute below comes from these bounded palettes.
  const choices=Object.freeze({
    skin:Object.freeze({deep:['Deep brown','#593526','#a56b49'],brown:['Brown','#89543b','#cf9268'],tan:['Tan','#bd8059','#e5b388'],light:['Light','#d2a17e','#f1c9a6']}),
    hair:Object.freeze({curls:'Sculpted curls',coils:'Short coils',sweep:'Side sweep',bob:'Rounded bob',wrap:'Headwrap',cap:'Racing cap'}),
    face:Object.freeze({oval:'Oval face',round:'Round face',angular:'Angular face'}),
    detail:Object.freeze({none:'No face detail',freckles:'Freckles',glasses:'Glasses',brows:'Bold brows'}),
    outfit:Object.freeze({teal:['Teal','#167c91','#63d3d5'],plum:['Plum','#673b7d','#d7a9e9'],amber:['Amber','#aa6424','#ffd08a'],cobalt:['Cobalt','#315eb3','#9cc5ff']}),
    expression:Object.freeze({ready:'Ready',smile:'Smiling',focus:'Focused'})
  });
  const presets=Object.freeze({
    rocket:Object.freeze({skin:'deep',hair:'curls',face:'oval',detail:'none',outfit:'teal',expression:'smile'}),
    wiz:Object.freeze({skin:'tan',hair:'sweep',face:'round',detail:'glasses',outfit:'plum',expression:'ready'}),
    tower:Object.freeze({skin:'brown',hair:'coils',face:'angular',detail:'brows',outfit:'cobalt',expression:'focus'}),
    trick:Object.freeze({skin:'light',hair:'bob',face:'round',detail:'freckles',outfit:'amber',expression:'smile'}),
    cannon:Object.freeze({skin:'deep',hair:'cap',face:'angular',detail:'brows',outfit:'plum',expression:'ready'})
  });
  const valid=(key,value,fallback)=>Object.hasOwn(choices[key],value)?value:fallback;
  function normalize(input,legacy='rocket'){
    const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{},base=presets[legacy]||presets.rocket;
    return{version:1,skin:valid('skin',source.skin,base.skin),hair:valid('hair',source.hair,base.hair),face:valid('face',source.face,base.face),detail:valid('detail',source.detail,base.detail),outfit:valid('outfit',source.outfit,base.outfit),expression:valid('expression',source.expression,base.expression)};
  }
  function description(input,legacy){const look=normalize(input,legacy);return`${choices.skin[look.skin][0]} skin, ${choices.hair[look.hair].toLowerCase()}, ${choices.face[look.face].toLowerCase()}, ${choices.detail[look.detail].toLowerCase()}, ${choices.outfit[look.outfit][0].toLowerCase()} jacket, ${choices.expression[look.expression].toLowerCase()}`;}
  function svg(input,legacy){
    const look=normalize(input,legacy),skin=choices.skin[look.skin],outfit=choices.outfit[look.outfit],hair=look.hair;
    const facePaths={oval:'M37 55Q38 27 60 29Q82 27 83 55Q81 80 60 91Q39 80 37 55Z',round:'M34 56Q35 28 60 30Q85 28 86 56Q86 80 60 91Q34 80 34 56Z',angular:'M39 52Q44 28 60 28Q77 28 82 52L79 73Q73 87 60 92Q47 87 41 73Z'};
    const face=`<ellipse cx="60" cy="59" rx="27" ry="31" fill="${skin[1]}"/><path d="${facePaths[look.face]}" fill="${skin[2]}"/><path d="M43 74q7 15 17 16 11-1 17-16-7 7-17 8-10-1-17-8" fill="${skin[1]}" opacity=".18"/><path d="M45 58q4-2 9 0m12 0q5-2 9 0" fill="none" stroke="#33241f" stroke-width="2.2" stroke-linecap="round"/><circle cx="50" cy="61" r="1.8" fill="#1b2531"/><circle cx="70" cy="61" r="1.8" fill="#1b2531"/><path d="M60 62l-2 9q2 2 5 0" fill="none" stroke="${skin[1]}" stroke-width="1.7" stroke-linecap="round"/>`;
    const mouth=look.expression==='smile'?'<path d="M52 76q8 8 16 0" fill="none" stroke="#6c3732" stroke-width="2" stroke-linecap="round"/>':look.expression==='focus'?'<path d="M53 78q7-2 14 0" fill="none" stroke="#63352f" stroke-width="2" stroke-linecap="round"/>':'<path d="M54 77q6 3 12 0" fill="none" stroke="#63352f" stroke-width="2" stroke-linecap="round"/>';
    const details=look.detail==='freckles'?'<g fill="#87523a" opacity=".7"><circle cx="44" cy="70" r="1"/><circle cx="48" cy="72" r=".8"/><circle cx="73" cy="70" r="1"/><circle cx="77" cy="72" r=".8"/></g>':look.detail==='glasses'?'<g fill="none" stroke="#142536" stroke-width="2.2"><rect x="38" y="56" width="18" height="14" rx="5"/><rect x="64" y="56" width="18" height="14" rx="5"/><path d="M56 60q4-3 8 0M38 59l-5-1m49 1 5-1"/></g>':look.detail==='brows'?'<g fill="none" stroke="#30231f" stroke-width="3.4" stroke-linecap="round"><path d="M43 55q6-4 12-1m10 0q6-3 12 1"/></g>':'';
    const hairs={
      curls:'<path d="M33 57q-7-17 3-28 9-15 26-13 24-3 32 24 0 14-8 19l-5-11q-3-7-8-8-16 8-36 7z" fill="#27202a"/><g fill="#473540"><circle cx="37" cy="35" r="9"/><circle cx="46" cy="24" r="10"/><circle cx="60" cy="21" r="11"/><circle cx="75" cy="26" r="10"/><circle cx="85" cy="37" r="8"/></g>',
      coils:'<path d="M35 49q-4-28 25-32 29 3 25 32l-6-8q-15-8-39 2z" fill="#1d242a"/><g fill="#3b3531"><circle cx="39" cy="34" r="5"/><circle cx="49" cy="26" r="6"/><circle cx="61" cy="24" r="6"/><circle cx="73" cy="27" r="6"/><circle cx="82" cy="36" r="5"/></g>',
      sweep:'<path d="M33 58q-2-33 26-39 25-1 29 27l-8 15-4-20q-15 11-40 13z" fill="#302327"/><path d="M35 43q20-27 49-13-12 18-47 20" fill="#5a3a35"/>',
      bob:'<path d="M33 42q5-26 27-27 26 0 30 29l3 47-15-5-1-36q-19 8-34 0l-2 36-15 5z" fill="#28242e"/><path d="M38 42q13-22 42-11-11 20-40 20" fill="#51414b"/>',
      wrap:'<path d="M32 55q-4-31 27-38 31 5 29 38l-11-9q-16-6-35 1z" fill="#523074"/><path d="M34 41q28-9 51 1M47 22q15 6 28 0" fill="none" stroke="#a97bc8" stroke-width="5" stroke-linecap="round"/><path d="M79 30q15 15 9 35" fill="none" stroke="#d6a6ea" stroke-width="4"/>',
      cap:'<path d="M32 49q3-27 28-29 27 1 29 29l-8 4q-19-7-42 0z" fill="#183b61"/><path d="M34 47q27-6 54 1 3 6-5 8-22-4-47 0-9-2-2-9" fill="#4c8bc0"/><path d="M43 30q17-9 35 1" fill="none" stroke="#8ac0e6" stroke-width="3"/>'
    };
    return`<svg class="driver-avatar-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect width="120" height="120" rx="18" fill="#102239"/><path d="M0 93q60-24 120 0v27H0z" fill="#172f4d"/><circle cx="94" cy="23" r="30" fill="${outfit[2]}" opacity=".13"/><path d="M13 120q4-27 22-33l13-6h24l13 6q18 6 22 33" fill="${outfit[1]}"/><path d="M22 120q5-20 17-28l11 28m48 0Q94 100 82 92L71 120" fill="${outfit[2]}" opacity=".5"/><path d="M50 81v12q10 10 20 0V81" fill="${skin[1]}"/><path d="M42 86l18 23 18-23-8-4-10 14-10-14z" fill="#e8eff4"/><path d="M34 90l13 30m39-30-13 30" stroke="#092137" stroke-width="3" opacity=".55"/>${face}${mouth}${details}${hairs[hair]}<path d="M13 110q47 14 94 0" fill="none" stroke="${outfit[2]}" stroke-width="2" opacity=".55"/></svg>`;
  }
  root.KickLabProfileAvatarArt=Object.freeze({choices,presets,normalize,description,svg});
})(typeof globalThis!=='undefined'?globalThis:window);
