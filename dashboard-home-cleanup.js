/* Fiscal Control — limpeza aprovada da tela inicial.
   Remove somente os dois blocos que não fazem mais parte da visão inicial:
   "Analistas" e "Quem pode ajudar?".
   Também posiciona a carteira do analista na coluna esquerda, abaixo de "Obrigações por estado". */
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

    /* Localiza o card já existente e usa exatamente o nome solicitado. */
    const cards=[...page.querySelectorAll('.card')];
    const carteira=cards.find(c=>/minhas\s+(lojas|carteira)/i.test(c.textContent||''));
    const obrigacoes=cards.find(c=>/obriga(ç|c)ões\s+por\s+estado/i.test(c.textContent||''));
    if(!carteira||!obrigacoes)return;

    const titulo=carteira.querySelector('.cardTitle h3,h3');
    if(titulo)titulo.textContent='Minha carteira';

    /* Primeira grade .two: esquerda = obrigações, direita = alertas.
       Inserir o card como terceiro item faz o CSS posicioná-lo na coluna esquerda,
       imediatamente abaixo de Obrigações por estado, sem alterar o layout-base. */
    const firstTwo=obrigacoes.closest('.grid.two');
    if(firstTwo && carteira.parentElement!==firstTwo){
      firstTwo.insertBefore(carteira,obrigacoes.nextSibling);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup);else cleanup();
  new MutationObserver(cleanup).observe(document.documentElement,{childList:true,subtree:true});
})();
