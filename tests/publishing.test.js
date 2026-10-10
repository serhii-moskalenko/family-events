import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateCatalog,normalizeCatalog,ingestCatalog,catalogHash} from '../scripts/catalog.mjs';
import {publishWeekly} from '../scripts/publish-weekly.mjs';
import {verifyLive} from '../scripts/verify-live.mjs';
import {readState,rating} from '../src/core.js';
const fixture=JSON.parse(await readFile('tests/fixtures/weekly-catalog.json','utf8'));
const copy=()=>structuredClone(fixture),now=new Date('2026-10-10T10:00:00Z');
test('weekly catalog uses exactly seven local dates, including across months and DST',()=>{
 assert.equal(validateCatalog(copy(),{now}).catalogId,'week-2026-10-09');
 const c=copy();c.rangeStart='2026-10-29';c.rangeEnd='2026-11-04';c.catalogId='week-2026-10-29';c.events=[{...c.events[0],sessions:[{start:'2026-11-01T10:00',end:'2026-11-01T11:00'}]}];assert.doesNotThrow(()=>validateCatalog(c,{now}));
 for(const update of [{timezone:'UTC'},{rangeEnd:'2026-10-16'},{catalogId:'2026-10'},{rangeStart:'2026-02-30'}])assert.throws(()=>validateCatalog({...copy(),...update},{now}));
});
test('incoming scores are bounded, normalized and exclude cost independently of price',()=>{
 for(const price of [null,0,1000]){const c=copy();c.events[0].familyPrice=price;assert.equal(normalizeCatalog(c,{now}).events[0].rating,85);}
 for(const update of [{children:31},{comfort:-1},{distance:16},{uniqueness:11},{children:null},{cost:25}]){const c=copy();Object.assign(c.events[0].points,update);assert.throws(()=>validateCatalog(c,{now}));}
 const c=copy();c.events[0].rating=99;assert.throws(()=>validateCatalog(c,{now}),/Rating/);
});
test('invalid dates, DST gaps/folds, windows, prices and unsafe icons or URLs fail closed',()=>{
 for(const start of ['2026-10-32T10:00','2026-10-10T24:00','2026-10-10T10:60','2026-10-10T10:00Z','2026-10-20T10:00']){const c=copy();c.events[0].sessions=[{start,end:null}];assert.throws(()=>validateCatalog(c,{now}));}
 for(const [rangeStart,rangeEnd,start] of [['2026-03-08','2026-03-14','2026-03-08T02:30'],['2026-11-01','2026-11-07','2026-11-01T01:30']]){const c=copy();Object.assign(c,{rangeStart,rangeEnd,catalogId:`week-${rangeStart}`});c.events=[{...c.events[0],sessions:[{start,end:null}]}];assert.throws(()=>validateCatalog(c,{now}),/DST/);}
 for(const update of [{familyPrice:-1},{familyPrice:'free'},{source:'javascript:alert(1)'},{source:'https://secret:token@organizer.test/event'},{icon:'<img src=x onerror=alert(1)>'},{category:'unknown'},{verifiedAt:'2099-10-10T12:00:00Z'}]){const c=copy();Object.assign(c.events[0],update);assert.throws(()=>validateCatalog(c,{now}));}
});
test('duplicate IDs, same source occurrence and same named venue occurrence are rejected',()=>{
 for(const update of [{},{id:'second'},{id:'second',source:fixture.events[0].source+'?utm_source=duplicate'},{id:'second',source:'https://other.test/event'}]){const c=copy();c.events.push({...structuredClone(c.events[0]),...update});assert.throws(()=>validateCatalog(c,{now}),/Duplicate/);}
 const c=copy();c.events[0].sessions.push(structuredClone(c.events[0].sessions[0]));assert.throws(()=>validateCatalog(c,{now}),/Duplicate/);
});
test('unknown price/end remain null, empty catalog needs an explicit reason, arbitrary metadata is dropped',()=>{
 const c=copy();c.events[0].familyPrice=null;c.events[0].sessions[0].end=null;c.token='should-not-publish';c.events[0].token='should-not-publish';const output=normalizeCatalog(c,{now});assert.equal(output.events[0].familyPrice,null);assert.equal(output.events[0].sessions[0].end,null);assert.ok(!JSON.stringify(output).includes('should-not-publish'));
 c.events=[];assert.throws(()=>normalizeCatalog(c,{now}),/emptyReason/);c.emptyReason='No eligible events found after reviewing the configured official sources.';assert.equal(normalizeCatalog(c,{now}).events.length,0);
});
test('atomic ingestion rejects bad JSON, stale updates and invalid events without changing the valid catalog',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-weekly-'));
 try{const input=join(dir,'incoming.json'),output=join(dir,'events.json');const original=JSON.stringify(normalizeCatalog(copy(),{now}),null,2)+'\n';await writeFile(output,original);
  for(const value of ['{',JSON.stringify({...copy(),timezone:'UTC'}),JSON.stringify({...copy(),publishedAt:'2026-10-08T00:00:00Z'})]){await writeFile(input,value);await assert.rejects(ingestCatalog(input,output,{now}));assert.equal(await readFile(output,'utf8'),original);}
  const valid=copy();valid.publishedAt='2026-10-10T09:00:00Z';await writeFile(input,JSON.stringify(valid));assert.equal((await ingestCatalog(input,output,{now})).events.length,2);assert.equal(JSON.parse(await readFile(output,'utf8')).publishedAt,valid.publishedAt);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('selections survive corrections within a week and reset on another published week in the same month',()=>{
 const state={period:'week-2026-10-12',selections:{a:{status:'added'},b:{status:'rejected'}}},storage={getItem:()=>JSON.stringify(state)};
 assert.deepEqual(readState(storage,state.period),state);assert.deepEqual(readState(storage,'week-2026-10-19').selections,{});assert.deepEqual(readState({getItem:()=>JSON.stringify({...state,period:'2026-10'})},state.period).selections,{});
});
test('publisher fixes repository/path/main, supplies a blob lease and never sends credentials',async()=>{
 const calls=[];const c=copy(),file='tests/fixtures/weekly-catalog.json';
 const call=(args,body)=>{calls.push({args,body});if(calls.length===1)return {content:Buffer.from(JSON.stringify(c)).toString('base64')};if(calls.length===2)return {sha:'blob-lease',content:Buffer.from('{}').toString('base64')};return {commit:{sha:'abc',html_url:'https://github.com/serhii-moskalenko/family-events/commit/abc'}};};
 const result=await publishWeekly(file,{call,now});assert.equal(result.deploymentVerified,false);assert.equal(calls[2].body.sha,'blob-lease');assert.equal(calls[2].body.branch,'main');assert.ok(calls.every(c=>c.args.some(a=>a.includes('repos/serhii-moskalenko/family-events/'))));assert.match(calls[2].args.join(' '),/incoming\/weekly-catalog.json/);assert.ok(!JSON.stringify(calls).includes('Authorization'));
 const dry=await publishWeekly(file,{dryRun:true,now,call:()=>assert.fail('Dry run contacted GitHub')});assert.equal(dry.dryRun,true);
});
test('publisher rejects invalid inputs and stale periods before a remote write',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'family-submit-'));
 try{const input=join(dir,'bad.json');await writeFile(input,JSON.stringify({...copy(),timezone:'UTC'}));await assert.rejects(publishWeekly(input,{now,call:()=>assert.fail('Invalid data contacted GitHub')}));
 const previous={...copy(),rangeStart:'2026-10-12',rangeEnd:'2026-10-18',catalogId:'week-2026-10-12'};await writeFile(input,JSON.stringify(copy()));let calls=0;await assert.rejects(publishWeekly(input,{now,call:()=>{calls++;return {content:Buffer.from(JSON.stringify(previous)).toString('base64')};}}),/rollback/);assert.equal(calls,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('live verification checks exact bytes rather than accepting any JSON or successful HTTP',async()=>{
 const c=normalizeCatalog(copy(),{now}),body=JSON.stringify(c,null,2)+'\n';
 const good=async url=>({ok:true,text:async()=>url.includes('events.json')?body:'<script src="./src/app.js"></script>'});assert.equal((await verifyLive(catalogHash(c),{fetcher:good,attempts:1})).catalogId,c.catalogId);
 const bad=async()=>({ok:true,text:async()=>JSON.stringify({...c,catalogId:'old'})});await assert.rejects(verifyLive(catalogHash(c),{fetcher:bad,attempts:1}),/does not match/);
});
test('workflow never invokes discovery and tests candidate before any Pages deployment',async()=>{
 const workflow=await readFile('.github/workflows/pages.yml','utf8');assert.ok(!/^\s*schedule:/m.test(workflow));assert.ok(!workflow.includes('npm run refresh'));assert.ok(!workflow.includes('npm run scan'));assert.ok(workflow.indexOf('catalog:ingest')<workflow.indexOf('npm test'));assert.ok(workflow.indexOf('npm run test:e2e')<workflow.indexOf('actions/upload-pages-artifact'));assert.match(workflow,/needs: build/);assert.match(workflow,/needs: \[build, deploy\]/);
});
