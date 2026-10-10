import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseChurch,parseStructured,englishDate,timeRange,extractEventLinks,familyEligibility,geocode,milesBetween,discover,mergeCatalog,automaticPoints,farmForEvent} from '../scripts/discover.mjs';
import {calendar,validateEvent} from '../src/core.js';
const config=JSON.parse(await readFile('config/discovery.json','utf8'));
const fixtures=Object.fromEntries(await Promise.all(['church','canton','multi-day','hickory'].map(async n=>[n,await readFile(`tests/fixtures/discovery/${n}.html`,'utf8')])));

test('real Church Center markup supplies dated occurrences, mapped address and meal price',()=>{
 const e=parseChurch(fixtures.church,'https://fbcwoodstock.churchcenter.com/registrations/events/3926581');
 assert.deepEqual(e.sessions,[{start:'2026-10-14T16:30',end:'2026-10-14T18:30'}]);assert.equal(e.familyPrice,20);assert.match(e.address,/11905 Highway 92/);
 assert.throws(()=>parseChurch(fixtures.church.replace('Upcoming Dates','Past Dates'),e.source));
 const changed=parseChurch(fixtures.church.replace('meals are $5.00','meals are $7.00'),e.source);assert.equal(changed.familyPrice,28);
});
test('Canton uses the event address, never tourism-office JSON-LD, and explicit daily festival hours',()=>{
 const single=parseStructured(fixtures.canton,'https://explorecantonga.com/events/books-boos-fall-festival/','canton-jsonld');assert.match(single.address,/225 Reformation/);assert.equal(single.familyPrice,null);
 const multi=parseStructured(fixtures['multi-day'],'https://explorecantonga.com/events/3rd-annual-jack-o-lantern-jamboree/','canton-jsonld');assert.deepEqual(multi.sessions,[{start:'2026-10-24T12:00',end:'2026-10-24T20:00'},{start:'2026-10-25T12:00',end:'2026-10-25T19:00'}]);assert.equal(multi.familyPrice,0);
 assert.throws(()=>parseStructured(fixtures['multi-day'].replace(/Saturday, Oct 24.+?<\/div>/,'</div>'),multi.source,'canton-jsonld'));
});
test('Wix structured events parse; cancellation and free-food ambiguity fail safely',()=>{
 const e=parseStructured(fixtures.hickory,'https://www.hickoryflat.church/events/trunk-or-treat-5','event-jsonld');assert.equal(e.familyPrice,null);assert.equal(e.sessions[0].start,'2026-10-28T17:30');
 assert.throws(()=>parseStructured(fixtures.hickory.replace('EventScheduled','EventCancelled'),e.source,'event-jsonld'));
 assert.throws(()=>parseChurch(fixtures.church.replace('</body>','<p>This event has been cancelled</p></body>'),e.source));
});
test('dates require a year; time ranges reject ambiguous clocks and stale DST labels',()=>{
 assert.throws(()=>englishDate('October 10'));assert.throws(()=>englishDate('February 30, 2026'));
 assert.deepEqual(timeRange('12:15–1:30pm EDT','2026-10-25'),{start:'2026-10-25T12:15',end:'2026-10-25T13:30'});
 assert.throws(()=>timeRange('11–1pm EDT','2026-10-25'));assert.throws(()=>timeRange('6pm EDT','2026-11-10'));
});
test('discovery follows only configured event paths on the trusted host',()=>{
 const source=config.sources[0];assert.deepEqual(extractEventLinks('<a href="https://evil.test/events/fake/">Evil</a><a href="/events/family-day/">Family</a><a href="https://facebook.com/share?u=https%3A%2F%2Fexplorecantonga.com%2Fevents%2Ffamily-day%2F">Share</a>',source),['https://explorecantonga.com/events/family-day/']);
 assert.equal(familyEligibility({name:'Volunteer Registration',description:'Family games'},config.familyRules),false);
 assert.equal(familyEligibility({name:'Family Party',description:'Adults only, 21+'},config.familyRules),false);
});
test('Census geocoding verifies street number, Georgia and ZIP; radius is measured',async()=>{
 const response={result:{addressMatches:[{coordinates:{y:34.0882,x:-84.4884},addressComponents:{state:'GA',zip:'30188'},matchedAddress:'11905 STATE HWY 92, WOODSTOCK, GA, 30188'}]}};
 const fake=async()=>({ok:true,json:async()=>response});const geo=await geocode('11905 Highway 92, Woodstock, GA 30188',config.geocoder,fake);assert.ok(milesBetween(config.center,geo)<20);
 await assert.rejects(geocode('11906 Highway 92, Woodstock, GA 30188',config.geocoder,fake));await assert.rejects(geocode('No public street address',config.geocoder,fake));
});
test('a new November URL becomes a published card without a curated record, with stable identity and usable ICS',async()=>{
 const source=config.sources.find(s=>s.id==='woodstock-first-baptist-events'),newUrl='https://fbcwoodstock.churchcenter.com/registrations/events/9999999';
 const html=fixtures.church.replaceAll('October 14, 2026','November 11, 2026').replaceAll('Oct 14, 2026','Nov 11, 2026').replaceAll('EDT','EST');
 const fake=async url=>url===source.url?{ok:true,text:async()=>'<a href="'+newUrl+'">New dinner</a>'}:url===newUrl?{ok:true,text:async()=>html}:{ok:true,json:async()=>({result:{addressMatches:[{coordinates:{y:34.0882,x:-84.4884},addressComponents:{state:'GA',zip:'30188'},matchedAddress:'11905 STATE HWY 92, WOODSTOCK, GA, 30188'}]}})};
 const imported=await discover({...config,sources:[source]},new Date('2026-11-01T12:00:00Z'),fake);assert.equal(imported.events.length,1);
 const catalog=mergeCatalog({catalogId:'2026-11',events:[],issues:[]},imported,{events:[]});assert.equal(catalog.discoveryEnabled,true);assert.equal(catalog.events.length,1);const e=catalog.events[0];validateEvent(e);assert.equal(e.familyPrice,20);assert.match(calendar(e,e.sessions[0]),/DTSTART;TZID=America\/New_York:20261111T163000/);
 const repeat=await discover({...config,sources:[source]},new Date('2026-11-01T12:00:00Z'),fake);assert.equal(repeat.events[0].id,e.id);
 assert.equal((await discover({...config,sources:[source]},new Date('2026-12-01T12:00:00Z'),fake)).events.length,0);
});
test('merge prevents duplicate cards, updates stale facts and blocks canceled curated events',()=>{
 const old={id:'existing',source:'https://example.org/events/family/',name:'Old name',familyPrice:0};
 const fresh={...old,id:'auto-hash',familyPrice:20};const base={events:[old],issues:[]};const report={sources:[],items:[]};
 const merged=mergeCatalog(base,{events:[fresh],report},{events:[old]});assert.equal(merged.events.length,1);assert.equal(merged.events[0].id,'existing');assert.equal(merged.events[0].familyPrice,20);
 const canceled=mergeCatalog(base,{events:[],report:{...report,items:[{url:old.source,status:'quarantined',code:'cancelled'}]}},{events:[old]});assert.equal(canceled.events.length,0);
});
test('source failures, foreign redirects and excessive link lists never become fabricated events',async()=>{
 const cfg={...config,sources:[config.sources[0]]};const failed=await discover(cfg,new Date('2026-10-09'),async()=>({ok:false,status:503}));assert.equal(failed.events.length,0);assert.equal(failed.report.sources[0].status,'unavailable');
 const redirected=await discover(cfg,new Date('2026-10-09'),async()=>({status:302,headers:{get:()=> 'https://evil.test/events'}}));assert.equal(redirected.events.length,0);
});

