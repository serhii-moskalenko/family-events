import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {load} from 'cheerio';
import {monthId,localDateTime,validateEvent,sessionExpiry} from '../src/core.js';
import {pathToFileURL} from 'node:url';
import {discover,mergeCatalog} from './discover.mjs';
export function sourceText(html,includeMetadata=false) {const $=load(html);const metadata=includeMetadata?$('meta[name=description]').attr('content')||'':'';$('script,style,noscript').remove();return ($('body').text()+' '+metadata).replace(/\s+/g,' ').trim();}
export function verify(text,evidence) {
 if(/\b(cancelled|canceled|postponed|closed due to|sold out)\b|скасовано/i.test(text))throw Error('Cancellation / closure / sold-out notice requires review');
 for(const fragment of evidence)if(!text.toLowerCase().includes(fragment.replace(/\s+/g,' ').toLowerCase()))throw Error(`Changed or missing evidence: ${fragment}`);
}
export async function refresh(config,now=new Date(),fetcher=fetch) {
 const events=[],issues=[],cache=new Map(),period=monthId(now);
 const current=localDateTime(now);
 for(const entry of config.events){
  try {
   validateEvent(entry);
   const sessions=entry.sessions.filter(s=>sessionExpiry(s)>current && s.start.slice(0,7)===period);
   if(!sessions.length)continue;
   for(const check of entry.checks){
    if(!cache.has(check.url+'|'+Boolean(check.includeMetadata)))cache.set(check.url+'|'+Boolean(check.includeMetadata),(async()=>{const res=await fetcher(check.url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'FamilyEvents/1.0 (+https://github.com/serhii-moskalenko/family-events)'}});if(!res.ok)throw Error(`HTTP ${res.status}`);return sourceText(await res.text(),check.includeMetadata);})());
    verify(await cache.get(check.url+'|'+Boolean(check.includeMetadata)),check.evidence);
   }
   const {checks,...e}=entry;events.push({...e,sessions,verifiedAt:now.toISOString(),verification:'Official page evidence matched; no cancellation notice detected on configured pages.'});
  } catch(error){issues.push({id:entry.id,reason:error.message});}
 }
 return {schemaVersion:2,catalogId:period,cadence:'monthly',publishedAt:now.toISOString(),timezone:config.timezone,discoveryEnabled:false,review:config.review||null,events,issues};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const config=JSON.parse(await readFile('config/sources.json','utf8'));
 let result=await refresh(config);
 const discoveryConfig=JSON.parse(await readFile('config/discovery.json','utf8'));
 if(discoveryConfig.enabled){
  const discovered=await discover(discoveryConfig);
  await mkdir('reports',{recursive:true});
  await writeFile('reports/discovery.json',JSON.stringify(discovered.report,null,2)+'\n');
  if(discovered.report.sources.every(s=>s.status==='unavailable'))throw Error('All automatic sources unavailable; keeping previous deployment');
  result=mergeCatalog(result,discovered,config);
  await mkdir('public/data',{recursive:true});
  await writeFile('public/data/discovery-report.json',JSON.stringify(discovered.report,null,2)+'\n');
  console.log(`Automatic import: ${discovered.events.length} events from ${discovered.report.sources.length} configured sources`);
 }
 await mkdir('public/data',{recursive:true});
 await writeFile('public/data/events.json',JSON.stringify(result,null,2)+'\n');
 console.log(`Month ${result.catalogId}: ${result.events.length} verified events, ${result.issues.length} quarantined`);
 for(const issue of result.issues)console.warn(`::warning::${issue.id}: ${issue.reason}`);
 if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`## Source verification\n${result.events.length} published; ${result.issues.length} quarantined.\n\n${result.issues.map(i=>`- ${i.id}: ${i.reason}`).join('\n')}\n\nAutomatic import: ${result.automaticEventCount||0} events from configured parsers. See discovery-report.json for exclusions and source failures.\n`,{flag:'a'});
}
