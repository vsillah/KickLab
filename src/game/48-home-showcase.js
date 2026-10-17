/* ---------- local, motion-aware home gameplay previews ---------- */
const HOME_PREVIEW_MOTION=window.matchMedia('(prefers-reduced-motion: reduce)');
const HOME_PREVIEW_CONSTRAINED=!!(navigator.connection&&navigator.connection.saveData)||(Number(navigator.deviceMemory)||8)<4||(Number(navigator.hardwareConcurrency)||8)<4;
const HOME_PREVIEWS=[...document.querySelectorAll('.lab-showcase')].map(card=>({card,video:card.querySelector('video')}));
function homePreviewAllowed(){return!HOME_PREVIEW_MOTION.matches&&!HOME_PREVIEW_CONSTRAINED&&!document.hidden&&!$('#modeHome').hidden;}
function setHomePreview(item,visible=true){const allow=homePreviewAllowed()&&visible;if(!allow){item.video.pause();item.card.dataset.previewState='poster';return;}const playing=item.video.play();if(playing&&typeof playing.catch==='function')playing.then(()=>item.card.dataset.previewState='motion').catch(()=>item.card.dataset.previewState='poster');}
HOME_PREVIEWS.forEach(item=>{item.video.muted=true;item.video.loop=true;item.video.playsInline=true;item.video.addEventListener('canplay',()=>setHomePreview(item));item.video.addEventListener('playing',()=>item.card.dataset.previewState='motion');item.video.addEventListener('error',()=>{item.video.pause();item.card.dataset.previewState='fallback';});});
const HOME_PREVIEW_OBSERVER='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(entry=>{const item=HOME_PREVIEWS.find(candidate=>candidate.video===entry.target);if(item)setHomePreview(item,entry.isIntersecting&&entry.intersectionRatio>.15);}),{threshold:[.15]}):null;
if(HOME_PREVIEW_OBSERVER)HOME_PREVIEWS.forEach(item=>HOME_PREVIEW_OBSERVER.observe(item.video));else HOME_PREVIEWS.forEach(item=>setHomePreview(item));
const syncHomePreviews=()=>HOME_PREVIEWS.forEach(item=>setHomePreview(item,item.video.getClientRects().length>0));
document.addEventListener('visibilitychange',syncHomePreviews);HOME_PREVIEW_MOTION.addEventListener?.('change',syncHomePreviews);new MutationObserver(syncHomePreviews).observe($('#modeHome'),{attributes:true,attributeFilter:['hidden']});
