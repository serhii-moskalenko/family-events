import {pathToFileURL} from 'node:url';
import {ingestCatalog,readCatalog,validateCatalog} from './catalog.mjs';

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [mode,input='incoming/weekly-catalog.json',output='public/data/events.json']=process.argv.slice(2);
  const data=mode==='--check'?validateCatalog(await readCatalog(input)):mode==='--publish'?await ingestCatalog(input,output):null;
  if(!data)throw Error('Usage: node scripts/ingest.mjs --check INPUT | --publish INPUT [OUTPUT]');
  console.log(`Valid ${data.catalogId}: ${data.events.length} events (${data.rangeStart}–${data.rangeEnd})`);
 }catch(error){console.error(`Catalog rejected: ${error.message}`);process.exitCode=1;}
}
