import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
const base=resolve('src');
const modes=['drag','drift','circuit','hill','endurance'],vehicles=['kestrel','cobalt','aegis','vesper','sable'];
let total=0;
for(const kind of ['drive','arrival']){
  const manifest=JSON.parse(readFileSync(resolve(base,'media/race-preflight',kind==='drive'?'manifest.json':'arrival-manifest.json'),'utf8'));
  if(manifest.entries.length!==25||manifest.kind!==kind)throw Error(`${kind} manifest incomplete`);
  for(const mode of modes)for(const vehicle of vehicles){
    const entry=manifest.entries.find(item=>item.mode===mode&&item.vehicle===vehicle);
    if(!entry)throw Error(`Missing ${kind} ${mode}/${vehicle}`);
    const file=resolve(base,entry.video),poster=resolve(base,entry.poster),bytes=readFileSync(file),hash=createHash('sha256').update(bytes).digest('hex');
    if(hash!==entry.sha256||bytes.length!==entry.bytes||bytes.length>750000||statSync(poster).size<1000)throw Error(`Invalid media ${file}`);
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,avg_frame_rate','-of','json',file],{encoding:'utf8'}));
    const duration=Number(probe.format?.duration),stream=probe.streams?.[0];
    if(duration<4||duration>7||stream?.codec_name!=='h264'||stream?.width!==720||entry.sourceFrames<(['vesper','sable'].includes(vehicle)?60:90))throw Error(`Invalid playback ${file}: ${JSON.stringify({duration,stream,frames:entry.sourceFrames})}`);
    const motion=execFileSync('ffmpeg',['-v','error','-i',file,'-vf','select=eq(n\\,12)+eq(n\\,84)','-fps_mode','vfr','-f','framemd5','-'],{encoding:'utf8'}).split('\n').filter(line=>line.startsWith('0,')).map(line=>line.split(',').at(-1).trim());
    if(motion.length!==2||motion[0]===motion[1])throw Error(`Frozen clip ${file}`);
    total+=bytes.length;
  }
}
console.log(JSON.stringify({pairings:25,clips:50,totalMiB:Number((total/1048576).toFixed(2)),maxBytes:750000,sourceFramesMinimum:60,codec:'h264'}));
let venueBytes=0;
const sourceModels=new Set();
for(const kind of ['drive','arrival']){
  const manifest=JSON.parse(readFileSync(resolve(base,'media/race-preflight',kind==='drive'?'venue-manifest.json':'venue-arrival-manifest.json'),'utf8'));
  if(manifest.entries.length!==10||manifest.kind!==kind||manifest.venueCapture!==true||manifest.source!=='KickLab local Race 3D renderer'||!manifest.commercialReleaseDisposition?.startsWith('hold:'))throw Error(`${kind} venue provenance or commercial hold incomplete`);
  for(const mode of ['marine','forest'])for(const vehicle of vehicles){
    const entry=manifest.entries.find(item=>item.mode===mode&&item.vehicle===vehicle);
    if(!entry||!entry.course.startsWith(`${mode}/`)||!entry.course.includes('/legacy/'))throw Error(`Missing canonical ${kind} ${mode}/${vehicle}`);
    const file=resolve(base,entry.video),poster=resolve(base,entry.poster),bytes=readFileSync(file),posterBytes=readFileSync(poster);
    if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256||createHash('sha256').update(posterBytes).digest('hex')!==entry.posterSha256||bytes.length!==entry.bytes||bytes.length>750000||posterBytes.length<1000||entry.sourceFrames<60)throw Error(`Invalid venue media ${file}`);
    const modelPath=resolve(base,entry.asset),modelManifest=JSON.parse(readFileSync(resolve(dirname(modelPath),'asset-manifest.json'),'utf8'));
    if(modelManifest.artifact?.path!==`src/${entry.asset}`||createHash('sha256').update(readFileSync(modelPath)).digest('hex')!==modelManifest.artifact.sha256||modelManifest.status!=='evaluation-only'||modelManifest.provenance?.externalInputs!==false)throw Error(`Unverified local model input ${entry.asset}`);
    sourceModels.add(entry.asset);
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',file],{encoding:'utf8'}));
    if(Number(probe.format?.duration)<4||Number(probe.format?.duration)>7||probe.streams?.[0]?.codec_name!=='h264'||probe.streams?.[0]?.width!==720)throw Error(`Invalid venue playback ${file}`);
    venueBytes+=bytes.length;
  }
}
if(sourceModels.size!==5)throw Error(`Expected five distinct local vehicle model inputs, found ${sourceModels.size}`);
console.log(JSON.stringify({venuePairings:10,venueClips:20,venueFiles:40,sourceModels:sourceModels.size,commercialReleaseDisposition:'hold',venueMiB:Number((venueBytes/1048576).toFixed(2)),maxBytes:750000,sourceFramesMinimum:60,codec:'h264'}));
