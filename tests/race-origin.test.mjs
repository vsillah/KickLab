import test from 'node:test';
import assert from 'node:assert/strict';
import {local,pages,raceContext} from './helpers/race-origin.mjs';

function homeHarness(href){
  const location=new URL(href),items=new Map(),storage={setItem:(key,value)=>items.set(key,value),getItem:key=>items.get(key)||null,removeItem:key=>items.delete(key)};
  const origin=raceContext(location,{URL,sessionStorage:storage}).KickLabRaceOrigin;
  let navigated=null,replaced=null;
  const enter=()=>origin.enterFromHome(location,storage,url=>{navigated=url;},url=>{replaced=url;location.href=url;});
  return{origin,location,storage,enter,navigated:()=>navigated,replaced:()=>replaced};
}

const trusted=location=>raceContext(location).KickLabRaceOrigin.trusted();

test('web Race prototypes trust the canonical Pages path and local development only',()=>{
  assert.equal(trusted(local()),true);
  assert.equal(trusted({...local(),hostname:'127.0.0.1'}),true);
  assert.equal(trusted(pages()),true);
  assert.equal(trusted({...pages(),pathname:'/KickLab/index.html'}),true);
  for(const location of [
    {...pages(),protocol:'http:'},
    {...pages(),hostname:'vsillah.github.io.evil.test'},
    {...pages(),port:'8443'},
    {...pages(),pathname:'/KickLab'},
    {...pages(),pathname:'/KickLab/other.html'},
    {...pages(),pathname:'/Other/'},
    {...pages(),pathname:'/kicklab/'},
    {...local(),protocol:'file:'},
    {...local(),hostname:'localhost.evil.test'}
  ])assert.equal(trusted(location),false,JSON.stringify(location));
  assert.equal(raceContext(null).KickLabRaceOrigin.trusted(),false);
});

test('native Race trusts only the packaged Capacitor page and reviewed feature flags',()=>{
  for(const href of ['capacitor://localhost/','capacitor://localhost/index.html','capacitor://localhost/?racePreflight=prototype&raceExpansion=prototype'])assert.equal(trusted(new URL(href)),true,href);
  for(const href of [
    'capacitor://localhost.evil.test/',
    'capacitor://user@localhost/',
    'capacitor://localhost:443/',
    'capacitor://localhost/other.html',
    'ionic://localhost/',
    'https://example.test/',
    'capacitor://localhost/?raceCompetition=prototype',
    'capacitor://localhost/?raceChampionship=prototype',
    'capacitor://localhost/?raceMultiplayer=prototype',
    'capacitor://localhost/?racePrivateParty=prototype',
    'capacitor://localhost/?raceAudio=prototype',
    'capacitor://localhost/?raceCompactGuidanceQA=1'
  ])assert.equal(trusted(new URL(href)),false,href);
});

test('native Home entry reloads only reviewed Race flags on the same packaged page',()=>{
  const h=homeHarness('capacitor://localhost/?rev=native-race');
  let activated=0;h.origin.onHomeEntry(()=>activated++);
  assert.equal(h.enter(),'document');
  assert.equal(activated,0);
  assert.equal(h.replaced(),null);
  const target=new URL(h.navigated());
  assert.equal(target.origin,'null');
  assert.equal(target.protocol,'capacitor:');
  assert.equal(target.hostname,'localhost');
  assert.equal(target.pathname,'/');
  assert.equal(target.searchParams.get('rev'),'native-race');
  assert.deepEqual([...target.searchParams].filter(([key])=>key.startsWith('race')).sort(),Object.entries(h.origin.NATIVE_FLAGS).sort());
  assert.equal(h.origin.consumeHomeEntry(target,h.storage),true);
  assert.equal(h.origin.consumeHomeEntry(target,h.storage),false);
  const denied=homeHarness('capacitor://localhost/?raceMultiplayer=prototype');
  assert.equal(denied.enter(),false);
  assert.equal(denied.navigated(),null);
});

test('unflagged home Race entry updates the loaded document URL without requesting HTML',()=>{
  for(const href of ['http://localhost:4173/kicklab.html?qa=home&rev=abc','http://127.0.0.1:4173/kicklab.html','https://vsillah.github.io/KickLab/?qa=home&rev=abc']){
    const h=homeHarness(href);
    assert.equal(h.origin.HOME_FLAGS.racePreflight,'prototype');
    assert.equal(h.origin.consumeHomeEntry(h.location,h.storage),false);
    let activated=0;h.origin.onHomeEntry(()=>activated++);
    assert.equal(h.enter(),'local');
    assert.equal(h.navigated(),null);
    assert.equal(activated,1);
    const destination=new URL(h.replaced());
    for(const [key,value] of Object.entries(h.origin.HOME_FLAGS))assert.equal(destination.searchParams.get(key),value,key);
    assert.equal(destination.searchParams.get('qa'),new URL(href).searchParams.get('qa'));
    assert.equal(destination.searchParams.get('rev'),new URL(href).searchParams.get('rev'));
    assert.equal(h.origin.consumeHomeEntry(destination,h.storage),false);
    assert.equal(h.enter(),'local');
    assert.equal(activated,1);
  }
});

test('partial explicit Race flags retain the document handoff and failed URL updates fail closed',()=>{
  const partial=homeHarness('https://vsillah.github.io/KickLab/?raceExpansion=prototype');
  assert.equal(partial.enter(),'document');
  assert.equal(partial.replaced(),null);
  assert.match(partial.navigated(),/racePreflight=prototype/);
  assert.equal(partial.origin.consumeHomeEntry(new URL(partial.navigated()),partial.storage),true);
  const denied=homeHarness('https://vsillah.github.io/KickLab/');
  assert.equal(denied.origin.enterFromHome(denied.location,denied.storage,()=>assert.fail('navigation'),()=>{throw Error('denied');}),false);
  assert.equal(denied.location.search,'');
});

test('loaded-home Race entry works when session storage writes are denied',()=>{
  const h=homeHarness('https://vsillah.github.io/KickLab/');
  let replaced=null;
  const deniedStorage={setItem(){throw Error('denied');}};
  assert.equal(h.origin.enterFromHome(h.location,deniedStorage,()=>assert.fail('document navigation'),url=>{replaced=url;h.location.href=url;}),'local');
  assert.equal(new URL(replaced).searchParams.get('racePreflight'),'prototype');
});

test('home Race entry fails closed on untrusted origins and does not alter other lab entry',()=>{
  for(const href of ['https://example.test/KickLab/','http://vsillah.github.io/KickLab/','https://vsillah.github.io/KickLab/other.html']){
    const h=homeHarness(href);
    assert.equal(h.enter(),false);
    assert.equal(h.navigated(),null);
    assert.equal(h.origin.consumeHomeEntry(h.location,h.storage),false);
  }
  const source=homeHarness('https://vsillah.github.io/KickLab/');
  assert.equal(source.location.search,'');
  assert.equal(source.navigated(),null);
});