test('unresolved addresses only use the explicit reviewed venue allowlist',async()=>{
 const missing=async()=>({ok:true,json:async()=>({result:{addressMatches:[]}})});
 const venue=await geocode('1 Mission Point Canton, Georgia 30114',config.geocoder,missing);assert.equal(venue.area,'Canton');assert.equal(venue.lat,undefined);
 await assert.rejects(geocode('2 Mission Point, Canton, GA 30114',config.geocoder,missing));
});
test('ambiguous prices are unknown and nonlocal postal codes are excluded before geocoding',async()=>{
 const source=config.sources.find(s=>s.id==='woodstock-first-baptist-events'),url='https://fbcwoodstock.churchcenter.com/registrations/events/1234567';let geocoderCalled=false;
 const html=fixtures.church.replace('meals are $5.00','meals are not priced').replaceAll('30188','30060');assert.equal(parseChurch(html,url).familyPrice,null);
 const fake=async u=>{if(u===source.url)return {ok:true,text:async()=>`<a href="${url}">Dinner</a>`};if(u===url)return {ok:true,text:async()=>html};geocoderCalled=true;throw Error('Should not geocode');};
 const result=await discover({...config,sources:[source]},new Date('2026-10-09'),fake);assert.equal(result.events.length,0);assert.equal(result.report.items[0].status,'outside-area');assert.equal(geocoderCalled,false);
});

