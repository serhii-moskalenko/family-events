export const weights = {children:30,cost:25,comfort:20,distance:15,uniqueness:10};
export const labels = {children:'Цікавість дітям',cost:'Вартість',comfort:'Комфорт сім’ї',distance:'Відстань',uniqueness:'Унікальність'};
export function rating(e) { return Object.keys(weights).reduce((n,k)=>n+e.points[k],0); }
export function weekId(now = new Date()) {
 const day = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const d=new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7)); return d.toISOString().slice(0,10);
}
export function readState(storage,week) {
 try {const data=JSON.parse(storage.getItem('family-events:v1')); return data?.week===week && data.selections && typeof data.selections==='object' ? data : {week,selections:{}};} catch {return {week,selections:{}};}
}
export function saveState(storage,state) {try {storage.setItem('family-events:v1',JSON.stringify(state));return true;}catch{return false;}}
export function visibleEvents(events,selections,tab,category,sort) {
 return events.filter(e=>(selections[e.id]?.status||'all')===tab && (category==='all'||e.category===category)).sort((a,b)=>sort==='price'?(a.familyPrice??Infinity)-(b.familyPrice??Infinity):sort==='date'?a.sessions[0].start.localeCompare(b.sessions[0].start):rating(b)-rating(a));
}
const escapeICS=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function foldLine(line) {let result='',bytes=0;for(const c of line){const size=new TextEncoder().encode(c).length;if(bytes+size>75){result+='\r\n ';bytes=1;}result+=c;bytes+=size;}return result;}
export function calendar(e,session,now=new Date()) {
 if(!e.sessions.some(s=>s.start===session.start&&s.end===session.end))throw new Error('Invalid session');
 const compact=s=>s.replace(/[-:]/g,'')+'00';
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Family Events//UK','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VTIMEZONE','TZID:America/New_York','BEGIN:DAYLIGHT','DTSTART:20070311T020000','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU','TZOFFSETFROM:-0500','TZOFFSETTO:-0400','TZNAME:EDT','END:DAYLIGHT','BEGIN:STANDARD','DTSTART:20071104T020000','RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU','TZOFFSETFROM:-0400','TZOFFSETTO:-0500','TZNAME:EST','END:STANDARD','END:VTIMEZONE','BEGIN:VEVENT',`UID:${e.id}-${compact(session.start)}@family-events.github.io`,`DTSTAMP:${now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;TZID=America/New_York:${compact(session.start)}`,`DTEND;TZID=America/New_York:${compact(session.end)}`,`SUMMARY:${escapeICS(e.name)}`,`LOCATION:${escapeICS(e.address)}`,`DESCRIPTION:${escapeICS(e.description+'\n'+e.source)}`,`URL:${e.source}`,'END:VEVENT','END:VCALENDAR'].map(foldLine).join('\r\n')+'\r\n';
}
export function validateEvent(e) {
 if(!/^[a-z0-9-]+$/.test(e.id)||!e.name||!e.address||!/^https:\/\//.test(e.source)||!e.sessions?.length)throw Error('Invalid event');
 for(const [k,max] of Object.entries(weights))if(!Number.isFinite(e.points?.[k])||e.points[k]<0||e.points[k]>max)throw Error('Invalid rating');
 for(const s of e.sessions)if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.start)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.end)||s.end<=s.start||Number.isNaN(Date.parse(s.start)))throw Error('Invalid dates');
 if(e.familyPrice!==null&&(!Number.isFinite(e.familyPrice)||e.familyPrice<0))throw Error('Invalid price');
 return e;
}
