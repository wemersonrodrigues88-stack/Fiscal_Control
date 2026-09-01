/* Fiscal Control — botão Gerando Query para ICMS e PIS/COFINS.
   O botão fica na mesma linha de Analisando e Finalizar e usa a mesma mecânica de status. */
(function(){
  'use strict';
  const TARGETS=['ICMS','PIS/COFINS'];
  const norm=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,' ');

  function injectStyle(){
    if(document.getElementById('fc-query-btn-style'))return;
    const s=document.createElement('style');s.id='fc-query-btn-style';s.textContent=`
      .fc-gerando-query-btn{width:auto;flex:1;min-height:32px;margin-top:0;border:1px solid #cbd8ea;border-radius:9px;background:#f5f8fc;color:#185ebc;font:inherit;font-size:11px;font-weight:800;cursor:pointer;transition:.15s ease}
      .fc-gerando-query-btn:hover{background:#eaf1ff;border-color:#9dbbe5}
      .fc-gerando-query-btn:active{transform:translateY(1px)}
      .fc-gerando-query-btn.is-query{background:#eaf1ff;border-color:#b8cfee;color:#185ebc}
    `;document.head.appendChild(s);
  }

  function findTaxCards(){return [...new Set([...document.querySelectorAll('#taxCards .card'),...document.querySelectorAll('#taxCards > *')])];}
  function taxName(card){const h=card?.querySelector('h2,h3,h4,.cardTitle strong,.cardTitle b');return norm(h?.textContent||'');}

  function addButtons(){
    injectStyle();
    findTaxCards().forEach(card=>{
      if(!card||card.id==='fc-query-btn'||!TARGETS.includes(taxName(card))||card.querySelector('.fc-gerando-query-btn'))return;
      const button=document.createElement('button');button.type='button';button.className='fc-gerando-query-btn';button.textContent='Gerando Query';button.setAttribute('aria-label','Gerando Query — '+taxName(card));button.dataset.tax=taxName(card);
      button.addEventListener('click',function(){document.dispatchEvent(new CustomEvent('fc:gerar-query',{bubbles:true,detail:{imposto:button.dataset.tax,botao:button}}));});
      const storeActions=card.querySelectorAll('.store .rowBtns');
      storeActions.forEach(actions=>{if(!actions.querySelector('.fc-gerando-query-btn'))actions.appendChild(button.cloneNode(true));});
      card.querySelectorAll('.fc-gerando-query-btn').forEach(b=>{b.addEventListener('click',function(){document.dispatchEvent(new CustomEvent('fc:gerar-query',{bubbles:true,detail:{imposto:b.dataset.tax||taxName(card),botao:b}}));});});
    });
  }

  function init(){addButtons();new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
