import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const base=new URL(process.argv[2]||'');
if (!((base.protocol==='https:'&&base.hostname==='vsillah.github.io'&&base.pathname==='/KickLab/') ||
      (base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname)))) {
  throw new Error('Use the exact KickLab Pages URL or a loopback QA origin');
}
const files=JSON.parse(readFileSync(join(root,'config','package-only-asset-exclusions.json'),'utf8')).files;
if(files.length!==6)throw new Error('Expected six exact public exclusions');
const revision=process.env.GITHUB_SHA||'local';
for(let attempt=1;attempt<=12;attempt++){
  const results=await Promise.all(files.map(async({path})=>{
    const url=new URL(path,base);url.searchParams.set('rev',revision);
    const response=await fetch(url,{method:'HEAD',cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    return{path,status:response.status};
  }));
  if(results.every(result=>result.status===404)){
    console.log(`All six excluded Pages paths return HTTP 404 at ${base.href} (${revision}, attempt ${attempt})`);
    process.exit(0);
  }
  if(attempt===12)throw new Error(`Excluded Pages paths remain public: ${JSON.stringify(results.filter(result=>result.status!==404))}`);
  await new Promise(resolve=>setTimeout(resolve,10000));
}
