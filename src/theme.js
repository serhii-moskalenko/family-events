const button=document.querySelector('#theme-toggle');
const system=matchMedia('(prefers-color-scheme: dark)');
function update(){const dark=document.documentElement.dataset.theme==='dark';button.textContent=dark?'☀ Світла':'☾ Темна';button.setAttribute('aria-label',`Увімкнути ${dark?'світлу':'темну'} тему`);document.querySelector('meta[name="theme-color"]').content=dark?'#0a0a0a':'#ffffff';}
button.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('family-events:theme',next);}catch{}update();});
system.addEventListener('change',()=>{let saved;try{saved=localStorage.getItem('family-events:theme');}catch{}if(saved!=='dark'&&saved!=='light'){document.documentElement.dataset.theme=system.matches?'dark':'light';update();}});
update();
