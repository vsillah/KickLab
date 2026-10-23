/* Local, disposable Race layers. The shared audio context is unlocked by user input. */
const RACE_SPEED_AUDIO={nodes:null,buffer:null,
  start(){if(this.nodes||!AC||AC.state!=='running'||best.mute)return;try{
    const context=AC,master=context.createGain();master.gain.value=.55;master.connect(context.destination);
    const harmonic=context.createOscillator(),harmonicGain=context.createGain();harmonic.type='triangle';harmonicGain.gain.value=0;harmonic.connect(harmonicGain).connect(master);harmonic.start();
    if(!this.buffer||this.buffer.sampleRate!==context.sampleRate){const buffer=context.createBuffer(1,context.sampleRate,context.sampleRate),data=buffer.getChannelData(0);let seed=1937;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*.55;}this.buffer=buffer;}
    const makeNoise=(type,frequency)=>{const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=this.buffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;gain.gain.value=0;source.connect(filter).connect(gain).connect(master);source.start();return{source,filter,gain};};
    this.nodes={master,harmonic,harmonicGain,wind:makeNoise('highpass',650),road:makeNoise('lowpass',360),tire:makeNoise('bandpass',1500)};
  }catch(_error){this.stop();}},
  update(cue,{active=false,gear=0}={}){if(!active||best.mute||!AC||AC.state!=='running'){this.stop();return;}this.start();if(!this.nodes)return;const n=this.nodes,time=AC.currentTime;
    n.harmonic.frequency.setTargetAtTime(cue.frequency,time,.065);n.harmonicGain.gain.setTargetAtTime(cue.harmonic,time,.08);
    n.wind.gain.gain.setTargetAtTime(cue.wind,time,.1);n.road.gain.gain.setTargetAtTime(cue.roadNoise,time,.08);n.tire.gain.gain.setTargetAtTime(cue.tireNoise,time,.06);
    if(gear&&this.lastGear&&gear!==this.lastGear)tone(gear>this.lastGear?190:145,.075,'triangle',.025);this.lastGear=gear;
  },
  stop(){if(!this.nodes){this.lastGear=0;return;}const n=this.nodes;this.nodes=null;this.lastGear=0;for(const source of [n.harmonic,n.wind.source,n.road.source,n.tire.source]){try{source.stop();source.disconnect();}catch(_error){}}for(const node of [n.harmonicGain,n.wind.filter,n.wind.gain,n.road.filter,n.road.gain,n.tire.filter,n.tire.gain,n.master])node.disconnect();}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)RACE_SPEED_AUDIO.stop();});
window.addEventListener('pagehide',()=>RACE_SPEED_AUDIO.stop());
