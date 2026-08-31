/* Fiscal Control — Acompanhamento individual: somente analistas ATIVOS. */
(function(){
  'use strict';
  const read=(k)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[]}catch(e){return[]}};
  const activeAnalysts=()=>read('fc_equipe').filter(p=>p&&String(p.funcao||'').trim().toLowerCase()==='analista'&&String(p.situacao||'').trim().toLowerCase()==='ativo');
  const isIndividualOpen=()=>{const m=document.getElementById('fc-acomp-modal');return !!m&&m.classList.contains('show')&&((document.getElementById('fc-acomp-title')?.textContent||'').trim()==='Acompanhamento individual')};
  function filterCards(){
    if(!isIndividualOpen())return;
    const allowed=new Set(activeAnalysts().map(p=>String(p.nome||'').trim()));
    document.querySelectorAll('#fc-analyst-grid .fc-analyst-card').forEach(card=>{
      const name=(card.querySelector('b')?.textContent||'').trim();
      card.style.display=allowed.has(name)?'':'none';
    });
    const grid=document.getElementById('fc-analyst-grid');
    if(!grid)return;
    const visible=[...grid.querySelectorAll('.fc-analyst-card')].filter(c=>c.style.display!=='none');
    const selected=grid.querySelector('.fc-analyst-card.active');
    if(selected&&selected.style.display==='none'){
      visible.forEach(c=>c.classList.remove('active'));
      if(visible[0]){visible[0].classList.add('active');visible[0].click();}
      else document.getElementById('fc-individual-content').innerHTML='<div class="fc-empty">Nenhum analista ativo cadastrado.</div>';
    }
  }
  function hook(){
    filterCards();
    const m=document.getElementById('fc-acomp-modal');
    if(m&&!m.__fcActiveFilter){
      new MutationObserver(()=>setTimeout(filterCards,0)).observe(m,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
      m.__fcActiveFilter=true;
    }
    const u=document.getElementById('usuario');
    if(u&&!u.__fcActiveFilter){u.addEventListener('change',()=>setTimeout(filterCards,0));u.__fcActiveFilter=true;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
  window.addEventListener('storage',()=>setTimeout(filterCards,0));
  setInterval(filterCards,500);
})();
