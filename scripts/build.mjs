import {rm,mkdir,cp,copyFile,readFile} from 'node:fs/promises';
import {validateEvent} from '../src/core.js';
import {validateCatalog} from './catalog.mjs';
const data=JSON.parse(await readFile('public/data/events.json','utf8'));data.events.forEach(validateEvent);
if(data.cadence==='weekly')validateCatalog(data);
await rm('dist',{recursive:true,force:true});await mkdir('dist');await cp('public','dist',{recursive:true});await cp('src','dist/src',{recursive:true});await copyFile('index.html','dist/index.html');await copyFile('style.css','dist/style.css');
