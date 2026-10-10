import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {monthId} from '../src/core.js';
import {readCatalog,generateCatalog,validateCatalog,catalogHash} from './catalog.mjs';

const REPO='serhii-moskalenko/family-events';
export function gh(args,body){
 const r=spawnSync('gh',args,{input:body===undefined?undefined:JSON.stringify(body),encoding:'utf8',maxBuffer:2000000});
 if(r.error)throw new Error('GitHub CLI is unavailable; install gh and authorize this repository.');
 if(r.status!==0)throw new Error(`GitHub CLI failed (${r.status}): ${r.stderr.trim().slice(0,800)}`);
 return JSON.parse(r.stdout||'null');
}
export async function publishMonthly(input,{dryRun=false,wait=false,call=gh,now=new Date()}={}){
 const incoming=await readCatalog(input);
 if(!incoming.submittedAt||now-Date.parse(incoming.submittedAt)>86400000)throw Error('Publisher requires submittedAt within 24 hours');
 if(incoming.catalogId!==monthId(now))throw Error('Publisher requires current New York month');
 const data=generateCatalog(incoming,now);
 if(dryRun)return {dryRun:true,catalogId:data.catalogId,events:data.events.length,sha256:catalogHash(data)};
 const previousFile=call(['api',`repos/${REPO}/contents/public/data/events.json?ref=main`]);
 const previous=JSON.parse(Buffer.from(previousFile.content,'base64').toString('utf8'));
 generateCatalog(incoming,now,previous);
 const PATH=`content/monthly/${data.catalogId}.json`;
 const listing=call(['api',`repos/${REPO}/contents/content/monthly?ref=main`]);
 if(!Array.isArray(listing))throw Error('Cannot inspect monthly directory');
 const target=listing.some(f=>f.path===PATH)?call(['api',`repos/${REPO}/contents/${PATH}?ref=main`]):{};
 if(target.content){
  let pending;try{pending=JSON.parse(Buffer.from(target.content,'base64').toString('utf8'));validateCatalog(pending,pending.catalogId+'.json',{now});}catch{pending=undefined;}
  if(pending)generateCatalog(incoming,now,{...generateCatalog(pending,now),publishedAt:pending.submittedAt||new Date(0).toISOString()});
 }
 const body={branch:'main',...(target.sha?{sha:target.sha}:{}),message:`Submit monthly catalog ${data.catalogId}`,content:Buffer.from(JSON.stringify(incoming,null,2)+'\n').toString('base64')};
 if(target.content&&Buffer.from(target.content,'base64').toString('utf8')===Buffer.from(body.content,'base64').toString('utf8')){
  const receipt={unchanged:true,catalogId:data.catalogId,sha256:catalogHash(data),deploymentVerified:false};
  if(wait){const {verifyLive}=await import('./verify-live.mjs');await verifyLive(receipt.sha256,{attempts:12});receipt.deploymentVerified=true;}
  return receipt;
 }
 // GitHub checks the current blob SHA. Conflicts fail rather than silently replacing another submission.
 const result=call(['api','--method','PUT',`repos/${REPO}/contents/${PATH}`,'--input','-'],body);
 const receipt={submitted:true,commit:result.commit.sha,url:result.commit.html_url,catalogId:data.catalogId,events:data.events.length,sha256:catalogHash(data),deploymentVerified:false};
 console.log(JSON.stringify(receipt,null,2));
 if(wait){
  const {verifyLive}=await import('./verify-live.mjs');
  const deadline=Date.now()+15*60000;let run;
  while(Date.now()<deadline){
   const runs=call(['api',`repos/${REPO}/actions/workflows/pages.yml/runs?head_sha=${receipt.commit}&event=push`]).workflow_runs;
   run=runs[0];
   if(run?.status==='completed')break;
   console.log(`Waiting for deployment${run?`: ${run.status}`:''}…`);await new Promise(resolve=>setTimeout(resolve,15000));
  }
  if(!run||run.status!=='completed'||run.conclusion!=='success')throw Error(`Catalog submitted but deployment did not succeed${run?`: ${run.html_url} (${run.conclusion||run.status})`:''}`);
  await verifyLive(receipt.sha256,{attempts:12});receipt.deploymentVerified=true;receipt.workflowUrl=run.html_url;
 }
 return receipt;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const args=process.argv.slice(2),input=args.find(a=>!a.startsWith('--'));if(!input||args.some(a=>a.startsWith('--')&&!['--dry-run','--wait'].includes(a)))throw Error('Usage: node scripts/publish-monthly.mjs INPUT [--dry-run] [--wait]');console.log(JSON.stringify(await publishMonthly(input,{dryRun:args.includes('--dry-run'),wait:args.includes('--wait')}),null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
