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
  // Visual identity follows the saved avatar, independently of Kick's physics player.
  // Colors and silhouettes are matched to the local portrait set.
  const athletes=Object.freeze({
    rocket:Object.freeze({skin:'#9b6040',hair:'#24150f',hairStyle:'curls',eye:'#24150f',brow:'arc',mouth:'smile',face:'oval',build:.98,kit:'#138e9b',accent:'#71e0ca',shorts:'#143945',socks:'#d8fff2'}),
    wiz:Object.freeze({skin:'#c18a60',hair:'#251d1b',hairStyle:'sweep',eye:'#211b1a',brow:'arc',mouth:'focus',face:'round',glasses:true,build:.86,kit:'#743b86',accent:'#d49ee8',shorts:'#30203c',socks:'#eee1f1'}),
    tower:Object.freeze({skin:'#71432f',hair:'#1c1815',hairStyle:'coils',eye:'#1c1815',brow:'strong',mouth:'focus',face:'angular',build:1.2,kit:'#2465bd',accent:'#82b7ff',shorts:'#152c59',socks:'#e0edff'}),
    trick:Object.freeze({skin:'#d6a07c',hair:'#39251d',hairStyle:'bob',eye:'#2c201b',brow:'arc',mouth:'smile',face:'round',freckles:true,build:.89,kit:'#dd8b16',accent:'#ffe08f',shorts:'#56300f',socks:'#fff0cb'}),
    cannon:Object.freeze({skin:'#71432e',hair:'#1c1716',hairStyle:'cap',eye:'#201916',brow:'strong',mouth:'focus',face:'angular',build:1.13,kit:'#763e82',accent:'#d3a5dc',shorts:'#30203b',socks:'#e9dced'})
  });
  const valid=(key,value,fallback)=>Object.hasOwn(choices[key],value)?value:fallback;
  const portraitId=id=>Object.hasOwn(presets,id)?id:'rocket';
  function normalize(input,legacy='rocket'){
    const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{},base=presets[portraitId(legacy)];
    return{version:1,skin:valid('skin',source.skin,base.skin),hair:valid('hair',source.hair,base.hair),face:valid('face',source.face,base.face),detail:valid('detail',source.detail,base.detail),outfit:valid('outfit',source.outfit,base.outfit),expression:valid('expression',source.expression,base.expression)};
  }
  const labs=Object.freeze(['fight','race','kick']);
  const wardrobe=Object.freeze({fight:'boxing training gear',race:'racing suit',kick:'soccer kit'});
  function labId(value){return labs.includes(value)?value:'race';}
  // Additive asset mapping: stored avatar IDs and profile schema never change.
  function asset(id,lab='race'){
    const portrait=portraitId(id),activity=labId(lab);
    return activity==='race'?`assets/drivers/v2/${portrait}.webp`:`assets/players/${activity==='fight'?'v2':'v1'}/${activity}/${portrait}.webp`;
  }
  function description(_look,id,lab='race'){const activity=labId(lab);return`${labels[portraitId(id)]} player in ${wardrobe[activity]}`;}
  function gameplay(id){
    const avatar=portraitId(id),base=athletes[avatar];
    return Object.freeze({...base,avatar});
  }
  root.KickLabProfileAvatarArt=Object.freeze({choices,presets,normalize,portraitId,labId,labs,wardrobe,asset,description,gameplay});
})(typeof globalThis!=='undefined'?globalThis:window);
