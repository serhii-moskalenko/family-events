import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const catalog=JSON.parse(await fs.readFile('tests/fixtures/catalog.json','utf8'));
test.beforeEach(async({page})=>{await page.route('**/data/events.json',route=>route.fulfill({json:catalog}));await page.clock.setFixedTime(new Date('2026-10-09T12:00:00Z'));await page.goto('/');await expect(page.locator('.card')).toHaveCount(2);});
test('mobile catalogue, categories, details, calendar and persistent selections',async({page})=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.locator('#category').selectOption('farm');await expect(page.locator('.card')).toHaveCount(1);await page.locator('.card summary').click();await expect(page.getByLabel('Дата події')).toBeVisible();await page.getByLabel('Дата події').selectOption('2026-10-10T10:00');const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'↓ Apple Calendar',exact:true}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toContain('2026-10-10.ics');const file=await fs.readFile(await download.path(),'utf8');expect(file).toContain('DTSTART;TZID=America/New_York:20261010T100000');await page.getByRole('button',{name:/Додано/}).click();await expect(page.locator('.card.added')).toHaveCount(1);await page.reload();await expect(page.locator('.card')).toHaveCount(1);await page.getByRole('button',{name:/Додано/}).click();await expect(page.locator('.card.added')).toHaveCount(1);await page.locator('.card summary').click();await page.getByRole('button',{name:'↩ Повернути до «Усі»'}).click();await page.getByRole('button',{name:/^Усі/}).click();await expect(page.locator('.card')).toHaveCount(2);});
test('rejection requires confirmation and can be restored; single day has no date selector',async({page})=>{await page.locator('.card').first().locator('summary').click();await expect(page.getByLabel('Дата події')).toHaveCount(1);await expect(page.getByLabel('Дата події')).not.toBeVisible();await page.getByRole('button',{name:'Відхилити',exact:true}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Залишити'}).click();await expect(page.locator('.card')).toHaveCount(2);await page.getByRole('button',{name:'Відхилити',exact:true}).first().click();await page.getByRole('dialog').getByRole('button',{name:'Відхилити'}).click();await expect(page.locator('.card')).toHaveCount(1);await page.getByRole('button',{name:/Відхилено/}).click();await expect(page.locator('.card.rejected')).toHaveCount(1);await page.locator('.card summary').click();await page.getByRole('button',{name:'↩ Повернути до «Усі»'}).click();await page.getByRole('button',{name:/^Усі/}).click();await expect(page.locator('.card')).toHaveCount(2);});
test('publishing a new month resets state; same-month refresh preserves state',async({page})=>{await page.evaluate(period=>localStorage.setItem('family-events:v1',JSON.stringify({period,selections:{'great-pumpkin-fest-2026':{status:'added'}}})),catalog.catalogId);await page.reload();await expect(page.locator('.card')).toHaveCount(1);await page.route('**/data/events.json',route=>route.fulfill({json:{...catalog,catalogId:'2026-11'}}));await page.reload();await expect(page.locator('.card')).toHaveCount(2);});
test('catalogue fetch errors show useful feedback',async({page})=>{await page.route('**/data/events.json',r=>r.fulfill({status:503}));await page.reload();await expect(page.getByText('Каталог тимчасово недоступний')).toBeVisible();});

test('Escape never confirms a rejection after a previous confirmed dialog',async({page})=>{await page.locator('.card').first().locator('summary').click();await page.getByRole('button',{name:'Відхилити',exact:true}).first().click();await page.getByRole('dialog').getByRole('button',{name:'Відхилити'}).click();await expect(page.locator('.card')).toHaveCount(1);await page.locator('.card summary').click();await page.getByRole('button',{name:'Відхилити',exact:true}).first().click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('.card')).toHaveCount(1);});

test('light and dark theme follow system initially, persist preference and preserve selections',async({page})=>{await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('html')).toHaveCSS('background-color','rgb(10, 10, 10)');await page.getByRole('button',{name:'Увімкнути світлу тему'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await expect(page.locator('html')).toHaveCSS('background-color','rgb(255, 255, 255)');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.getByRole('button',{name:'Увімкнути темну тему'}).click();await page.locator('.card').first().locator('summary').click();await page.getByRole('button',{name:'↓ Apple Calendar',exact:true}).first().click();await page.getByRole('button',{name:/Додано/}).click();await expect(page.locator('.card.added')).toHaveCSS('background-color','rgb(16, 44, 27)');await page.getByRole('button',{name:'Увімкнути світлу тему'}).click();await expect(page.locator('.card.added')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();});
test('past sessions disappear from main catalog without waiting for monthly refresh',async({page})=>{await page.clock.setFixedTime(new Date('2026-10-12T12:00:00Z'));await page.reload();await expect(page.locator('.card')).toHaveCount(1);await page.locator('.card summary').click();await expect(page.getByLabel('Дата події')).not.toContainText('9 жовт.');});

test('expanded church and market records show facts and unknowns correctly',async({page})=>{
 const curated=JSON.parse(await fs.readFile('config/sources.json','utf8'));
 const expanded={...catalog,events:curated.events.map(e=>({...e,verifiedAt:'2026-10-09T12:00:00Z'}))};
 await page.route('**/data/events.json',r=>r.fulfill({json:expanded}));await page.reload();
 await expect(page.locator('.card')).toHaveCount(14);
 await page.locator('#category').selectOption('church');await expect(page.locator('.card')).toHaveCount(7);
 // Select the named record independently of its editorial ranking.
 const baptist=page.locator('.card').filter({hasText:'Сімейний Fall Fest · Canton First Baptist'});
 await expect(baptist).toHaveCount(1);await baptist.locator('summary').click();
 await expect(baptist).toContainText('18:00–20:00');await expect(baptist).toContainText('Ціну не підтверджено');await expect(baptist.locator('select')).toHaveCount(0);
 const dinner=page.locator('[data-id="woodstock-first-baptist-dinner-oct14-2026"]');await expect(dinner).toContainText('$20 / сім’я');await expect(dinner).toContainText('16:30–18:30');await expect(page.locator('[data-id="woodstock-first-baptist-pastors-oct25-2026"]')).toContainText('Ціну не підтверджено');
 const homecoming=page.locator('.card').filter({hasText:'Homecoming'});await homecoming.locator('summary').click();await expect(homecoming).toContainText('завершення не вказано');
 const downloaded=page.waitForEvent('download');await homecoming.getByRole('button',{name:'↓ Apple Calendar',exact:true}).click();
 const file=await fs.readFile(await (await downloaded).path(),'utf8');expect(file).not.toContain('DTEND;TZID');
 await page.locator('#category').selectOption('market');await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('.card')).toContainText('Makers Market');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('calendar uses the displayed upcoming occurrence when only one remains',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-31T12:00:00Z'));await page.reload();await expect(page.locator('.card')).toHaveCount(1);await page.locator('.card summary').click();await expect(page.getByLabel('Дата події')).toHaveCount(0);
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'↓ Apple Calendar',exact:true}).click();const download=await downloading;
 const file=await fs.readFile(await download.path(),'utf8');expect(file).toContain('DTSTART;TZID=America/New_York:20261031T100000');
});

test('automatically discovered card displays provenance and safely escapes the source excerpt',async({page})=>{
 const automatic=JSON.parse(await fs.readFile('tests/fixtures/automatic-event.json','utf8'));
 automatic.verifiedAt='2026-10-10T00:30:00Z';
 automatic.sourceExcerpt='<script>window.sourceExecuted=true</script> A family event';
 await page.route('**/data/events.json',r=>r.fulfill({json:{...catalog,publishedAt:'2026-10-10T00:30:00Z',discoveryEnabled:true,events:[automatic]}}));await page.reload();await expect(page.locator('.card')).toHaveCount(1);
 await page.locator('.card summary').click();await expect(page.getByText('↻ Автоматично імпортовано з офіційного джерела')).toBeVisible();await expect(page.getByText(/Короткий опис організатора/)).toContainText('<script>');
 await expect(page.locator('.card')).toContainText('Джерело перевірено 9 жовт.');await expect(page.locator('#verified')).toContainText('Опубліковано 9 жовт.');
 expect(await page.evaluate(()=>window.sourceExecuted)).toBeUndefined();await expect(page.getByText('Автоматична оцінка за правилами',{exact:false})).toBeVisible();await expect(page.getByLabel('Дата події')).toHaveCount(0);
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'↓ Apple Calendar',exact:true}).click();const file=await fs.readFile(await (await downloaded).path(),'utf8');expect(file).toContain('TZID=America/New_York');await page.getByRole('button',{name:/Додано/}).click();await expect(page.locator('.card.added')).toHaveCount(1);
});

