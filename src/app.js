import {rating,weights,labels,readState,saveState,visibleEvents,calendar,upcomingEvents} from './core.js';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'short',timeZone:'America/New_York'}).format(new Date(s.slice(0,10)+'T12:00:00-04:00'));
const instantDate=s=>new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'short',timeZone:'America/New_York'}).format(new Date(s));
const time=s=>s?s.slice(11,16):'завершення не вказано',full=s=>`${date(s)} · ${time(s)}`,range=s=>s.end?`${time(s.start)}–${time(s.end)}`:`${time(s.start)} · завершення не вказано`;
let data,state,tab='all',pending;
let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}};}
const announce=s=>{$('#notice').textContent=s;};
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
 return `<details class="card ${tab}" data-id="${esc(e.id)}" data-start="${session.start}"><summary><div class="datebox">${esc(month.join(' '))}<b>${esc(day)}</b>${e.sessions.length>1?'кілька дат':session.start.slice(0,4)}</div><div><span class="tag">${e.icon} ${e.farm?'Місцева ферма':({farm:'Ферма та природа',festival:'Фестиваль',church:'Церковна подія',market:'Ярмарок',culture:'Культурна подія',library:'Бібліотека'}[e.category]||'Подія')}</span><h2>${esc(e.name)}</h2><div class="meta"><span>◷ ${range(session)}</span><span>⌖ ${esc(e.venue)}</span><span>${e.familyPrice===null?'Ціну не підтверджено':e.familyPrice===0?'Безкоштовно':`$${e.familyPrice} / сім’я`}</span><span>${esc(e.distanceLabel)}</span></div></div><div class="score"><b>${rating(e)}</b>/ 100</div><span class="arrow" aria-hidden="true">⌄</span></summary><div class="body"><p>${esc(e.description)}</p>${e.automation?'<p class="calendar-note">↻ Автоматично імпортовано з офіційного джерела</p>':''}${e.sourceExcerpt?`<p class="calendar-note">Короткий опис організатора (мовою джерела): <span lang="en">${esc(e.sourceExcerpt)}</span></p>`:''}<p>${esc(e.priceNote)}</p><p>${esc(e.comfortNote)}</p>${e.ratingNote?`<p class="calendar-note">${esc(e.ratingNote)}</p>`:''}<p><strong>Адреса:</strong> ${esc(e.address)}</p><div class="links"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address)}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a><a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">Офіційне джерело ↗</a></div><div class="breakdown" aria-label="Складові рейтингу">${Object.entries(weights).map(([k,max])=>`<span>${labels[k]} <b>${e.points[k]}/${max}</b></span>`).join('')}</div>${e.sessions.length>1?`<label class="session-label">Оберіть дату для календаря<select data-session="${e.id}" aria-label="Дата події">${e.sessions.map(s=>`<option value="${s.start}" ${s.start===session.start?'selected':''}>${full(s.start)}–${time(s.end)}</option>`).join('')}</select></label>`:''}<div class="actions">${tab!=='rejected'?`<button class="primary" data-add="${e.id}">↓ Apple Calendar${tab==='added'?' · ще раз':''}</button>`:''}${tab==='all'?`<button data-reject="${e.id}">Відхилити</button>`:`<button data-restore="${e.id}">↩ Повернути до «Усі»</button>`}</div><p class="calendar-note">${tab==='added'?'Файл завантажено; імпорт у календар треба підтвердити окремо.':'Файл .ics · America/New_York · відкрийте файл і підтвердьте імпорт.'}</p><p class="calendar-note">Джерело перевірено ${instantDate(e.verifiedAt)}. Перед поїздкою перевірте можливі зміни.</p></div></details>`;
 }).join(''):`<div class="empty"><span class="empty-icon">✳</span><h2>${tab==='added'?'Плани ще попереду':tab==='rejected'?'Відхилених подій немає':'Подій за цими умовами немає'}</h2><p>${tab==='added'?'Завантажте подію через Apple Calendar у вкладці «Усі».':tab==='rejected'?'Тут з’являться події, які ви відхилите.':'Змініть категорію або поверніть події з інших вкладок. Нові перевірені події з’являться після оновлення джерел.'}</p></div>`;
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{if(!data)return;tab=b.dataset.tab;render();}));
$('#local-farms').addEventListener('change',()=>{if(data)render();});
$('#category').addEventListener('change',()=>{if(data)render();});$('#sort').addEventListener('change',()=>{if(data)render();});
$('#events').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
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
 const response=await fetch('./data/events.json',{cache:'no-store'});if(!response.ok)throw Error('Data unavailable');data=await response.json();
 state=readState(storage,data.catalogId);persist();$('#edition').textContent=new Intl.DateTimeFormat('uk-UA',{month:'long',year:'numeric',timeZone:'America/New_York'}).format(new Date(data.catalogId+'-01T12:00:00Z'));$('#verified').textContent=`Оновлено ${instantDate(data.publishedAt)} · Оновлення 1-го числа щомісяця`;
 if(data.issues.length)announce('Частину подій приховано: джерела потребують перевірки.');render();
}catch{$('#events').innerHTML='<div class="empty"><h2>Каталог тимчасово недоступний</h2><p>Перезавантажте сторінку, щоб спробувати ще раз.</p></div>';}
