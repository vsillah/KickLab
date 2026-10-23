import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(process.argv[2]||'qa-artifacts/race-simulator');
const files=[
  ...readdirSync(resolve(root,'3d-final')).filter(name=>name.endsWith('.png')).map(name=>resolve(root,'3d-final',name)),
  ...readdirSync(resolve(root,'canvas-final')).filter(name=>name.endsWith('.png')).map(name=>resolve(root,'canvas-final',name)),
  ...readdirSync(root).filter(name=>name.startsWith('race-simulator-3d-')&&name.endsWith('.png')).map(name=>resolve(root,name)),
  ...readdirSync(resolve(root,'canvas-fallback')).filter(name=>name.endsWith('.png')).map(name=>resolve(root,'canvas-fallback',name)),
  resolve(root,'race-simulator-walkthrough.mp4'),
  resolve(root,'canvas-fallback/race-simulator-canvas-fallback.mp4')
];
const width=170,height=80,frameBytes=width*height*3,results=[];
for(const file of files){
  const decode=spawnSync('ffmpeg',['-v','error','-i',file,'-vf',`crop=${width}:${height}:0:0`,'-pix_fmt','rgb24','-f','rawvideo','pipe:1'],{maxBuffer:64*1024*1024});
  if(decode.status!==0||decode.stdout.length%frameBytes)throw new Error(`Cannot decode ${file}: ${decode.stderr}`);
  let suspicious=0,frames=decode.stdout.length/frameBytes;
  for(let frame=0;frame<frames;frame++){
    let orange=0;const end=(frame+1)*frameBytes;
    for(let i=frame*frameBytes;i<end;i+=3){const r=decode.stdout[i],g=decode.stdout[i+1],b=decode.stdout[i+2];if(r>230&&g>=140&&g<=205&&b>=35&&b<=125)orange++;}
    if(orange>25)suspicious++;
  }
  results.push({file,frames,suspicious});
}
if(results.some(result=>result.suspicious))throw new Error(`Focused skip link color detected: ${JSON.stringify(results.filter(result=>result.suspicious))}`);
console.log(JSON.stringify({files:results.length,frames:results.reduce((total,result)=>total+result.frames,0),skipLinkHits:0},null,2));