test('independent local farms checkbox excludes nature events and works in Added',async({page})=>{
 const farm=catalog.events.find(e=>e.farm);
 const nature={...farm,id:'park-pumpkins',name:'Гарбузи в міському парку',farm:undefined};
 await page.route('**/data/events.json',r=>r.fulfill({json:{...catalog,events:[...catalog.events,nature]}}));await page.reload();await expect(page.locator('.card')).toHaveCount(3);
 await page.locator('#category').selectOption('farm');await expect(page.locator('.card')).toHaveCount(2);
 await page.getByLabel('🌾 Місцеві ферми').check();await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('.card')).toContainText('Cagle');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.locator('.card summary').click();await page.getByRole('button',{name:'↓ Apple Calendar',exact:true}).click();await page.getByRole('button',{name:/Додано/}).click();await expect(page.locator('.card.added')).toHaveCount(1);
 await page.locator('.card summary').click();await page.getByRole('button',{name:'↩ Повернути до «Усі»'}).click();await page.getByRole('button',{name:/^Усі/}).click();await expect(page.locator('.card')).toHaveCount(1);
 await page.getByLabel('🌾 Місцеві ферми').uncheck();await expect(page.locator('.card')).toHaveCount(2);await page.locator('#category').selectOption('all');await expect(page.locator('.card')).toHaveCount(3);
});
test('price remains visible but cannot change the displayed rating or its breakdown',async({page})=>{
 const event=catalog.events[0];
 for(const familyPrice of [0,1000,null]){
  await page.route('**/data/events.json',r=>r.fulfill({json:{...catalog,events:[{...event,familyPrice}]}}));await page.reload();await expect(page.locator('.score b')).toHaveText('85');
  await page.locator('.card summary').click();await expect(page.locator('.breakdown span')).toHaveCount(4);await expect(page.locator('.breakdown')).not.toContainText('Вартість');
  await expect(page.locator('.meta')).toContainText(familyPrice===null?'Ціну не підтверджено':familyPrice===0?'Безкоштовно':'$1000 / сім’я');
 }
});


