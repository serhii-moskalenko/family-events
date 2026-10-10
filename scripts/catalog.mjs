import Ajv from 'ajv';
import {resolve,dirname} from 'node:path';
import {readFile,readdir,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {monthId,rating,validateEvent,localDateTime} from '../src/core.js';
const schema=JSON.parse(await readFile(new URL('../content/monthly.schema.json',import.meta.url),'utf8'));
const check=new Ajv({allErrors:true,strict:true}).compile(schema);
export const MAX_BYTES=750000;
export async function readCatalog(path){const text=await readFile(path,'utf8');if(Buffer.byteLength(text)>MAX_BYTES)throw Error('Catalog exceeds 750 KB');return JSON.parse(text);}
export const catalogHash=c=>createHash('sha256').update(JSON.stringify(c,null,2)+'\n').digest('hex');
export function coverageFor(id) {
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(id))throw Error('Invalid catalog month');
 const [year,month]=id.split('-').map(Number);
 return {start:id==='2026-10'?'2026-10-10':`${id}-01`,end:`${id}-${new Date(Date.UTC(year,month,0)).getUTCDate()}`};
}
function wallTime(value) {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return false;
 const date=new Date(value+'Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,16)!==value)return false;
 return [4,5].filter(offset=>localDateTime(new Date(date.getTime()+offset*3600000))===value).length===1;
}
function instant(value,now){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error('Invalid verification/submission timestamp');
 const d=new Date(value.slice(0,10)+'T12:00:00Z');
 if(d.toISOString().slice(0,10)!==value.slice(0,10)||+value.slice(11,13)>23||+value.slice(14,16)>59||+value.slice(17,19)>59||Date.parse(value)>now.valueOf()+300000)throw Error('Invalid or future verification/submission timestamp');
}
function https(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('Unsafe URL');return u;}
const canonical=value=>{const u=https(value);u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))u.searchParams.delete(key);u.searchParams.sort();return u.href.replace(/\/$/,'');};
const normalized=value=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const identity=e=>canonical(e.source)+'|'+normalized(e.name)+'|'+normalized(e.address);
export function validateCatalog(c,filename=c?.catalogId+'.json',{now=new Date(),previous}={}) {
 if(!check(c))throw Error(`Monthly schema: ${new Ajv().errorsText(check.errors)}`);
 if(filename!==c.catalogId+'.json')throw Error('Filename must match catalogId');
 const coverage=coverageFor(c.catalogId);
 if(c.coverage.start!==coverage.start||c.coverage.end!==coverage.end)throw Error('Incorrect monthly coverage');
 if(c.submittedAt)instant(c.submittedAt,now);
 if(c.events.length===0&&!c.emptyReason?.trim())throw Error('Empty catalog requires emptyReason');
 if(previous?.cadence==='monthly'&&(c.catalogId<previous.catalogId||(c.catalogId===previous.catalogId&&c.submittedAt&&Date.parse(c.submittedAt)<Date.parse(previous.publishedAt))))throw Error('Refusing a stale catalog rollback');
 const ids=new Set(),occurrences=new Set(),places=new Set();
 for(const e of c.events){
  validateEvent(e);
  for(const key of ['source','mapsUrl']){const u=https(e[key]);if(key==='mapsUrl'&&!(['www.google.com','google.com','maps.google.com','maps.app.goo.gl'].includes(u.hostname)))throw Error('Google Maps link required');}
  if(e.farm)https(e.farm.source);if(e.registration?.url)https(e.registration.url);
  if(ids.has(e.id))throw Error(`Duplicate ID: ${e.id}`);ids.add(e.id);
  const old=previous?.events?.find(x=>identity(x)===identity(e));if(old&&old.id!==e.id)throw Error('Stable event ID changed: '+old.id);
  if(!/[А-Яа-яІіЇїЄєҐґ]/u.test(e.description))throw Error(`Ukrainian description required: ${e.id}`);
  instant(e.verifiedAt,now);if(c.submittedAt&&Date.parse(e.verifiedAt)>Date.parse(c.submittedAt))throw Error('Verification must precede submission');
  if(c.provenance.producer==='chatgpt-work'&&(e.origin!=='chatgpt-work'||e.automation))throw Error('Work events must carry Work provenance without automation');
  const days=new Set();
  for(const s of e.sessions){
   if(!wallTime(s.start)||(s.end!==null&&!wallTime(s.end)))throw Error('Invalid local date/time or DST gap/fold');
   if(s.start.slice(0,10)<coverage.start||s.start.slice(0,10)>coverage.end||(s.end!==null&&s.end.slice(0,10)>coverage.end))throw Error('Session outside monthly coverage');
   if(s.end&&Date.parse(s.end+'Z')-Date.parse(s.start+'Z')>2*86400000)throw Error('Invalid event duration');
   if(days.has(s.start.slice(0,10)))throw Error('Duplicate session date; use separate IDs for distinct same-day events');days.add(s.start.slice(0,10));
   const occurrence=canonical(e.source)+'|'+s.start,place=normalized(e.name)+'|'+normalized(e.address)+'|'+s.start;
   if(occurrences.has(occurrence)||places.has(place))throw Error('Duplicate occurrence: '+e.id);occurrences.add(occurrence);places.add(place);
  }
  if((e.familyPrice===null||e.admissionPrice===null||e.city===null||e.additionalCosts===null||e.sessions.some(s=>s.end===null)||e.registration===null)&&!e.uncertaintyNotes.length)throw Error('Missing information requires uncertainty notes');
 }
 return c;
}
export function generateCatalog(c,now=new Date(),previous) {
 validateCatalog(c,c.catalogId+'.json',{now,previous});
 return {schemaVersion:2,catalogId:c.catalogId,cadence:'monthly',publishedAt:c.submittedAt||now.toISOString(),timezone:c.timezone,coverage:c.coverage,provenance:c.provenance,discoveryEnabled:false,aiApiConnected:false,issues:c.issues||[],...(c.emptyReason?{emptyReason:c.emptyReason}:{}),events:c.events.map(e=>({...e,sessions:[...e.sessions].sort((a,b)=>a.start.localeCompare(b.start)),rating:rating(e)}))};
}
export async function publishCatalog(c,output,now=new Date()) {
 const previous=await readCatalog(output).catch(error=>{if(error.code==='ENOENT')return undefined;throw error;});
 const generated=generateCatalog(c,now,previous);
 await mkdir(dirname(output),{recursive:true});
 const temp=output+'.'+randomUUID()+'.tmp';
 try{await writeFile(temp,JSON.stringify(generated,null,2)+'\n',{flag:'wx'});await rename(temp,output);}finally{await unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}return generated;
}
export async function buildMonthly(directory='content/monthly',output='public/data/events.json',now=new Date()) {
 const files=(await readdir(directory)).filter(f=>f.endsWith('.json')).sort();
 const catalogs=[];
 for(const file of files)catalogs.push(validateCatalog(await readCatalog(`${directory}/${file}`),file,{now}));
 const eligible=catalogs.filter(c=>c.catalogId<=monthId(now));
 if(!eligible.length)throw Error('No current or previous monthly catalog; preserving published output');
 if(process.argv.includes('--validate'))return catalogs;
 return publishCatalog(eligible.at(-1),resolve(output),now);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const result=await buildMonthly();console.log(Array.isArray(result)?`Validated ${result.length} monthly catalogs`:`Generated ${result.catalogId}: ${result.events.length} events`);}catch(error){console.error('Catalog rejected: '+error.message);process.exitCode=1;}
}
