import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/shared/profile-avatar-art.js');
await import('../src/shared/profile-store.js');

const {createManager,PROFILE_KEY,PROFILE_PENDING_KEY}=globalThis.KickLabProfiles;
function storage(seed={}){
  const data=new Map(Object.entries(seed));
  let failure=null;
  return {
    getItem(key){if(failure?.kind==='read'&&key===failure.key)throw new Error('denied');return data.get(key)??null;},
    setItem(key,value){
      if(failure&&key===failure.key){
        if(failure.kind==='throw')throw new Error('QuotaExceededError');
        if(failure.kind==='partial'){data.set(key,'{broken');throw new Error('interrupted');}
        if(failure.kind==='corrupt'){data.set(key,'{broken');return;}
      }
      data.set(key,String(value));
    },
    removeItem(key){if(failure?.kind==='remove'&&key===failure.key)throw new Error('denied');data.delete(key);},
    fail(kind,key=PROFILE_KEY){failure={kind,key};},
    recover(){failure=null;},
    value(key){return data.get(key)??null;}
  };
}
function seeded(){return storage({[PROFILE_KEY]:JSON.stringify({version:1,activeId:'first',legacyProfileId:'first',profiles:[{id:'first',nickname:'First',avatar:'rocket',color:'sky',progress:{xp:90}}]})});}

test('denied and quota profile writes keep the prior player active and reload truthful',()=>{
  for(const key of [PROFILE_PENDING_KEY,PROFILE_KEY]){
    const device=seeded(),manager=createManager(device,{now:()=>100,makeId:()=> 'new-player'});
    device.fail('throw',key);
    assert.throws(()=>manager.create({nickname:'Unsaved'}),/profile_storage_unavailable/);
    assert.equal(manager.active().nickname,'First');assert.equal(manager.list().length,1);
    const reloaded=createManager(device,{now:()=>101});
    assert.equal(reloaded.active().nickname,'First');assert.equal(reloaded.list().length,1);
  }
});

test('partial and corrupt primary writes restore the previous envelope after reload',()=>{
  for(const kind of ['partial','corrupt']){
    const device=seeded(),manager=createManager(device,{now:()=>100,makeId:()=> 'new-player'});
    device.fail(kind);
    assert.throws(()=>manager.create({nickname:'Unsaved'}),/profile_storage_unavailable/);
    assert.equal(manager.active().nickname,'First');
    assert.ok(device.value(PROFILE_PENDING_KEY));
    const reloaded=createManager(device,{now:()=>101});
    assert.equal(reloaded.active().nickname,'First');assert.equal(reloaded.list().length,1);
    device.recover();
    const recovered=createManager(device,{now:()=>102,makeId:()=> 'new-player'});
    assert.equal(recovered.active().nickname,'First');
    recovered.create({nickname:'Saved'});
    assert.equal(createManager(device,{now:()=>103}).active().nickname,'Saved');
    assert.equal(device.value(PROFILE_PENDING_KEY),null);
  }
});

test('failed journal cleanup cannot turn an unconfirmed save into a durable profile',()=>{
  const device=seeded(),manager=createManager(device,{now:()=>100,makeId:()=> 'new-player'});
  device.fail('remove',PROFILE_PENDING_KEY);
  assert.throws(()=>manager.create({nickname:'Unconfirmed'}),/profile_storage_unavailable/);
  assert.equal(manager.active().nickname,'First');
  assert.equal(createManager(device,{now:()=>101}).active().nickname,'First');
  device.recover();
  const recovered=createManager(device,{now:()=>102,makeId:()=> 'new-player'});
  recovered.create({nickname:'Confirmed'});
  assert.equal(createManager(device,{now:()=>103}).active().nickname,'Confirmed');
});

test('failed readback and failed switch preserve existing profile isolation until retry',()=>{
  const device=seeded(),manager=createManager(device,{now:()=>100,makeId:()=> 'second'});
  manager.create({nickname:'Second'});
  device.fail('read',PROFILE_KEY);
  assert.throws(()=>manager.switchTo('first'),/profile_storage_unavailable/);
  assert.equal(manager.active().nickname,'Second');
  device.recover();
  manager.switchTo('first');
  assert.equal(manager.active().nickname,'First');
  assert.deepEqual(manager.active().progress,{xp:90});
});

test('failed edit leaves durable nickname unchanged and a recovered retry clears stale failure',()=>{
  const device=seeded(),manager=createManager(device,{now:()=>100});
  device.fail('throw',PROFILE_KEY);
  assert.throws(()=>manager.updateActive({nickname:'Not Saved'}),/profile_storage_unavailable/);
  assert.equal(manager.active().nickname,'First');
  device.recover();
  manager.updateActive({nickname:'Saved Now'});
  assert.equal(createManager(device,{now:()=>101}).active().nickname,'Saved Now');
  assert.equal(device.value('impactlab.nick'),'Saved Now');
});
