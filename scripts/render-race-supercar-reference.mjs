// Deterministic listening references for the default-off local synthesis prototype.
// These are scripted PCM comparisons, not recordings of browser output.
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const out=resolve(process.argv[2]||'qa-artifacts/race-supercar-audio');mkdirSync(out,{recursive:true});
const rate=48000,seconds=20,profiles={kestrel:{pulse:2.3,bright:1.28,bass:.68,rasp:1.25,redline:8500},cobalt:{pulse:2,bright:1,bass:1,rasp:.9,redline:7600},aegis:{pulse:1.8,bright:.82,bass:1.3,rasp:1.12,redline:7200}};
const segments=[{name:'idle',end:2,rpm:.15,load:0,speed:0},{name:'launch',end:5,rpm:.65,load:.9,speed:.35},{name:'cruise',end:9,rpm:.56,load:.38,speed:.7},{name:'shift',end:10,rpm:.39,load:.12,speed:.74},{name:'brake',end:13,rpm:.28,load:0,speed:.45,brake:1},{name:'drift',end:16,rpm:.62,load:.55,speed:.42,slip:.7},{name:'NOS',end:18,rpm:.82,load:1,speed:.88,nos:1},{name:'lift',end:20,rpm:.35,load:0,speed:.6}];
function wav(samples){const bytes=Buffer.alloc(44+samples.length*2);bytes.write('RIFF',0);bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples.length*2,40);for(let i=0;i<samples.length;i++)bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),44+i*2);return bytes;}
const report={sampleRate:rate,durationSeconds:seconds,segments:segments.map(s=>s.name),files:[]};
for(const [name,p] of Object.entries({baseline:null,...profiles})){
 const data=new Float32Array(rate*seconds);let phase=0,seed=71931,filtered=0,peak=0,sum=0;
 for(let i=0;i<data.length;i++){const t=i/rate,segment=segments.find(s=>t<s.end)||segments.at(-1),prev=segments[segments.indexOf(segment)-1]||segment,start=prev===segment?0:prev.end,blend=Math.min(1,Math.max(0,(t-start)/.18)),rpm=(prev.rpm||segment.rpm)*(1-blend)+segment.rpm*blend,load=(prev.load||0)*(1-blend)+segment.load*blend,speed=segment.speed;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;filtered=filtered*.94+white*.06;
  let value;if(!p){const frequency=58+rpm*205;phase+=frequency/rate;const triangle=2*Math.abs(2*(phase%1)-1)-1;value=(triangle+Math.sin(phase*3*Math.PI)*.42)*(.012+rpm*.025)*(.45+.55*load)*8+filtered*speed*.028;}
  else{const engineRpm=850+rpm*(p.redline-850),frequency=engineRpm/60*p.pulse;phase+=frequency/rate;let pulse=0;for(let h=1;h<=12;h++)pulse+=Math.sin(phase*h*2*Math.PI)/Math.pow(h,p.pulse)*(h>3?p.rasp:1)*(h%2?1:.82);value=pulse*(.12+load*.22)*p.bass+filtered*(.06+load*.11)*p.bright+white*(segment.slip||0)*.035+filtered*(segment.nos||0)*.055+white*(segment.brake||0)*.014;value=Math.tanh(value*1.35)*.68;}
  data[i]=value;peak=Math.max(peak,Math.abs(value));sum+=value*value;
 }
 const file=join(out,`${name}.wav`),bytes=wav(data);writeFileSync(file,bytes);report.files.push({vehicle:name,path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),peak:+peak.toFixed(4),rms:+Math.sqrt(sum/data.length).toFixed(4)});
}
writeFileSync(join(out,'reference-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
