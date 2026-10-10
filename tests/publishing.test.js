import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateCatalog,generateCatalog,publishCatalog,catalogHash,coverageFor} from '../scripts/catalog.mjs';
import {publishMonthly} from '../scripts/publish-monthly.mjs';
import {verifyLive} from '../scripts/verify-live.mjs';
const file='tests/fixtures/monthly-input.json';
const fixture=JSON.parse(await readFile(file,'utf8')),copy=()=>structuredClone(fixture),now=new Date('2026-10-10T20:00:00Z');
const remote=c=>({sha:'lease',content:Buffer.from(JSON.stringify(c,null,2)+'\n').toString('base64')});
test('current authoritative October input validates without pinning future research contents',async()=>{const c=validateCatalog(JSON.parse(await readFile('content/monthly/2026-10.json','utf8')));assert.equal(c.coverage.end,'2026-10-31');});
test('logical event ID cannot change during a same-month correction or new month',()=>{
 const previous=generateCatalog(copy(),now),c=copy();c.events[0].id='changed';assert.throws(()=>validateCatalog(c,c.catalogId+'.json',{now,previous}),/Stable event ID/);
 c.catalogId='2026-11';c.coverage=coverageFor(c.catalogId);c.events=c.events.map(e=>({...e,sessions:[{start:'2026-11-10T10:00',end:null}]}));assert.throws(()=>validateCatalog(c,c.catalogId+'.json',{now,previous}),/Stable event ID/);
});
test('same source and named venue duplicates and repeated available dates are rejected',()=>{
 for(const source of [fixture.events[0].source+'?utm_source=copy','https://other.test/event']){const c=copy();c.events.push({...structuredClone(c.events[0]),id:'another',source});assert.throws(()=>validateCatalog(c),/Duplicate/);}
 const c=copy();c.events[0].sessions.push({start:'2026-10-10T16:00',end:null});assert.throws(()=>validateCatalog(c),/Duplicate session date/);
});
test('invalid actual verification dates, future times, unsafe farm URLs and registration URLs are rejected',()=>{
 for(const change of [e=>e.verifiedAt='2026-02-30T10:00:00Z',e=>e.verifiedAt='2099-10-10T10:00:00Z',e=>e.verifiedAt='2026-10-10T24:00:00Z',e=>e.icon='<img src=x onerror=alert(1)>',e=>e.farm={name:'Test',source:'https://secret:token@test.org/event'},e=>e.registration={required:true,url:'http://test.org/register',note:null}]){const c=copy();change(c.events[0]);assert.throws(()=>validateCatalog(c));}
 const c=copy();c.events[0].verifiedAt='2026-10-10T10:00:00Z';assert.throws(()=>validateCatalog(c),/precede/);
});
test('unknown registration stays null; structured registration renders separately from admission text',()=>{const c=copy();c.events[0].registration={required:true,url:'https://organizer.test/register',note:'Перевірені умови'};assert.doesNotThrow(()=>validateCatalog(c));assert.deepEqual(generateCatalog(c,now).events[0].registration,c.events[0].registration);});
test('empty catalog needs a research explanation and quarantined issues survive generation',()=>{const c=copy();c.events=[];assert.throws(()=>validateCatalog(c),/emptyReason/);c.emptyReason='Після перевірки офіційних джерел не знайдено підтверджених подій.';c.issues=[{id:'missing-time',reason:'Час не підтверджено.'}];assert.deepEqual(generateCatalog(c,now).issues,c.issues);});
test('atomic publication rejects older months/timestamps and preserves exact bytes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-monthly-'));
 try{const output=join(dir,'events.json');await publishCatalog(copy(),output,now);const original=await readFile(output,'utf8');const c=copy();c.submittedAt='2026-10-10T08:00:00Z';await assert.rejects(publishCatalog(c,output,now),/rollback/);assert.equal(await readFile(output,'utf8'),original);
 const nov=copy();nov.catalogId='2026-11';nov.coverage=coverageFor(nov.catalogId);nov.events=nov.events.map(e=>({...e,sessions:[{start:'2026-11-10T10:00',end:null}]}));await publishCatalog(nov,output,now);await assert.rejects(publishCatalog(copy(),output,now),/rollback/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('submittedAt makes build bytes/hash reproducible without pretending to reverify sources',()=>{const c=copy();const a=generateCatalog(c,now),b=generateCatalog(c,new Date('2026-11-01T12:00:00Z'));assert.equal(catalogHash(a),catalogHash(b));assert.equal(a.events[0].verifiedAt,c.events[0].verifiedAt);assert.equal(a.publishedAt,c.submittedAt);});
test('local publisher fixes repository/path/main, supplies SHA lease, dry run never contacts GitHub',async()=>{
 const calls=[];const call=(args,body)=>{calls.push({args,body});return calls.length===1?remote(generateCatalog(copy(),now)):calls.length===2?[{path:'content/monthly/2026-10.json'}]:calls.length===3?remote({}):{commit:{sha:'abc',html_url:'https://github.com/serhii-moskalenko/family-events/commit/abc'}};};
 const r=await publishMonthly(file,{now,call});assert.equal(r.deploymentVerified,false);assert.equal(calls[3].body.sha,'lease');assert.equal(calls[3].body.branch,'main');assert.match(calls[3].args.join(' '),/content\/monthly\/2026-10.json/);assert.ok(calls.every(c=>c.args.some(a=>a.includes('repos/serhii-moskalenko/family-events/'))));assert.ok(!JSON.stringify(calls).includes('Authorization'));
 assert.equal((await publishMonthly(file,{now,dryRun:true,call:()=>assert.fail('Dry run contacted GitHub')})).dryRun,true);
});
test('new month file creation omits SHA and preserves previous-month archive',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-submit-'));
 try{const c=copy();c.catalogId='2026-11';c.coverage=coverageFor(c.catalogId);c.submittedAt='2026-11-01T10:00:00Z';c.events=c.events.map(e=>({...e,sessions:[{start:'2026-11-10T10:00',end:null}]}));const path=join(dir,'nov.json');await writeFile(path,JSON.stringify(c));let count=0;let put;
 await publishMonthly(path,{now:new Date('2026-11-01T12:00:00Z'),call:(args,body)=>{count++;if(count===1)return remote(generateCatalog(copy(),now));if(count===2)return [{path:'content/monthly/2026-10.json'}];put={args,body};return {commit:{sha:'nov',html_url:'https://github.com/serhii-moskalenko/family-events/commit/nov'}};}});assert.ok(!Object.hasOwn(put.body,'sha'));assert.match(put.args.join(' '),/2026-11.json/);assert.equal(count,3);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('publisher refuses a newer pending submission, stale preparation or a future month before write',async()=>{
 const pending=copy();pending.submittedAt='2026-10-10T11:00:00Z';let count=0;await assert.rejects(publishMonthly(file,{now,call:()=>{count++;return count===1?remote(generateCatalog(copy(),now)):count===2?[{path:'content/monthly/2026-10.json'}]:remote(pending);}}),/rollback/);assert.equal(count,3);
 await assert.rejects(publishMonthly(file,{now:new Date('2026-10-12T10:00:00Z'),call:()=>assert.fail('Stale input contacted GitHub')}),/24 hours/);
});
test('identical submission does not create another commit or claim verified live publication',async()=>{let count=0;const r=await publishMonthly(file,{now,call:()=>{count++;return count===1?remote(generateCatalog(copy(),now)):count===2?[{path:'content/monthly/2026-10.json'}]:remote(copy());}});assert.equal(count,3);assert.equal(r.unchanged,true);assert.equal(r.deploymentVerified,false);});
test('live verification requires exact generated bytes and a reachable application',async()=>{
 const c=generateCatalog(copy(),now),body=JSON.stringify(c,null,2)+'\n';const good=async url=>({ok:true,text:async()=>url.includes('events.json')?body:'<script src="./src/app.js"></script>'});assert.equal((await verifyLive(catalogHash(c),{fetcher:good,attempts:1})).catalogId,c.catalogId);
 await assert.rejects(verifyLive(catalogHash(c),{attempts:1,fetcher:async()=>({ok:true,text:async()=>JSON.stringify({...c,catalogId:'old'})})}),/does not match/);
});