test('listing page limits and measured radius prevent uncontrolled crawling or distant publication',async()=>{
 const source=config.sources.find(s=>s.id==='woodstock-first-baptist-events');
 const list='<a href="/registrations/events/1111">One</a><a href="/registrations/events/2222">Two</a>';
 const limited=await discover({...config,sources:[source],maxPagesPerSource:1},new Date('2026-10-09'),async()=>({ok:true,text:async()=>list}));assert.equal(limited.report.sources[0].status,'unavailable');assert.match(limited.report.sources[0].reason,/page limit/);
 const url='https://fbcwoodstock.churchcenter.com/registrations/events/1111';
 const far=await discover({...config,sources:[source]},new Date('2026-10-09'),async u=>u===source.url?{ok:true,text:async()=>'<a href="'+url+'">Dinner</a>'}:u===url?{ok:true,text:async()=>fixtures.church}:{ok:true,json:async()=>({result:{addressMatches:[{coordinates:{y:35,x:-84.4884},addressComponents:{state:'GA',zip:'30188'},matchedAddress:'11905 STATE HWY 92, WOODSTOCK, GA, 30188'}]}})});
 assert.equal(far.events.length,0);assert.equal(far.report.items[0].status,'outside-radius');
});

test('automatic suitability scores and eligibility do not depend on admission price',()=>{
 const base={name:'Family Festival',description:'Kids crafts, games, petting zoo and trunk or treat'};
 const expected={children:30,comfort:8,distance:12,uniqueness:8};
 for(const familyPrice of [null,0,20,100,1000]){
  const event={...base,familyPrice};assert.equal(familyEligibility(event,config.familyRules),true);
  assert.deepEqual(automaticPoints(event,8,config.familyRules),expected);
 }
 assert.equal(familyEligibility({name:'Private Dinner',description:'Adults only',familyPrice:0},config.familyRules),false);
});
test('automatic farm provenance uses reviewed addresses and survives only matching verified merges',()=>{
 const farm=config.localFarms[0];
 assert.deepEqual(farmForEvent({address:farm.address},config.localFarms),{name:farm.name,source:farm.source});
 assert.equal(farmForEvent({name:'Farm pumpkin festival',address:'11905 Highway 92, Woodstock, GA 30188'},config.localFarms),null);
 const old={id:'existing-farm',source:'https://example.org/events/visit',address:farm.address,farm:{name:farm.name,source:farm.source}};
 const parsed={...old,id:'automatic'};delete parsed.farm;
 const report={sources:[],items:[]};
 const merged=mergeCatalog({events:[old],issues:[]},{events:[parsed],report},{events:[old]});assert.deepEqual(merged.events[0].farm,old.farm);
 const moved=mergeCatalog({events:[old],issues:[]},{events:[{...parsed,address:'11905 Highway 92, Woodstock, GA 30188'}],report},{events:[old]});assert.equal(moved.events[0].farm,undefined);
});
