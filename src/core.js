export const weights = {children:30,comfort:20,distance:15,uniqueness:10};
export const labels = {children:'Цікавість дітям',comfort:'Комфорт сім’ї',distance:'Відстань',uniqueness:'Унікальність'};
export function rating(e) { return Math.round(Object.keys(weights).reduce((n,k)=>n+e.points[k],0)/Object.values(weights).reduce((n,max)=>n+max,0)*100); }
export function localDateTime(now = new Date()) {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const get=k=>parts.find(p=>p.type===k).value;
 return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export const monthId=(now=new Date())=>localDateTime(now).slice(0,7);
export function readState(storage,period) {
 try {const data=JSON.parse(storage.getItem('family-events:v1')); const savedPeriod=data?.period||data?.week?.slice(0,7); return savedPeriod===period && data.selections && typeof data.selections==='object' ? {period,selections:data.selections} : {period,selections:{}};} catch {return {period,selections:{}};}
}
export const sessionExpiry=s=>s.end||s.start.slice(0,10)+'T23:59';
export function upcomingEvents(events,now=new Date()) {
 const current=localDateTime(now);
 return events.map(e=>({...e,sessions:e.sessions.filter(s=>sessionExpiry(s)>current)})).filter(e=>e.sessions.length);
}
export function saveState(storage,state) {try {storage.setItem('family-events:v1',JSON.stringify(state));return true;}catch{return false;}}
export function visibleEvents(events,selections,tab,category,sort,farmsOnly=false) {
 return events.filter(e=>(selections[e.id]?.status||'all')===tab && (category==='all'||e.category===category) && (!farmsOnly||Boolean(e.farm))).sort((a,b)=>sort==='price'?(a.familyPrice??Infinity)-(b.familyPrice??Infinity):sort==='date'?a.sessions[0].start.localeCompare(b.sessions[0].start):rating(b)-rating(a));
}
const escapeICS=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function foldLine(line) {let result='',bytes=0;for(const c of line){const size=new TextEncoder().encode(c).length;if(bytes+size>75){result+='\r\n ';bytes=1;}result+=c;bytes+=size;}return result;}
export function calendar(e,session,now=new Date()) {
 if(!e.sessions.some(s=>s.start===session.start&&s.end===session.end))throw new Error('Invalid session');
 const compact=s=>s.replace(/[-:]/g,'')+'00';
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Family Events//UK','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VTIMEZONE','TZID:America/New_York','BEGIN:DAYLIGHT','DTSTART:20070311T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU','TZOFFSETFROM:-0500','TZOFFSETTO:-0400','TZNAME:EDT','END:DAYLIGHT','BEGIN:STANDARD','DTSTART:20071104T020000','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU','TZOFFSETFROM:-0400','TZOFFSETTO:-0500','TZNAME:EST','END:STANDARD','END:VTIMEZONE','BEGIN:VEVENT',`UID:${e.id}-${compact(session.start)}@family-events.github.io`,`DTSTAMP:${now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;TZID=America/New_York:${compact(session.start)}`,...(session.end?[`DTEND;TZID=America/New_York:${compact(session.end)}`]:[]),`SUMMARY:${escapeICS(e.name)}`,`LOCATION:${escapeICS(e.address)}`,`DESCRIPTION:${escapeICS([e.description,e.priceNote,e.comfortNote,...(session.end?[]:['Час завершення не опубліковано.']),e.source].filter(Boolean).join('\n'))}`,`URL:${e.source}`,'END:VEVENT','END:VCALENDAR'].map(foldLine).join('\r\n')+'\r\n';
}
export function validateEvent(e) {
 if(!/^[a-z0-9-]+$/.test(e.id)||!e.name||!e.address||!/^https:\/\//.test(e.source)||!e.sessions?.length)throw Error('Invalid event');
 if(e.farm&&(!e.farm.name||!/^https:\/\//.test(e.farm.source)))throw Error('Invalid farm provenance');
 for(const [k,max] of Object.entries(weights))if(!Number.isFinite(e.points?.[k])||e.points[k]<0||e.points[k]>max)throw Error('Invalid rating');
 for(const s of e.sessions)if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.start)||(s.end!==null&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.end)||s.end<=s.start))||Number.isNaN(Date.parse(s.start)))throw Error('Invalid dates');
 if(e.familyPrice!==null&&(!Number.isFinite(e.familyPrice)||e.familyPrice<0))throw Error('Invalid price');
 return e;
}

export function validatePublishedCatalog(d) {
 if(d?.schemaVersion!==2||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(d.catalogId)||d.timezone!=='America/New_York'||!Number.isFinite(Date.parse(d.publishedAt))||!Array.isArray(d.events)||!Array.isArray(d.issues))throw Error('Invalid published catalog');
 const ids=new Set();for(const e of d.events){validateEvent(e);for(const key of ['name','description','category','icon','venue','address','distanceLabel','priceNote','comfortNote'])if(typeof e[key]!=='string'||!e[key])throw Error('Missing display field');if(!Number.isFinite(Date.parse(e.verifiedAt)))throw Error('Invalid verification timestamp');if(e.mapsUrl&&!/^https:\/\//.test(e.mapsUrl))throw Error('Invalid maps URL');if(ids.has(e.id))throw Error('Duplicate event ID');ids.add(e.id);}return d;
}
