/* Fiscal Control — remove somente o card duplicado de Progresso por imposto criado pelo painel legado. */
(function(){
  'use strict';
  function cleanup(){
    const page=document.getElementById('page-dashboard');
    if(!page)return;
    page.querySelectorAll('#fc-analyst-chart-card').forEach(el=>el.remove());
    const cards=[...page.querySelectorAll('.card')].filter(el=>{
      const h=el.querySelector('.cardTitle h3');
      return h && h.textContent.trim()==='Progresso por imposto' && el.id!=='fc-analyst-progress-card';
    });
    cards.forEach(el=>el.remove());
  }
  function init(){
    cleanup();
    setInterval(cleanup,500);
    new MutationObserver(cleanup).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
