import Ajv from 'ajv';
import {resolve,dirname} from 'node:path';
import {readFile,readdir,writeFile,rename,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {monthId,rating,validateEvent} from '../src/core.js';
const schema=JSON.parse(await readFile(new URL('../content/monthly.schema.json',import.meta.url),'utf8'));
const check=new Ajv({allErrors:true,strict:true}).compile(schema);
export function coverageFor(id) {
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(id))throw Error('Invalid catalog month');
 const [year,month]=id.split('-').map(Number);
 return {start:id==='2026-10'?'2026-10-10':`${id}-01`,end:`${id}-${new Date(Date.UTC(year,month,0)).getUTCDate()}`};
}
function wallTime(value) {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return false;
 const date=new Date(value+'Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,16)!==value)return false;
 // Round-trip all possible NY offsets: rejects nonexistent spring DST times.
 return [4,5].some(offset=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(date.getTime()+offset*3600000)).replace(' ','T')===value);
}
export function validateCatalog(c,filename=c.catalogId+'.json') {
 if(!check(c))throw Error(`Monthly schema: ${new Ajv().errorsText(check.errors)}`);
 if(filename!==c.catalogId+'.json')throw Error('Filename must match catalogId');
 const coverage=coverageFor(c.catalogId);
 if(JSON.stringify(c.coverage)!==JSON.stringify(coverage)) {
  if(c.coverage.start!==coverage.start||c.coverage.end!==coverage.end)throw Error('Incorrect monthly coverage');
 }
 const ids=new Set();
 for(const e of c.events){
  validateEvent(e);
  if(ids.has(e.id))throw Error(`Duplicate ID: ${e.id}`);ids.add(e.id);
  if(!/[А-Яа-яІіЇїЄєҐґ]/u.test(e.description))throw Error(`Ukrainian description required: ${e.id}`);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(e.verifiedAt)||!Number.isFinite(Date.parse(e.verifiedAt)))throw Error('Invalid verification timestamp');
  if(c.provenance.producer==='chatgpt-work'&&(e.origin!=='chatgpt-work'||e.automation))throw Error('Work events must carry Work provenance without automation');
  const starts=new Set();
  for(const s of e.sessions){
   if(!wallTime(s.start)||(s.end!==null&&!wallTime(s.end)))throw Error('Invalid local date/time or DST gap');
   if(s.start.slice(0,10)<coverage.start||s.start.slice(0,10)>coverage.end||(s.end!==null&&s.end.slice(0,10)>coverage.end))throw Error('Session outside monthly coverage');
   if(starts.has(s.start))throw Error('Duplicate session');starts.add(s.start);
  }
  if((e.familyPrice===null||e.admissionPrice===null||e.city===null||e.additionalCosts===null||e.sessions.some(s=>s.end===null))&&!e.uncertaintyNotes.length)throw Error('Missing information requires uncertainty notes');
 }
 return c;
}
export function generateCatalog(c,now=new Date()) {
 validateCatalog(c);
 return {schemaVersion:2,catalogId:c.catalogId,cadence:'monthly',publishedAt:now.toISOString(),timezone:c.timezone,coverage:c.coverage,provenance:c.provenance,discoveryEnabled:false,aiApiConnected:false,issues:[],events:c.events.map(e=>({...e,rating:rating(e)}))};
}
export async function publishCatalog(c,output,now=new Date()) {
 const generated=generateCatalog(c,now); // Validate completely before touching the current output.
 await mkdir(dirname(output),{recursive:true});
 const temp=output+'.tmp';await writeFile(temp,JSON.stringify(generated,null,2)+'\n');await rename(temp,output);return generated;
}
export async function buildMonthly(directory='content/monthly',output='public/data/events.json',now=new Date()) {
 const files=(await readdir(directory)).filter(f=>f.endsWith('.json')).sort();
 const catalogs=[];
 for(const file of files)catalogs.push(validateCatalog(JSON.parse(await readFile(`${directory}/${file}`,'utf8')),file));
 // Future catalogs may be staged, but never replace the active month's publication.
 const eligible=catalogs.filter(c=>c.catalogId<=monthId(now));
 if(!eligible.length)throw Error('No current or previous monthly catalog; preserving published output');
 if(process.argv.includes('--validate'))return catalogs;
 return publishCatalog(eligible.at(-1),resolve(output),now);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await buildMonthly();console.log(Array.isArray(result)?`Validated ${result.length} monthly catalogs`:`Generated ${result.catalogId}: ${result.events.length} events`);
}
