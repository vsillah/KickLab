import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../../src/shared/race-origin.js',import.meta.url),'utf8');
export const local=(search='')=>({protocol:'http:',hostname:'localhost',port:'4173',pathname:'/kicklab.html',search});
export const pages=(search='')=>({protocol:'https:',hostname:'vsillah.github.io',port:'',pathname:'/KickLab/',search});
export function raceContext(location,extra={}){
  const context={location,URLSearchParams,...extra};
  vm.runInNewContext(source,context);
  return context;
}
