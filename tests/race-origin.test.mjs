import test from 'node:test';
import assert from 'node:assert/strict';
import {local,pages,raceContext} from './helpers/race-origin.mjs';

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
