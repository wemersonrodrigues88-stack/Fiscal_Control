/* Fiscal Control — botão Gerando Query para ICMS e PIS/COFINS.
   Apenas adiciona a ação visual aos dois impostos solicitados, sem alterar os demais impostos.
   O evento customizado permite conectar a geração real da query posteriormente. */
(function(){
  'use strict';
  const TARGETS=['ICMS','PIS/COFINS'];
  const norm=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,' ');

  function injectStyle(){
    if(document.getElementById('fc-query-btn-style')) return;
    const s=document.createElement('style');
    s.id='fc-query-btn-style';
    s.textContent=`
      .fc-gerando-query-btn{
        width:100%;
        min-height:34px;
        margin-top:8px;
        border:1px solid #cbd8ea;
        border-radius:9px;
        background:#f5f8fc;
        color:#185ebc;
        font:inherit;
        font-size:12px;
        font-weight:800;
        cursor:pointer;
        transition:.15s ease;
      }
      .fc-gerando-query-btn:hover{background:#eaf1ff;border-color:#9dbbe5}
      .fc-gerando-query-btn:active{transform:translateY(1px)}
      .fc-gerando-query-btn.done{background:#e8f7f1;border-color:#b7e4d4;color:#087453}
    `;
    document.head.appendChild(s);
  }

  function findTaxCards(){
    const roots=[
      ...document.querySelectorAll('#taxCards .card'),
      ...document.querySelectorAll('#taxCards > *')
    ];
    return [...new Set(roots)];
  }

  function taxName(card){
    const h=card?.querySelector('h2,h3,h4,.cardTitle strong,.cardTitle b');
    return norm(h?.textContent||'');
  }

  function addButtons(){
    injectStyle();
    findTaxCards().forEach(card=>{
      if(!card || card.id==='fc-query-btn') return;
      const tax=taxName(card);
      if(!TARGETS.includes(tax)) return;
      if(card.querySelector('.fc-gerando-query-btn')) return;

      const button=document.createElement('button');
      button.type='button';
      button.className='fc-gerando-query-btn';
      button.textContent='Gerando Query';
      button.setAttribute('aria-label','Gerando Query — '+tax);
      button.dataset.tax=tax;

      button.addEventListener('click',function(){
        const event=new CustomEvent('fc:gerar-query',{
          bubbles:true,
          detail:{imposto:tax,botao:button}
        });
        document.dispatchEvent(event);
      });

      const actions=card.querySelector('.actions,.cardActions,.buttons,.card-buttons');
      if(actions) actions.appendChild(button);
      else card.appendChild(button);
    });
  }

  function init(){
    addButtons();
    new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
