import {readFile,writeFile,rename,unlink,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {rating,weights,validateEvent,localDateTime} from '../src/core.js';

export const MAX_BYTES=750000;
const categories=new Set(['festival','farm','church','market','culture','library']);
const icons=new Set(['🎃','🌽','⛪','✳','🌾','🎭','📚','🎨','🎪','🛍️','🌳','🎵','🧺']);
const fail=message=>{throw new Error(message);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function text(value,label,max=8000){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(`Invalid ${label}`);}
export function date(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)fail('Invalid calendar date');
 return value;
}
export const addDays=(value,n)=>new Date(Date.parse(date(value)+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
function instant(value,label){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||Number.isNaN(Date.parse(value)))fail(`Invalid ${label}; use UTC ISO timestamp`);date(value.slice(0,10));if(+value.slice(11,13)>23||+value.slice(14,16)>59||+value.slice(17,19)>59)fail(`Invalid ${label}`);}
function local(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))fail('Use New York local YYYY-MM-DDTHH:mm');
 date(value.slice(0,10));if(+value.slice(11,13)>23||+value.slice(14,16)>59)fail('Invalid local time');
 // Both offsets must be considered: spring gaps have no instant; fall folds have two.
 const matches=['-04:00','-05:00'].filter(offset=>localDateTime(new Date(value+offset))===value);
 if(matches.length!==1)fail('Nonexistent or ambiguous New York DST time; do not invent a time');
}
function url(value,label){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error();}catch{fail(`Invalid HTTPS ${label}`);}}
const canonical=value=>{const u=new URL(value);u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);u.searchParams.sort();return u.href.replace(/\/$/,'');};
const normalized=value=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');

export function validateCatalog(data,{now=new Date(),fresh=false,previous}={}){
 if(!object(data)||data.schemaVersion!==2||data.cadence!=='weekly'||data.timezone!=='America/New_York')fail('Expected schemaVersion 2, weekly, America/New_York');
 date(data.rangeStart);date(data.rangeEnd);
 if(data.rangeEnd!==addDays(data.rangeStart,6)||data.catalogId!==`week-${data.rangeStart}`)fail('Catalog must cover exactly seven days with catalogId week-YYYY-MM-DD');
 instant(data.publishedAt,'publishedAt');if(Date.parse(data.publishedAt)>now.valueOf()+300000)fail('Publication timestamp is in the future');
 if(fresh){const today=localDateTime(now).slice(0,10);if(data.rangeEnd<today||data.rangeStart>addDays(today,7))fail('Publication window must be current or the upcoming week');if(now-Date.parse(data.publishedAt)>86400000)fail('New submission is more than 24 hours old');}
 if(previous?.cadence==='weekly'&&(data.rangeStart<previous.rangeStart||(data.rangeStart===previous.rangeStart&&Date.parse(data.publishedAt)<Date.parse(previous.publishedAt))))fail('Refusing a stale catalog rollback');
 if(!Array.isArray(data.events)||data.events.length>250)fail('Expected at most 250 events');
 if(data.events.length===0)text(data.emptyReason,'emptyReason',2000);
 if(!Array.isArray(data.issues)||data.issues.length>250||data.issues.some(i=>!object(i)||typeof i.reason!=='string'||!i.reason.trim()))fail('Invalid issues');
 const ids=new Set(),occurrences=new Set(),places=new Set();
 for(const e of data.events){
  if(!object(e))fail('Invalid event');validateEvent(e);if(e.id.length>120||!Array.isArray(e.sessions))fail('Invalid event ID or sessions');
  for(const key of ['name','venue','address','distanceLabel','priceNote','description','comfortNote','verification'])text(e[key],key,key==='description'?8000:2000);
  if(!categories.has(e.category)||!icons.has(e.icon))fail('Invalid category or icon');
  if(!object(e.points)||Object.keys(e.points).length!==4||Object.keys(e.points).some(k=>!Object.hasOwn(weights,k)))fail('Exactly four rating components required; cost is excluded');
  if(e.rating!==undefined&&e.rating!==rating(e))fail('Rating must equal Math.round(sum / 75 * 100)');
  url(e.source,'official source');if(e.farm){text(e.farm.name,'farm name');url(e.farm.source,'farm source');}
  instant(e.verifiedAt,'verifiedAt');if(Date.parse(e.verifiedAt)>Date.parse(data.publishedAt)||Date.parse(e.verifiedAt)>now.valueOf()+300000)fail('Verification must precede publication');
  if(ids.has(e.id))fail(`Duplicate event ID: ${e.id}`);ids.add(e.id);
  if(e.sessions.length>14)fail('Too many event sessions');
  for(const s of e.sessions){
   local(s.start);if(s.end!==null){local(s.end);if(s.end<=s.start||Date.parse(s.end+'Z')-Date.parse(s.start+'Z')>2*86400000)fail('Invalid event duration');}
   if(s.start.slice(0,10)<data.rangeStart||s.start.slice(0,10)>data.rangeEnd)fail('Event starts outside the seven-day catalog');
   const occurrence=canonical(e.source)+'|'+s.start,place=normalized(e.name)+'|'+normalized(e.address)+'|'+s.start;
   if(occurrences.has(occurrence)||places.has(place))fail(`Duplicate occurrence: ${e.id}`);occurrences.add(occurrence);places.add(place);
  }
  for(const key of ['ratingNote','sourceExcerpt','ratingMethod'])if(e[key]!==undefined)text(e[key],key);
 }
 return data;
}
export function normalizeCatalog(data,options){
 validateCatalog(data,options);
 // Keep only display fields; never publish arbitrary submitted metadata or credentials.
 const keys=['id','name','category','icon','venue','address','distanceLabel','familyPrice','priceNote','description','comfortNote','source','sessions','points','verifiedAt','verification','farm','ratingNote','sourceExcerpt','ratingMethod'];
 return {schemaVersion:2,catalogId:data.catalogId,cadence:'weekly',rangeStart:data.rangeStart,rangeEnd:data.rangeEnd,publishedAt:data.publishedAt,timezone:'America/New_York',discoveryEnabled:false,aiApiConnected:false,publishingMode:'external-weekly-catalog',...(data.emptyReason?{emptyReason:data.emptyReason}:{}),events:data.events.map(e=>({...Object.fromEntries(keys.filter(k=>e[k]!==undefined).map(k=>[k,e[k]])),points:Object.fromEntries(Object.keys(weights).map(k=>[k,e.points[k]])),...(e.farm?{farm:{name:e.farm.name,source:e.farm.source}}:{}),sessions:[...e.sessions].sort((a,b)=>a.start.localeCompare(b.start)).map(s=>({start:s.start,end:s.end})),rating:rating(e)})),issues:data.issues.map(i=>({...(typeof i.id==='string'?{id:i.id}:{}),reason:i.reason}))};
}
export async function readCatalog(path){const content=await readFile(path,'utf8');if(Buffer.byteLength(content)>MAX_BYTES)fail('Catalog exceeds 750 KB');return JSON.parse(content);}
export const catalogHash=data=>createHash('sha256').update(JSON.stringify(data,null,2)+'\n').digest('hex');
export async function ingestCatalog(input,output,options={}){
 const previous=await readCatalog(output).catch(error=>{if(error.code==='ENOENT')return undefined;throw error;});
 const data=normalizeCatalog(await readCatalog(input),{...options,previous});
 const temporary=output+'.'+randomUUID()+'.tmp';await mkdir(dirname(output),{recursive:true});
 try{await writeFile(temporary,JSON.stringify(data,null,2)+'\n',{flag:'wx'});await rename(temporary,output);}finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
 return data;
}
