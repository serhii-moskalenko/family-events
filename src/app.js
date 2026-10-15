import {rating,weights,labels,readState,saveState,visibleEvents,calendar,upcomingEvents,validatePublishedCatalog} from './core.js?v=monthly-v3';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'short',timeZone:'America/New_York'}).format(new Date(s.slice(0,10)+'T12:00:00-04:00'));
const instantDate=s=>new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'short',timeZone:'America/New_York'}).format(new Date(s));
const time=s=>s?s.slice(11,16):'завершення не вказано',full=s=>`${date(s)} · ${time(s)}`,range=s=>s.end?`${time(s.start)}–${time(s.end)}`:`${time(s.start)} · завершення не вказано`;
const iconPaths={
 sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 diamond:'<path d="m12 3 9 9-9 9-9-9Z"/><path d="m9 9 3-3"/>',
 ticket:'<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4Z"/><path d="M15 6v2m0 3v2m0 3v2"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
 warning:'<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v.1"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 external:'<path d="M14 3h7v7m0-7L10 14"/><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>'
};
const icon=name=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[name]||iconPaths.info}</svg>`;
const panel=(symbol,title,content,classes='')=>`<section class="info-panel ${classes}" aria-label="${esc(title)}"><div class="panel-title">${icon(symbol)}<h3>${esc(title)}</h3></div>${content}</section>`;
function eventDetails(e,session){
 const metricIcons={children:'sparkles',comfort:'heart',distance:'pin',uniqueness:'diamond'};
 const scores=`<div class="rating-overview"><div class="breakdown" aria-label="Складові рейтингу">${Object.entries(weights).map(([k,max])=>`<span>${icon(metricIcons[k])}${labels[k]} <b>${e.points[k]}/${max}</b></span>`).join('')}</div>${e.ratingNote?`<div class="rating-explanation"><button type="button" class="text-disclosure" data-disclosure aria-expanded="false" aria-controls="${e.id}-rating-note">${icon('info')}Про оцінку</button><p id="${e.id}-rating-note" hidden>${esc(e.ratingNote)}</p></div>`:''}</div>`;
 const cost=panel('ticket','Вартість',`<p>${esc(e.priceNote)}</p>${e.additionalCosts&&e.additionalCosts!==e.priceNote?`<div class="extra-costs"><h4>Додаткові витрати</h4><p>${esc(e.additionalCosts)}</p></div>`:''}${e.admissionPrice&&e.admissionPrice!==e.priceNote?`<div class="price-conditions"><button type="button" class="text-disclosure" data-disclosure aria-expanded="false" aria-controls="${e.id}-admission">Умови входу</button><p id="${e.id}-admission" hidden>${esc(e.admissionPrice)}</p></div>`:''}`,'price-panel');
 const comfort=panel('info','Умови відвідування',`<p>${esc(e.comfortNote)}</p>`,e.registration?'':'span-wide');
 const registration=e.registration?panel(e.registration.required===true?'warning':e.registration.required===false?'check':'info','Реєстрація',`<p class="registration-status">${e.registration.required===true?'Реєстрація: потрібна':e.registration.required===false?'Реєстрація: не потрібна':'Реєстрація: вимоги не підтверджено'}</p>${e.registration.note?`<p>${esc(e.registration.note)}</p>`:''}${e.registration.url?`<a class="inline-link" href="${esc(e.registration.url)}" target="_blank" rel="noopener noreferrer">Сторінка реєстрації ↗</a>`:''}`,e.registration.required?'caution':''):'';
 const cautions=e.uncertaintyNotes?.length?panel('warning','Перед поїздкою',`<ul>${e.uncertaintyNotes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul>`,'caution span-wide'):'';
 const provenance=e.automation?`<p class="import-note">${icon('info')}↻ Автоматично імпортовано з офіційного джерела</p>`:'';
 const excerpt=e.sourceExcerpt?`<p class="source-excerpt">Короткий опис організатора (мовою джерела): <span lang="en">${esc(e.sourceExcerpt)}</span></p>`:'';
 const maps=e.mapsUrl||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address)}`;
 const place=`<div class="event-links"><section class="location-panel" aria-label="Місце проведення">${icon('pin')}<div><h3>Адреса</h3><p>${esc(e.address)}</p></div><a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></section><div class="links"><a class="source-link" href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">${icon('external')}Офіційне джерело ↗</a><p class="verification-note">Джерело перевірено ${instantDate(e.verifiedAt)}.</p></div></div>`;
 const dates=e.sessions.length>1?`<label class="session-label">Оберіть дату для календаря<select data-session="${e.id}" aria-label="Дата події">${e.sessions.map(s=>`<option value="${s.start}" ${s.start===session.start?'selected':''}>${full(s.start)}–${time(s.end)}</option>`).join('')}</select></label>`:'';
 const actions=`<div class="actions">${tab!=='rejected'?`<button class="primary" data-add="${e.id}">↓ Apple Calendar${tab==='added'?' · ще раз':''}</button>`:''}${tab==='all'?`<button class="danger" data-reject="${e.id}">${icon('close')}Відхилити</button>`:`<button data-restore="${e.id}">↩ Повернути до «Усі»</button>`}</div><p class="calendar-note">${tab==='added'?'Файл завантажено; імпорт у календар треба підтвердити окремо.':'Файл .ics · America/New_York · відкрийте файл і підтвердьте імпорт.'}</p>`;
 return `${scores}<p class="event-description">${esc(e.description)}</p>${provenance}${excerpt}<div class="info-grid">${cost}${comfort}${registration}${cautions}</div>${place}<div class="calendar-controls">${dates}${actions}</div>`;
}
let data,state,tab='all',pending;
let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}};}
const announce=(s,tone='info')=>{$('#notice').textContent=s;$('#notice').dataset.tone=tone;};
function persist(){const saved=saveState(storage,state);if(!saved)announce('Браузер не дозволяє зберегти вибір. Після перезавантаження він може зникнути.');return saved;}
function render(){
 const available=tab==='all'?upcomingEvents(data.events):data.events;
 const events=visibleEvents(available,state.selections,tab,$('#category').value,$('#sort').value,$('#local-farms').checked);
 document.querySelectorAll('[data-tab]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.tab===tab));b.querySelector('span').textContent=(b.dataset.tab==='all'?upcomingEvents(data.events):data.events).filter(e=>(state.selections[e.id]?.status||'all')===b.dataset.tab).length;});
 $('#count').textContent=`Подій: ${events.length}`;
 $('#events').innerHTML=events.length?events.map(e=>{
 const selected=state.selections[e.id]?.start;
 const session=e.sessions.find(s=>s.start===selected)||e.sessions[0];
 const [day,...month]=date(session.start).split(' ');
 return `<details class="card ${tab}" data-id="${esc(e.id)}" data-start="${session.start}"><summary><div class="datebox">${esc(month.join(' '))}<b>${esc(day)}</b>${e.sessions.length>1?'кілька дат':session.start.slice(0,4)}</div><div><span class="tag">${esc(e.icon)} ${e.farm?'Місцева ферма':({farm:'Ферма та природа',festival:'Фестиваль',church:'Церковна подія',market:'Ярмарок',culture:'Культурна подія',library:'Бібліотека'}[e.category]||'Подія')}</span><h2>${esc(e.name)}</h2><div class="meta"><span>◷ ${range(session)}</span><span>⌖ ${esc(e.venue)}</span><span>${e.familyPrice===null?'Ціну не підтверджено':e.familyPrice===0?'Безкоштовно':`$${e.familyPrice} / сім’я`}</span></div></div><div class="score"><b>${rating(e)}</b>/ 100</div><span class="arrow" aria-hidden="true">⌄</span></summary><div class="body">${eventDetails(e,session)}</div></details>`;
 }).join(''):`<div class="empty"><span class="empty-icon">✳</span><h2>${tab==='added'?'Плани ще попереду':tab==='rejected'?'Відхилених подій немає':'Подій за цими умовами немає'}</h2><p>${tab==='added'?'Завантажте подію через Apple Calendar у вкладці «Усі».':tab==='rejected'?'Тут з’являться події, які ви відхилите.':'Змініть категорію або поверніть події з інших вкладок. Нові перевірені події з’являться після оновлення джерел.'}</p></div>`;
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{if(!data)return;tab=b.dataset.tab;render();}));
$('#local-farms').addEventListener('change',()=>{if(data)render();});
$('#category').addEventListener('change',()=>{if(data)render();});$('#sort').addEventListener('change',()=>{if(data)render();});
$('#events').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-disclosure')){const content=document.getElementById(b.getAttribute('aria-controls'));if(content){const expanded=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(expanded));content.hidden=!expanded;}return;}
 const id=b.dataset.add||b.dataset.reject||b.dataset.restore;const event=data.events.find(x=>x.id===id);if(!event)return;
 if(b.dataset.add){
  try{
   const value=document.querySelector(`[data-session="${id}"]`)?.value||b.closest('.card')?.dataset.start;
   const session=event.sessions.find(s=>s.start===value)||event.sessions[0];
   const url=URL.createObjectURL(new Blob([calendar(event,session)],{type:'text/calendar;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download=`${id}-${session.start.slice(0,10)}.ics`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   state.selections[id]={status:'added',start:session.start};const saved=persist();if(saved)announce('Файл .ics завантажено. Відкрийте його та підтвердьте імпорт в Apple Calendar. Подія тепер у «Додано».');render();document.querySelector('[data-tab="added"]').focus();
  }catch{announce('Не вдалося створити файл календаря. Спробуйте ще раз.');}
 }else if(b.dataset.reject){pending=id;$('#reject-name').textContent=event.name;$('#reject-dialog').returnValue='';$('#reject-dialog').showModal();}
 else{delete state.selections[id];const saved=persist();if(saved)announce('Подію повернуто до «Усі».');render();document.querySelector('[data-tab="all"]').focus();}
});
$('#reject-dialog').addEventListener('close',()=>{if($('#reject-dialog').returnValue==='confirm'&&pending){state.selections[pending]={status:'rejected'};const saved=persist();render();if(saved)announce('Подію перенесено до «Відхилено».');document.querySelector('[data-tab="rejected"]').focus();}pending=null;});
try{
 const response=await fetch('./data/events.json',{cache:'no-store'});if(!response.ok)throw Error('Data unavailable');data=validatePublishedCatalog(await response.json());
 state=readState(storage,data.catalogId);persist();$('#edition').textContent=data.coverage?`${date(data.coverage.start)} — ${date(data.coverage.end)} ${data.coverage.end.slice(0,4)}`:new Intl.DateTimeFormat('uk-UA',{month:'long',year:'numeric',timeZone:'America/New_York'}).format(new Date(data.catalogId+'-01T12:00:00Z'));$('#verified').textContent=`Оновлено ${instantDate(data.publishedAt)} · Щомісячний каталог`;
 if(data.issues.length)announce('Частину подій приховано: джерела потребують перевірки.','warning');render();
}catch{$('#events').innerHTML='<div class="empty"><h2>Каталог тимчасово недоступний</h2><p>Перезавантажте сторінку, щоб спробувати ще раз.</p></div>';}
