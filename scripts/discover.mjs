import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {localDateTime,monthId,sessionExpiry,validateEvent} from '../src/core.js';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
export const canonical=url=>{const u=new URL(url);u.hash='';u.search='';return u.href.replace(/\/$/,'');};
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
export function englishDate(text,year){
 const m=clean(text).match(/^(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i);
 if(!m)fail('dates','Unrecognized dated occurrence');
 const month=months.findIndex(s=>s===m[1].toLowerCase()||s.slice(0,3)===m[1].toLowerCase());
 const y=m[3]||year;if(month<0||!y)fail('dates','Explicit year required');
 const value=`${y}-${String(month+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`;
 if(new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)fail('dates','Invalid date');return value;
}
function clock(text,meridiem){
 const m=clean(text).match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
 if(!m||!(m[3]||meridiem)||+m[1]<1||+m[1]>12||+(m[2]||0)>59)fail('dates','Ambiguous time');
 const h=+m[1]%12+((m[3]||meridiem).toLowerCase()==='pm'?12:0);
 return `${String(h).padStart(2,'0')}:${m[2]||'00'}`;
}
export function timeRange(text,date){
 const zone=clean(text).match(/\b(EDT|EST)\b/)?.[1];
 const body=clean(text).replace(/\s*(EDT|EST)\s*/g,'').replace(/[–—]/g,'-');
 const pair=body.split('-');if(pair.length>2)fail('dates','Ambiguous time range');
 const trailing=pair.at(-1).match(/(am|pm)$/i)?.[1];
 const start=date+'T'+clock(pair[0],trailing),end=pair.length===2?date+'T'+clock(pair[1],trailing):null;
 if(end&&end<=start)fail('dates','Ambiguous or overnight time range');
 if(zone&&localDateTime(new Date(start+(zone==='EDT'?'-04:00':'-05:00')))!==start)fail('dates','Timezone label conflicts with New York date');
 return {start,end};
}
function iso(value){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(value||''))fail('dates','Explicit timed ISO date with timezone required');
 const d=new Date(value);if(Number.isNaN(d.valueOf())||new Date(value.slice(0,10)+'T12:00:00Z').toISOString().slice(0,10)!==value.slice(0,10))fail('dates','Invalid ISO date');return localDateTime(d);
}
function cancellation(text,status=''){
 if(/EventCancelled|EventPostponed|EventMovedOnline/i.test(status)||/\b(cancelled|canceled|postponed|sold out|closed due to)\b/i.test(text))fail('cancelled','Cancellation, closure or sold-out notice');
}
function htmlText(html){const $=load(html);$('script,style,noscript').remove();return clean($('body').text());}
function price(text,event={}){
 // Only admission-specific statements count. Free food, volunteer positions and vendor fees do not.
 if(event.isAccessibleForFree===true||/\bfree (?:admission|entry|event for (?:the )?community)|\bfree to attend(?: for all ages)?|\badmission (?:is )?free\b/i.test(text)||/free community[- ]wide (?:fall )?festival/i.test(text))return {familyPrice:0,priceNote:'Організатор підтверджує безкоштовний вхід. Покупки та додаткові послуги окремо.'};
 const meal=text.match(/All Cafe meals are \$(\d+(?:\.\d{1,2})?)/i);
 const rate=meal||text.match(/(?:general admission|admission|tickets?)\s*(?:is|:|costs?|are)?\s*\$(\d+(?:\.\d{1,2})?)\s*(?:per person|each)/i);
 if(rate){const n=+rate[1];return {familyPrice:Math.round(n*400)/100,priceNote:meal?`Розрахунок за 4 страви Café по $${n}. Інші варіанти меню, добавки й доступність замовлення перевірте в організатора.`:`Розрахунок за 4 стандартні квитки по $${n}; знижки й додаткові збори не підтверджено.`};}
 return {familyPrice:null,priceNote:'Сімейну ціну не підтверджено. Безкоштовні окремі активності або волонтерська реєстрація не означають безкоштовний вхід.'};
}
export function parseChurch(html,url){
 const $=load(html),name=clean($('h1').first().text()),description=clean($('meta[name="description"]').attr('content'));
 cancellation(htmlText(html)+' '+description);
 const heading=$('h2').filter((_,e)=>clean($(e).text())==='Location').first();
 const location=heading.closest('.mb-3').length?heading.closest('.mb-3'):heading.parent();
 const map=location.find('a[href*="maps.google.com"]').first().attr('href');
 if(!name||!map)fail('shape','Missing event heading or mapped address');
 const address=clean(new URL(map).searchParams.get('q'));
 const upcoming=$('h2').filter((_,e)=>clean($(e).text())==='Upcoming Dates').first().parent();
 const sessions=[];upcoming.find('li').each((_,el)=>{
  const times=$(el).find('time').map((_,t)=>clean($(t).text())).get();
  if(times.length===2)sessions.push(timeRange(times[1],englishDate(times[0])));
  else if(times.length===4){const start=timeRange(times[1],englishDate(times[0])).start,end=timeRange(times[3],englishDate(times[2])).start;
   if(start.slice(0,10)!==end.slice(0,10))fail('dates','Continuous multi-day interval needs explicit daily hours');sessions.push({start,end});
  }else fail('dates','Missing exact occurrence times');
 });
 if(!sessions.length)fail('dates','No explicit upcoming occurrences');
 return {name,description,address,venue:clean(location.children('.fs-4').first().text())||name,sessions,source:url,...price(description)};
}
function jsonEvents($){
 const events=[];function walk(v){if(!v||typeof v!=='object')return;if((Array.isArray(v['@type'])?v['@type']:[v['@type']]).some(t=>t==='Event'))events.push(v);if(Array.isArray(v))v.forEach(walk);else if(v['@graph'])walk(v['@graph']);}
 $('script[type="application/ld+json"]').each((_,el)=>{try{walk(JSON.parse($(el).text()));}catch{}});return events;
}
export function parseStructured(html,url,adapter){
 const $=load(html),records=jsonEvents($);
 if(records.length!==1)fail('shape','Expected exactly one structured Event');const e=records[0];
 const description=adapter==='canton-jsonld'?clean($('.detail__summary').text()):clean(e.description||$('meta[name="description"]').attr('content'));
 cancellation(htmlText(html)+' '+description,e.eventStatus);
 if(/OnlineEventAttendanceMode/.test(e.eventAttendanceMode||''))fail('location','Online event excluded');
 let address,venue;
 if(adapter==='canton-jsonld'){
  const parts=$('.detail__address').first().children('span').map((_,el)=>clean($(el).text())).get();
  if(parts.length<3)fail('location','Missing event-specific street address');[venue]=parts;address=parts.slice(1).join(', ');
 }else{venue=e.location?.name||e.name;const a=e.location?.address;address=typeof a==='string'?a:a&&[a.streetAddress,a.addressLocality,a.addressRegion,a.postalCode].filter(Boolean).join(', ');}
 const start=iso(e.startDate),end=e.endDate?iso(e.endDate):null;let sessions=[{start,end}];
 if(end&&end.slice(0,10)!==start.slice(0,10)){
  // A continuous schema interval cannot supply daily visit times. Require explicit dated rows.
  const rows=[...description.matchAll(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2})\s*\|\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[–—-]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi)];
  if(!rows.length)fail('dates','Multi-day event has no explicit daily hours');
  sessions=rows.map(m=>timeRange(m[3]+'-'+m[4],englishDate(m[1]+' '+m[2],start.slice(0,4))));
  if(sessions.some(s=>s.start.slice(0,10)<start.slice(0,10)||s.start.slice(0,10)>end.slice(0,10)))fail('dates','Daily schedule conflicts with schema interval');
 }
 const repeats=$('.detail__dates li').map((_,el)=>clean($(el).text())).get();
 if(repeats.length){if(!end||start.slice(0,10)!==end.slice(0,10))fail('dates','Recurring dates need a same-day time window');
  sessions=[...sessions,...repeats.map(row=>{const date=englishDate(row,start.slice(0,4));if(date<start.slice(0,10))fail('dates','Recurring date needs an explicit new year');return {start:date+'T'+start.slice(11),end:date+'T'+end.slice(11)};})];}
 return {name:clean(e.name),description,venue:clean(venue),address:clean(address),source:url,sessions,...price(description+' '+e.name,e)};
}
export function familyEligibility(event,rules){
 if(new RegExp(rules.exclude,'i').test(event.name))return false;
 return !new RegExp(rules.adultOnly,'i').test(event.name+' '+event.description)&&new RegExp(rules.include,'i').test(event.name+' '+event.description);
}
export function milesBetween(a,b){const rad=n=>n*Math.PI/180,dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon),x=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;return 3958.7613*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
export const normalizeAddress=s=>clean(s).toLowerCase().replace(/\bgeorgia\b/g,'ga').replace(/\bparkway\b/g,'pkwy').replace(/\bhighway\b/g,'hwy').replace(/\bpoint\b/g,'pt').replace(/\b(?:usa|us)\b/g,'').replace(/[^a-z0-9]/g,'');
export async function geocode(address,config,fetcher=fetch){
 if(!/^\d+\s+.+,\s*(?:GA|Georgia)\s+\d{5}(?:,\s*(?:USA|US))?$/i.test(address))fail('location','Full Georgia street address and ZIP required');
 const url=new URL(config.endpoint);url.search=new URLSearchParams({address,benchmark:config.benchmark,format:'json'});
 const r=await fetcher(url.href,{signal:AbortSignal.timeout(20000)});if(!r.ok)fail('geocode',`Geocoder HTTP ${r.status}`);
 const matches=(await r.json()).result?.addressMatches;if(matches?.length!==1){const approved=config.approvedVenues?.find(v=>normalizeAddress(v.address)===normalizeAddress(address));if(approved)return {provider:'Reviewed Canton venue address',area:approved.area,source:approved.source,reviewedAt:approved.reviewedAt};fail('geocode','Address has no unique Census match');}
 const m=matches[0],lat=m.coordinates?.y,lon=m.coordinates?.x;
 if(m.addressComponents?.state!=='GA'||m.addressComponents?.zip!==address.match(/(?:GA|Georgia)\s+(\d{5})\b/i)?.[1]||m.matchedAddress?.match(/^\d+/)?.[0]!==address.match(/^\d+/)?.[0]||!Number.isFinite(lat)||!Number.isFinite(lon))fail('geocode','Geocoder address mismatch');
 return {lat,lon,provider:'US Census Public_AR_Current',matchedAddress:m.matchedAddress};
}
export function farmForEvent(event,farms=[]){const farm=farms.find(f=>normalizeAddress(f.address)===normalizeAddress(event.address));return farm?{name:farm.name,source:farm.source}:null;}
function excerpt(text,include){const relevant=text.split(/(?<=[.!?])\s+/).find(s=>new RegExp(include,'i').test(s))||text;const words=relevant.split(/\s+/);return words.slice(0,24).join(' ')+(words.length>24?'…':'');}
export function automaticPoints(event,miles,rules){
 const signals=rules.activities.filter(pattern=>new RegExp(pattern,'i').test(event.description+' '+event.name)).length;
 return {children:signals>=3?30:signals===2?26:signals===1?22:12,comfort:8,distance:miles===null?0:miles<=5?15:miles<=10?12:miles<=15?9:6,uniqueness:signals>=3?8:signals?6:4};
}
export function extractEventLinks(html,source){
 const $=load(html),base=new URL(source.url),found=new Map();
 for(const href of $('a[href]').map((_,e)=>$(e).attr('href')).get()){
  try{const u=new URL(href,base);const targets=[u];
   // Wix calendar exposes some event URLs through share links, rather than direct links.
   for(const key of ['url','u']){const embedded=u.searchParams.get(key);if(embedded)try{targets.push(new URL(embedded));}catch{}}
   for(const target of targets)if(target.protocol==='https:'&&target.hostname===base.hostname&&!target.username&&!target.password&&!target.port&&new RegExp(source.detailPath).test(target.pathname)){target.hash='';target.search='';found.set(canonical(target.href),target.href);}
  }catch{}
 }
 return [...found.values()];
}
export async function discover(config,now=new Date(),fetcher=fetch){
 const events=[],report={version:1,generatedAt:now.toISOString(),aiUsed:false,period:monthId(now),sources:[],items:[]};const geoCache=new Map(),pageCache=new Map();
 async function page(url,host){
  if(pageCache.has(url))return pageCache.get(url);
  const task=(async()=>{let current=url;for(let i=0;i<4;i++){
   const u=new URL(current);if(u.protocol!=='https:'||u.hostname!==host||u.username||u.password||u.port)fail('fetch','Untrusted source URL or redirect');
   const res=await fetcher(current,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'FamilyEvents/2.0 (+https://github.com/serhii-moskalenko/family-events)'}});
   if([301,302,303,307,308].includes(res.status)){current=new URL(res.headers.get('location'),current).href;continue;}
   if(!res.ok)fail('fetch',`HTTP ${res.status}`);const html=await res.text();if(Buffer.byteLength(html)>2500000)fail('fetch','Source page exceeds limit');return html;
  }fail('fetch','Too many redirects');})();pageCache.set(url,task);return task;
 }
 for(const source of config.sources.filter(s=>s.enabled)){
  const summary={id:source.id,url:source.url,adapter:source.adapter,links:0,published:0,status:'ok'};report.sources.push(summary);
  try{
   const host=new URL(source.url).hostname,list=await page(source.url,host),links=extractEventLinks(list,source);
   if(!links.length)fail('shape','No event links found; listing may have changed');if(links.length>config.maxPagesPerSource)fail('limit','Listing exceeds configured page limit');summary.links=links.length;
   // Small batches bound load on the organizer's site and isolate individual failures.
   for(let offset=0;offset<links.length;offset+=2){const batch=await Promise.allSettled(links.slice(offset,offset+2).map(async url=>{
    const html=await page(url,host);const raw=source.adapter==='churchcenter-html'?parseChurch(html,url):parseStructured(html,url,source.adapter);
    const sessions=[...new Map(raw.sessions.filter(s=>s.start.slice(0,7)===report.period&&sessionExpiry(s)>localDateTime(now)).map(s=>[s.start,s])).values()].sort((a,b)=>a.start.localeCompare(b.start));
    if(!sessions.length)return {url,status:'outside-month'};
    if(new Set(sessions.map(s=>s.start.slice(0,10))).size!==sessions.length)fail('dates','Multiple same-day time slots need distinct occurrence cards');
    if(!familyEligibility(raw,config.familyRules))return {url,status:'excluded-family-rules'};
    if(config.allowedPostalCodes&&!config.allowedPostalCodes.includes(raw.address.match(/(?:GA|Georgia)\s+(\d{5})\b/i)?.[1]))return {url,status:'outside-area'};
    if(!geoCache.has(raw.address))geoCache.set(raw.address,geocode(raw.address,config.geocoder,fetcher));const coordinates=await geoCache.get(raw.address),distance=Number.isFinite(coordinates.lat)?milesBetween(config.center,coordinates):null;
    if(distance!==null&&distance>config.radiusMiles)return {url,status:'outside-radius'};
    const farm=farmForEvent(raw,config.localFarms);
    const category=farm?'farm':source.kind==='church'?'church':/festival|jamboree|trunk.?or.?treat/i.test(raw.name)?'festival':/market/i.test(raw.name)?'market':/farm|nature|pumpkin patch/i.test(raw.name)?'farm':'culture';
    const e={...raw,sessions,...(farm?{farm}:{}),id:'auto-'+createHash('sha256').update(canonical(url)).digest('hex').slice(0,20),category,icon:category==='church'?'⛪':category==='festival'?'🎃':'✳',description:'Автоматично додано з офіційного джерела. Умови участі та програму перевірте за посиланням організатора.',sourceExcerpt:excerpt(raw.description,config.familyRules.include),comfortNote:'Доступність для візочків, туалети, паркування та вікові умови автоматично не підтверджено. Уточніть їх перед поїздкою.',distanceLabel:distance===null?`${coordinates.area} · відстань не виміряно`:`≈ ${distance.toFixed(1)} миль по прямій · маршрут у Maps`,points:automaticPoints(raw,distance,config.familyRules),ratingMethod:'rules-v2-price-independent',ratingNote:'Автоматична оцінка за правилами, не відгуки відвідувачів. Ціна не впливає на рейтинг. Суму балів із 75 перераховано до шкали 0–100; комфорт без перевірених умов — 8/20.',verifiedAt:now.toISOString(),verification:'Parsed current official event page; checked occurrence, address, family rules, cancellation notices and configured locality; Census distance where available.',automation:{sourceId:source.id,adapter:source.adapter,coordinates,distanceMiles:distance===null?null:Math.round(distance*10)/10}};
    validateEvent(e);return {url,status:'published',event:e};
   }));
   for(let i=0;i<batch.length;i++){const result=batch[i],url=links[offset+i];if(result.status==='fulfilled'){const {event,...item}=result.value;report.items.push({sourceId:source.id,...item});if(event){events.push(event);summary.published++;}}
    else report.items.push({sourceId:source.id,url,status:'quarantined',code:result.reason.code||'error',reason:result.reason.message});}
   }
   const items=report.items.filter(i=>i.sourceId===source.id);if(items.length&&items.every(i=>i.status==='quarantined')){summary.status='unavailable';summary.reason='All candidate pages failed parsing or verification';}
  }catch(error){summary.status='unavailable';summary.reason=error.message;}
 }
 return {events,report};
}
export function mergeCatalog(curated,discovery,config){
 const known=new Map(config.events.map(e=>[canonical(e.source),e]));const parsed=new Map(discovery.events.map(e=>[canonical(e.source),e]));
 const blocked=new Set(discovery.report.items.filter(i=>i.status==='quarantined'&&['cancelled','fetch'].includes(i.code)).map(i=>canonical(i.url)));
 const result=curated.events.filter(e=>!parsed.has(canonical(e.source))&&!blocked.has(canonical(e.source)));
 for(const e of discovery.events){const old=known.get(canonical(e.source)),verified=curated.events.find(x=>canonical(x.source)===canonical(e.source));
  result.push({...e,id:old?.id||e.id,...(verified?{name:verified.name,description:verified.description,comfortNote:verified.comfortNote,...(verified.farm&&normalizeAddress(verified.address)===normalizeAddress(e.address)?{farm:verified.farm}: {})}: {})});}
 const replacedIds=new Set(discovery.events.map(e=>known.get(canonical(e.source))?.id));
 const issues=curated.issues.filter(i=>!replacedIds.has(i.id));
 for(const item of discovery.report.items.filter(i=>i.status==='quarantined'&&blocked.has(canonical(i.url)))){const old=known.get(canonical(item.url));if(old&&!issues.some(i=>i.id===old.id))issues.push({id:old.id,reason:item.reason||item.code});}
 for(const source of discovery.report.sources.filter(s=>s.status==='unavailable'))issues.push({id:'source-'+source.id,reason:'Automatic source unavailable: '+source.reason});
 return {...curated,discoveryEnabled:true,aiApiConnected:false,automaticSourceCount:discovery.report.sources.length,automaticEventCount:discovery.events.length,events:result,issues,automation:{mode:'configured-source-parsers',report:'./data/discovery-report.json',...{sources:discovery.report.sources}}};
}
