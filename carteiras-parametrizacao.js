/* Fiscal Control — regra de carteira: somente analistas ATIVOS podem ser atribuídos a lojas. */
(function(){
  'use strict';
  const MARK='data-fc-carteira-filter';

  function readTeam(){
    try{
      const v=JSON.parse(localStorage.getItem('fc_equipe')||'[]');
      return Array.isArray(v)?v:[];
    }catch(e){ return []; }
  }

  function isActiveAnalyst(member){
    return member && String(member.funcao||'').trim().toLowerCase()==='analista'
      && String(member.situacao||'').trim().toLowerCase()==='ativo';
  }

  function refreshAssignmentSelects(){
    const team=readTeam();
    const allowed=team.filter(isActiveAnalyst);
    const allowedNames=new Set(allowed.map(x=>String(x.nome||'').trim()));
    const selects=document.querySelectorAll('#modalBody select, .modal select');

    selects.forEach(select=>{
      const options=[...select.options];
      const looksLikeAssignment=options.some(o=>{
        const t=String(o.textContent||'').trim();
        return t==='Sem carteira' || team.some(m=>String(m.nome||'').trim()===t);
      });
      if(!looksLikeAssignment) return;

      const current=String(select.value||'').trim();
      options.forEach(o=>{
        const text=String(o.textContent||'').trim();
        const member=team.find(m=>String(m.nome||'').trim()===text);
        if(member && !allowedNames.has(text)) o.remove();
      });

      if(current && [...select.options].some(o=>String(o.value||'').trim()===current)){
        select.value=current;
      }else if(![...select.options].some(o=>String(o.value||'').trim()==='')){
        const opt=document.createElement('option');
        opt.value=''; opt.textContent='Sem carteira';
        select.insertBefore(opt,select.firstChild);
        select.value='';
      }
      select.setAttribute(MARK,'1');
    });
  }

  function start(){
    refreshAssignmentSelects();
    const modal=document.getElementById('modalBack');
    if(modal){
      new MutationObserver(refreshAssignmentSelects).observe(modal,{subtree:true,childList:true});
    }
    window.addEventListener('storage',refreshAssignmentSelects);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
