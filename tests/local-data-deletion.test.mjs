import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/shared/profile-avatar-art.js');
await import('../src/shared/profile-store.js');

const {createManager,deleteAllLocalData,isDeleteConfirmation,PROFILE_KEY}=globalThis.KickLabProfiles;
function storage(seed={}){
  const data=new Map(Object.entries(seed));
  return {
    get length(){return data.size;},
    key(index){return [...data.keys()][index]??null;},
    getItem(key){return data.get(key)??null;},
    setItem(key,value){data.set(key,String(value));},
    removeItem(key){data.delete(key);},
    snapshot(){return Object.fromEntries(data);}
  };
}
function cache(seed=[]){const names=new Set(seed);return {keys:async()=>[...names],delete:async name=>names.delete(name)};}

test('requires lowercase delete and accepts only surrounding whitespace',()=>{
  for(const value of ['',null,'del','DELETE','Delete','delete now','de lete','delete\nagain'])assert.equal(isDeleteConfirmation(value),false,String(value));
  for(const value of ['delete',' delete ','\tdelete\n'])assert.equal(isDeleteConfirmation(value),true,JSON.stringify(value));
});

test('confirmation removes legacy-only data and restart bootstraps an empty player',async()=>{
  const local=storage({'impactlab.v1':JSON.stringify({xp:900}), 'impactlab.nick':'Old Fox','unrelated.settings':'keep'});
  const session=storage();
  const result=await deleteAllLocalData(local,session);
  assert.equal(result.ok,true);assert.deepEqual(local.snapshot(),{'unrelated.settings':'keep'});
  const next=createManager(local,{now:()=>100});
  assert.equal(next.active().needsSetup,true);assert.deepEqual(next.active().progress,{});
});

test('removes migrated multi-profile state, all app namespaces, session entry and app cache',async()=>{
  let id=0;const local=storage({'impactlab.v1':JSON.stringify({xp:12}),'impactlab.nick':'First','other.key':'safe'});
  const manager=createManager(local,{now:()=>100,makeId:()=>`p-${++id}`});
  manager.create({nickname:'Second'});manager.saveActiveProgress({xp:800,goals:9});
  local.setItem('kicklab.future.v2','future');local.setItem('impactlab.legacy-extra','old');
  const session=storage({'kicklab.race.home-entry.v1':'/race','impactlab.temp':'x','other.session':'safe'});
  const caches=cache(['kicklab.assets.v1','impactlab.old','other-cache']);
  const result=await deleteAllLocalData(local,session,caches);
  assert.deepEqual(result,{ok:true,removed:{local:5,session:2,caches:2}});
  assert.deepEqual(local.snapshot(),{'other.key':'safe'});assert.deepEqual(session.snapshot(),{'other.session':'safe'});
  assert.deepEqual(await caches.keys(),['other-cache']);
  const restarted=createManager(local,{now:()=>101});
  assert.equal(restarted.list().length,1);assert.equal(restarted.active().needsSetup,true);
  assert.equal(restarted.switchTo('p-1'),null);assert.equal(restarted.switchTo('p-2'),null);
});

test('corrupt current and legacy storage cannot reappear after deletion',async()=>{
  const local=storage({[PROFILE_KEY]:'{broken','impactlab.v1':'{broken','impactlab.nick':'Old','other.key':'keep'});
  assert.equal((await deleteAllLocalData(local,storage())).ok,true);
  const next=createManager(local,{now:()=>100});
  assert.equal(next.active().needsSetup,true);assert.equal(next.active().nickname,'Lab Rookie');
  assert.deepEqual(local.snapshot()['other.key'],'keep');
});

test('cancellation is inert and storage exceptions are reported without clearing unrelated data',async()=>{
  const local=storage({'impactlab.nick':'Keep','other.key':'safe'}),session=storage();
  const before=local.snapshot();
  // The Cancel action never calls deleteAllLocalData.
  assert.deepEqual(local.snapshot(),before);
  const blocked={...local,removeItem(){throw new Error('blocked');}};
  assert.equal((await deleteAllLocalData(blocked,session)).ok,false);
  assert.deepEqual(local.snapshot(),before);
  const unreadable={get length(){throw new Error('denied');}};
  assert.equal((await deleteAllLocalData(unreadable,session)).ok,false);
  assert.deepEqual(local.snapshot(),before);
});
