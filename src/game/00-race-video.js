/* Race footage uses the 3D scene as its sole image source. The gameplay canvas
   and DOM cockpit remain available to players and to control tutorials. */
const RACE_VIDEO=Object.freeze({
  capture: ['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('raceVideo')==='cinematic',
  activate(){if(!this.capture||!this.source())return false;document.documentElement.dataset.raceVideo='cinematic';return true;},
  deactivate(){delete document.documentElement.dataset.raceVideo;},
  source(){const canvas=document.querySelector('#race3');return typeof RACE_3D!=='undefined'&&RACE_3D.on&&RACE_3D.ready&&canvas?.width&&canvas?.height?canvas:null;},
  draw(context,dx,dy,width,height){const source=this.source();if(!source)return false;context.drawImage(source,dx,dy,width,height);return true;}
});
globalThis.__KICKLAB_RACE_VIDEO__=RACE_VIDEO;
