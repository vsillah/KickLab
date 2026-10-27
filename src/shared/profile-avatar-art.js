(function installKickLabProfileAvatarArt(root){
  'use strict';
  // Existing IDs select the curated portraits. Older avatarLook fields remain
  // normalized in storage for compatibility without changing the chosen ID.
  const choices=Object.freeze({
    skin:Object.freeze({deep:['Deep brown'],brown:['Brown'],tan:['Tan'],light:['Light']}),
    hair:Object.freeze({curls:'Sculpted curls',coils:'Short coils',sweep:'Side sweep',bob:'Rounded bob',wrap:'Headwrap',cap:'Racing cap'}),
    face:Object.freeze({oval:'Oval face',round:'Round face',angular:'Angular face'}),
    detail:Object.freeze({none:'No face detail',freckles:'Freckles',glasses:'Glasses',brows:'Bold brows'}),
    outfit:Object.freeze({teal:['Teal'],plum:['Plum'],amber:['Amber'],cobalt:['Cobalt']}),
    expression:Object.freeze({ready:'Ready',smile:'Smiling',focus:'Focused'})
  });
  const presets=Object.freeze({
    rocket:Object.freeze({skin:'deep',hair:'curls',face:'oval',detail:'none',outfit:'teal',expression:'smile'}),
    wiz:Object.freeze({skin:'tan',hair:'sweep',face:'round',detail:'glasses',outfit:'plum',expression:'ready'}),
    tower:Object.freeze({skin:'brown',hair:'coils',face:'angular',detail:'brows',outfit:'cobalt',expression:'focus'}),
    trick:Object.freeze({skin:'light',hair:'bob',face:'round',detail:'freckles',outfit:'amber',expression:'smile'}),
    cannon:Object.freeze({skin:'deep',hair:'cap',face:'angular',detail:'brows',outfit:'plum',expression:'ready'})
  });
  const labels=Object.freeze({rocket:'Rocket',wiz:'Playmaker',tower:'Guardian',trick:'Trickster',cannon:'Powerhouse'});
  const valid=(key,value,fallback)=>Object.hasOwn(choices[key],value)?value:fallback;
  const portraitId=id=>Object.hasOwn(presets,id)?id:'rocket';
  function normalize(input,legacy='rocket'){
    const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{},base=presets[portraitId(legacy)];
    return{version:1,skin:valid('skin',source.skin,base.skin),hair:valid('hair',source.hair,base.hair),face:valid('face',source.face,base.face),detail:valid('detail',source.detail,base.detail),outfit:valid('outfit',source.outfit,base.outfit),expression:valid('expression',source.expression,base.expression)};
  }
  function asset(id){return`assets/drivers/v2/${portraitId(id)}.webp`;}
  function description(_look,id){return`${labels[portraitId(id)]} driver in a racing suit`;}
  root.KickLabProfileAvatarArt=Object.freeze({choices,presets,normalize,portraitId,asset,description});
})(typeof globalThis!=='undefined'?globalThis:window);
