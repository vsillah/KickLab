import test from 'node:test';
import assert from 'node:assert/strict';
import {local,pages,raceContext} from './helpers/race-origin.mjs';

function homeHarness(href){
  const location=new URL(href),items=new Map(),storage={setItem:(key,value)=>items.set(key,value),getItem:key=>items.get(key)||null,removeItem:key=>items.delete(key)};
  const origin=raceContext(location,{URL,sessionStorage:storage}).KickLabRaceOrigin;
  let navigated=null;
  const enter=()=>origin.enterFromHome(location,storage,url=>{navigated=url;});
  return{origin,location,storage,enter,navigated:()=>navigated};
}

const trusted=location=>raceContext(location).KickLabRaceOrigin.trusted();

test('Race prototypes trust the canonical Pages path and local development only',()=>{
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

test('unflagged load remains default-off until home Race entry on trusted origins',()=>{
  for(const href of ['http://localhost:4173/kicklab.html?qa=home&rev=abc','http://127.0.0.1:4173/kicklab.html','https://vsillah.github.io/KickLab/?qa=home&rev=abc']){
    const h=homeHarness(href);
    assert.equal(h.origin.HOME_FLAGS.racePreflight,'prototype');
    assert.equal(h.origin.consumeHomeEntry(h.location,h.storage),false);
    assert.equal(h.enter(),true);
    const destination=new URL(h.navigated());
    for(const [key,value] of Object.entries(h.origin.HOME_FLAGS))assert.equal(destination.searchParams.get(key),value,key);
    assert.equal(destination.searchParams.get('qa'),new URL(href).searchParams.get('qa'));
    assert.equal(destination.searchParams.get('rev'),new URL(href).searchParams.get('rev'));
    assert.equal(h.origin.consumeHomeEntry(destination,h.storage),true);
    assert.equal(h.origin.consumeHomeEntry(destination,h.storage),false);
    assert.equal(h.origin.enterFromHome(destination,h.storage,()=>assert.fail('reload loop')),false);
  }
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
