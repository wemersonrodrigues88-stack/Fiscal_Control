/* Fiscal Control — limpeza aprovada da tela inicial.
   Remove somente os dois blocos que não fazem mais parte da visão inicial:
   "Analistas" e "Quem pode ajudar?". Não altera dados, navegação ou outras telas. */
(function(){
  'use strict';
  function cleanup(){
    const page=document.getElementById('page-dashboard');
    if(!page)return;
    const titles=[...page.querySelectorAll('.cardTitle h3')];
    const unwanted=titles.filter(h=>{
      const t=(h.textContent||'').trim().toLowerCase();
      return t==='analistas'||t==='quem pode ajudar?';
    });
    unwanted.forEach(h=>{
      const card=h.closest('.card');
      if(card)card.style.display='none';
    });
    const hidden=unwanted.map(h=>h.closest('.card')).filter(Boolean);
    hidden.forEach(card=>{
      const parent=card.parentElement;
      if(parent && parent.classList.contains('grid') && parent.classList.contains('two')){
        const visible=[...parent.children].some(el=>el!==card&&getComputedStyle(el).display!=='none');
        if(!visible)parent.style.display='none';
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup);else cleanup();
  new MutationObserver(cleanup).observe(document.documentElement,{childList:true,subtree:true});
})();
