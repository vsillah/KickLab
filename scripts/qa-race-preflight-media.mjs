import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const base=resolve('src');
const modes=['drag','drift','circuit','hill','endurance'],vehicles=['kestrel','cobalt','aegis'];
let total=0;
for(const kind of ['drive','arrival']){
  const manifest=JSON.parse(readFileSync(resolve(base,'media/race-preflight',kind==='drive'?'manifest.json':'arrival-manifest.json'),'utf8'));
  if(manifest.entries.length!==15||manifest.kind!==kind)throw Error(`${kind} manifest incomplete`);
  for(const mode of modes)for(const vehicle of vehicles){
    const entry=manifest.entries.find(item=>item.mode===mode&&item.vehicle===vehicle);
    if(!entry)throw Error(`Missing ${kind} ${mode}/${vehicle}`);
    const file=resolve(base,entry.video),poster=resolve(base,entry.poster),bytes=readFileSync(file),hash=createHash('sha256').update(bytes).digest('hex');
    if(hash!==entry.sha256||bytes.length!==entry.bytes||bytes.length>750000||statSync(poster).size<1000)throw Error(`Invalid media ${file}`);
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,avg_frame_rate','-of','json',file],{encoding:'utf8'}));
    const duration=Number(probe.format?.duration),stream=probe.streams?.[0];
    if(duration<4||duration>7||stream?.codec_name!=='h264'||stream?.width!==720||entry.sourceFrames<90)throw Error(`Invalid playback ${file}: ${JSON.stringify({duration,stream,frames:entry.sourceFrames})}`);
    const motion=execFileSync('ffmpeg',['-v','error','-i',file,'-vf','select=eq(n\\,12)+eq(n\\,84)','-fps_mode','vfr','-f','framemd5','-'],{encoding:'utf8'}).split('\n').filter(line=>line.startsWith('0,')).map(line=>line.split(',').at(-1).trim());
    if(motion.length!==2||motion[0]===motion[1])throw Error(`Frozen clip ${file}`);
    total+=bytes.length;
  }
}
console.log(JSON.stringify({pairings:15,clips:30,totalMiB:Number((total/1048576).toFixed(2)),maxBytes:750000,sourceFramesMinimum:90,codec:'h264'}));
