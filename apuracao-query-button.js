/* Fiscal Control — botão Gerando Query para ICMS e PIS/COFINS.
   É uma etapa inicial: Gerando Query → Analisando → Finalizada.
   O botão fica à esquerda de Analisando e grava o status na mesma execução da loja. */
(function(){
  'use strict';
  const TARGETS=['ICMS','PIS/COFINS'];
  const norm=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,' ');

  function injectStyle(){
    if(document.getElementById('fc-query-btn-style'))return;
    const s=document.createElement('style');s.id='fc-query-btn-style';s.textContent=`
      .fc-gerando-query-btn{width:auto;flex:1;min-height:32px;margin-top:0;border:1px solid #b8cfee;border-radius:9px;background:#eaf1ff;color:#185ebc;font:inherit;font-size:11px;font-weight:800;cursor:pointer;transition:.15s ease}
      .fc-gerando-query-btn:hover{background:#dfeaff;border-color:#94b5e6}
      .fc-gerando-query-btn:active{transform:translateY(1px)}
      .fc-gerando-query-btn.is-query{background:#dfeaff;border-color:#94b5e6;color:#185ebc}
    `;document.head.appendChild(s);
  }

  function findTaxCards(){return [...new Set([...document.querySelectorAll('#taxCards .card'),...document.querySelectorAll('#taxCards > *')])];}
  function taxName(card){const h=card?.querySelector('h2,h3,h4,.cardTitle strong,.cardTitle b');return norm(h?.textContent||'');}

  function identifyStore(button){
    const store=button?.closest?.('.store');
    if(!store)return null;
    const direct=store.querySelector('[data-op-analysis],[data-op-final]');
    if(direct?.dataset.opAnalysis)return {id:Number(direct.dataset.opAnalysis),tax:direct.dataset.opTax||''};
    if(direct?.dataset.opFinal)return {id:Number(direct.dataset.opFinal),tax:direct.dataset.opTax||''};
    const source=[...store.querySelectorAll('.rowBtns button')].find(b=>b!==button);
    const onclick=source?.getAttribute('onclick')||'';
    const m=onclick.match(/(?:setStatus|finalizar)\s*\(\s*([0-9]+)\s*,\s*['\"]([^'\"]+)['\"]/);
    return m?{id:Number(m[1]),tax:m[2]}:null;
  }

  function addButtons(){
    injectStyle();
    findTaxCards().forEach(card=>{
      const tax=taxName(card);
      if(!card||!TARGETS.includes(tax))return;
      card.querySelectorAll('.store .rowBtns').forEach(actions=>{
        if(actions.querySelector('.fc-gerando-query-btn'))return;
        const button=document.createElement('button');
        button.type='button';
        button.className='fc-gerando-query-btn';
        button.textContent='Gerando Query';
        button.setAttribute('aria-label','Gerando Query — '+tax);
        button.dataset.tax=tax;
        button.addEventListener('click',function(e){
          e.preventDefault();
          e.stopPropagation();
          const info=identifyStore(button);
          if(!info||!info.id)return;
          const storeTax=info.tax||tax;
          if(typeof window.setStatus==='function')window.setStatus(info.id,storeTax,'Gerando Query');
        });
        const analysis=actions.querySelector('[data-op-analysis],button[onclick*="setStatus"]');
        if(analysis)actions.insertBefore(button,analysis);
        else actions.insertBefore(button,actions.firstChild);
      });
    });
  }

  function init(){
    addButtons();
    new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
