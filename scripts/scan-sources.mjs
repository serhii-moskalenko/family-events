import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {load} from 'cheerio';
// Candidate URLs only: no inference of dates, prices, locality or admission rules.
export function extractCandidates(html,source){
 const $=load(html),base=new URL(source.url),allowed=new Set([base.hostname,...source.allowedLinkedHosts]);
 $('script,style,noscript').remove();
 const found=new Map();
 $('a[href]').each((_,el)=>{try{
  const url=new URL($(el).attr('href'),base);url.hash='';
  if(url.protocol!=='https:'||!allowed.has(url.hostname)||url.href===base.href)return;
  if(!source.linkPatterns.some(pattern=>(url.pathname+url.search).toLowerCase().includes(pattern.toLowerCase())))return;
  const title=$(el).text().replace(/\s+/g,' ').trim().slice(0,180);
  if(title)found.set(url.href,{title,url:url.href,status:'requires-editorial-review'});
 }catch{}});
 return [...found.values()].slice(0,100);
}
export async function scanSources(registry,fetcher=fetch,now=new Date()){
 const sources=[];
 for(const source of registry.sources){
  try{
   const response=await fetcher(source.url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'FamilyEvents/1.0 (+https://github.com/serhii-moskalenko/family-events)'}});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const candidates=extractCandidates(await response.text(),source);
   sources.push({id:source.id,name:source.name,url:source.url,status:'fetched',reviewStatus:source.reviewStatus,candidates});
  }catch(error){sources.push({id:source.id,name:source.name,url:source.url,status:'unavailable',reason:error.message,candidates:[]});}
 }
 return {schemaVersion:1,scannedAt:now.toISOString(),autoPublishCandidates:false,aiApiConnected:false,notes:registry.notes,sources};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const registry=JSON.parse(await readFile('config/source-registry.json','utf8'));
 const report=await scanSources(registry);await mkdir('reports',{recursive:true});
 await writeFile('reports/source-scan.json',JSON.stringify(report,null,2)+'\n');
 const fetched=report.sources.filter(s=>s.status==='fetched').length,candidates=report.sources.reduce((n,s)=>n+s.candidates.length,0);
 console.log(`${fetched}/${report.sources.length} source pages fetched; ${candidates} candidate links. Editorial review required; no automatic publication.`);
 for(const s of report.sources.filter(s=>s.status==='unavailable'))console.warn(`${s.id}: ${s.reason}`);
 if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`\n## Source scan\n${fetched}/${report.sources.length} pages fetched; ${candidates} candidate links in the source-scan artifact. Candidates are not verified events and are not automatically published.\n`,{flag:'a'});
}
