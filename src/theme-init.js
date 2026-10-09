// Apply before CSS paints; preference is separate from catalog selections.
(() => {
 let saved;try{saved=localStorage.getItem('family-events:theme');}catch{}
 document.documentElement.dataset.theme=saved==='light'||saved==='dark'?saved:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
})();
