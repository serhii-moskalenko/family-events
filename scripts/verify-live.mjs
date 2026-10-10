import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateCatalog} from './catalog.mjs';
const SITE='https://serhii-moskalenko.github.io/family-events/';
export async function verifyLive(expectedHash,{attempts=12,fetcher=fetch,delay=5000}={}){
 if(!/^[a-f0-9]{64}$/.test(expectedHash))throw Error('Expected SHA256 hash required');
 let error;
 for(let i=0;i<attempts;i++){
  try{
   const response=await fetcher(`${SITE}data/events.json?sha256=${expectedHash}&attempt=${i}`,{cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error(`Catalog HTTP ${response.status}`);
   const body=await response.text(),hash=createHash('sha256').update(body).digest('hex');
   if(hash!==expectedHash)throw Error('Live catalog does not match the submitted catalog yet');
   const data=validateCatalog(JSON.parse(body));
   const html=await fetcher(SITE,{signal:AbortSignal.timeout(20000)});if(!html.ok||!(await html.text()).includes('src/app.js'))throw Error('Live application HTML unavailable');
   console.log(`Live deployment verified: ${data.catalogId}, ${data.events.length} events, SHA256 ${hash}`);return data;
  }catch(e){error=e;if(i<attempts-1)await new Promise(resolve=>setTimeout(resolve,delay));}
 }
 throw error;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{await verifyLive(process.argv[2]);}catch(error){console.error(error.message);process.exitCode=1;}}