test('weekly edition preserves both selections on correction and resets on next week without changing theme',async({page})=>{
 const weekly=JSON.parse(await fs.readFile('tests/fixtures/weekly-catalog.json','utf8'));
 await page.route('**/data/events.json',r=>r.fulfill({json:weekly}));
 await page.evaluate(period=>{localStorage.setItem('family-events:v1',JSON.stringify({period,selections:{'great-pumpkin-fest-2026':{status:'added'},'cagles-fall-2026':{status:'rejected'}}}));localStorage.setItem('family-events:theme','dark');},weekly.catalogId);
 await page.reload();await expect(page.locator('.card')).toHaveCount(0);await expect(page.locator('#edition')).toContainText('9 жовт.');await expect(page.locator('#edition')).toContainText('15 жовт.');
 await page.getByRole('button',{name:/Додано/}).click();await expect(page.locator('.card.added')).toHaveCount(1);await page.getByRole('button',{name:/Відхилено/}).click();await expect(page.locator('.card.rejected')).toHaveCount(1);
 await page.route('**/data/events.json',r=>r.fulfill({json:{...weekly,publishedAt:'2026-10-10T08:00:00Z'}}));await page.reload();await page.getByRole('button',{name:/Додано/}).click();await expect(page.locator('.card.added')).toHaveCount(1);
 const next={...weekly,catalogId:'week-2026-10-12',rangeStart:'2026-10-12',rangeEnd:'2026-10-18',events:weekly.events.map(e=>({...e,sessions:e.sessions.map(s=>({...s,start:s.start.replace(/2026-10-\d{2}/,'2026-10-14'),end:s.end?.replace(/2026-10-\d{2}/,'2026-10-14')??null})).slice(0,1)}))};
 await page.route('**/data/events.json',r=>r.fulfill({json:next}));await page.reload();await expect(page.locator('.card')).toHaveCount(2);await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.getByRole('button',{name:/Додано/}).click();await expect(page.locator('.card.added')).toHaveCount(0);
});
