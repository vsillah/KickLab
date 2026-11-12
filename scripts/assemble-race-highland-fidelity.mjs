import {existsSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const root=resolve('qa-artifacts/race-highland-fidelity');
const frames=join(root,`exact-head-${head.slice(0,7)}`);
const out=join(root,`exact-head-${head.slice(0,12)}`);mkdirSync(out,{recursive:true});
const source=join(out,`race-highland-${head.slice(0,12)}.mp4`);
const matrix=JSON.parse(readFileSync(join(frames,'report.json'),'utf8'));
const recorded=JSON.parse(readFileSync(join(out,'report.json'),'utf8'));
if(matrix.head!==head||recorded.head!==head||!recorded.realGameplay||recorded.errors.length||recorded.external.length)throw Error('Scene frames and gameplay must both match clean exact-head runs');
const offset=Number(process.argv[2]);if(!Number.isFinite(offset)||offset<0)throw Error('Pass the observed real-gameplay start time in seconds');
const states=[['starting-grid','Starting grid'],['launch','Launch'],['straight-speed','Straight at speed'],['braking-approach','Braking approach'],['corner-apex','Corner apex'],['recovery-finish','Recovery and finish']];
const clips=[];
function ffmpeg(args){const result=spawnSync('ffmpeg',['-y','-loglevel','error',...args],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr||`ffmpeg exited ${result.status}`);}
const fit='scale=390:844:force_original_aspect_ratio=decrease,pad=390:844:(ow-iw)/2:(oh-ih)/2:black';
for(let i=0;i<states.length;i++){
  const [slug,title]=states[i],image=join(frames,`390x844-normal-on-${slug}.png`),clip=join(out,`state-${i+1}.mp4`);
  if(!existsSync(image))throw Error(`Missing exact-head review frame: ${image}`);
  ffmpeg(['-loop','1','-framerate','30','-t','1.6','-i',image,'-vf',fit,'-r','30','-an','-c:v','libx264','-pix_fmt','yuv420p',clip]);clips.push(clip);
}
const gameplay=join(out,'real-gameplay.mp4');
ffmpeg(['-ss',String(offset),'-i',source,'-t','7','-vf',fit,'-r','30','-an','-c:v','libx264','-pix_fmt','yuv420p',gameplay]);clips.push(gameplay);
const list=join(out,'concat.txt');writeFileSync(list,clips.map(path=>`file '${path.replaceAll("'","'\\''")}'`).join('\n')+'\n');
const target=join(out,`race-highland-review-${head.slice(0,12)}.mp4`);
ffmpeg(['-f','concat','-safe','0','-i',list,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',target]);
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',target],{encoding:'utf8'});if(probe.status!==0)throw Error(probe.stderr);
const details=JSON.parse(probe.stdout),duration=Number(details.format.duration);
if(!details.streams.some(stream=>stream.codec_name==='h264'&&stream.width===390&&stream.height===844)||duration<14||statSync(target).size<100000)throw Error('Review MP4 failed playback qualification');
const desktopClips=[];
for(let i=0;i<states.length;i++){
  const [slug]=states[i],image=join(frames,`1440x900-normal-on-${slug}.png`),clip=join(out,`desktop-state-${i+1}.mp4`);
  if(!existsSync(image))throw Error(`Missing exact-head desktop frame: ${image}`);
  ffmpeg(['-loop','1','-framerate','30','-t','2','-i',image,'-vf','scale=1280:800','-r','30','-an','-c:v','libx264','-pix_fmt','yuv420p',clip]);desktopClips.push(clip);
}
const desktopList=join(out,'desktop-concat.txt');writeFileSync(desktopList,desktopClips.map(path=>`file '${path.replaceAll("'","'\\''")}'`).join('\n')+'\n');
const desktopTarget=join(out,`race-highland-desktop-${head.slice(0,12)}.mp4`);
ffmpeg(['-f','concat','-safe','0','-i',desktopList,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',desktopTarget]);
const desktopProbe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',desktopTarget],{encoding:'utf8'});if(desktopProbe.status!==0)throw Error(desktopProbe.stderr);
const desktopDetails=JSON.parse(desktopProbe.stdout);
if(!desktopDetails.streams.some(stream=>stream.codec_name==='h264'&&stream.width===1280&&stream.height===800)||Number(desktopDetails.format.duration)<11||statSync(desktopTarget).size<100000)throw Error('Desktop review MP4 failed playback qualification');
console.log(JSON.stringify({head,target,desktopTarget,source,offset,duration,desktopDuration:Number(desktopDetails.format.duration),bytes:statSync(target).size,desktopBytes:statSync(desktopTarget).size,states:states.map(([,title])=>title)},null,2));
