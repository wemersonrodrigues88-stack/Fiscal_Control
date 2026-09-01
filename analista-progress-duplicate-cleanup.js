/* Fiscal Control — limpeza do card duplicado + bloqueio de alteração de carteira para analistas. */
(function(){
  'use strict';

  function currentUser(){
    try{return String(document.getElementById('usuario')?.value||'').trim()}catch(e){return ''}
  }

  function isAnalyst(){
    const u=currentUser();
    if(!u)return false;
    if(u==='Daniela'||u==='Leonardo')return false;
    try{
      const equipe=JSON.parse(localStorage.getItem('fc_equipe')||'[]');
      const p=Array.isArray(equipe)?equipe.find(x=>x&&x.nome===u):null;
      return !!p&&String(p.funcao||'').toLowerCase()==='analista';
    }catch(e){return false}
  }

  function toast(msg){
    try{if(typeof window.toast==='function')window.toast(msg);else if(typeof window.showToast==='function')window.showToast(msg);else alert(msg)}catch(e){}
  }

  function cleanup(){
    const page=document.getElementById('page-dashboard');
    if(!page)return;
    page.querySelectorAll('#fc-analyst-chart-card').forEach(el=>el.remove());
    const cards=[...page.querySelectorAll('.card')].filter(el=>{
      const h=el.querySelector('.cardTitle h3');
      return h&&h.textContent.trim()==='Progresso por imposto'&&el.id!=='fc-analyst-progress-card';
    });
    cards.forEach(el=>el.remove());
  }

  function lockStoreAssignment(){
    if(!isAnalyst())return;

    /* Analista não pode abrir cadastro de nova loja nem trocar carteira. */
    document.querySelectorAll('[onclick="openStore()"], [onclick="openAssign()"], [onclick*="openAssign("]').forEach(b=>{
      b.disabled=true;
      b.style.display='none';
    });

    const modal=document.getElementById('modalBack');
    if(!modal||!modal.classList.contains('show'))return;

    const label=[...modal.querySelectorAll('.field label')].find(x=>x.textContent.trim().toLowerCase().startsWith('analista responsável'));
    if(!label)return;
    const field=label.closest('.field');
    const select=field?.querySelector('#sAna');
    if(!select)return;

    const lojaAtual=(()=>{
      try{
        const lojas=JSON.parse(localStorage.getItem('fc_lojas')||'[]');
        const numero=document.getElementById('sNumero')?.value;
        return Array.isArray(lojas)?lojas.find(x=>String(x.numero)===String(numero)):null;
      }catch(e){return null}
    })();

    const lockedValue=String(lojaAtual?.analista||select.value||'');
    select.value=lockedValue;
    select.disabled=true;
    select.title='Somente o coordenador ou a gerente pode alterar a carteira.';
    select.setAttribute('aria-disabled','true');
    select.style.background='#f3f6fa';
    select.style.cursor='not-allowed';

    let note=field.querySelector('.fc-analyst-lock-note');
    if(!note){
      note=document.createElement('small');
      note.className='fc-analyst-lock-note';
      note.style.cssText='display:block;margin-top:4px;color:#687589;font-size:10px';
      note.textContent='Carteira bloqueada para analistas. Alteração exclusiva da coordenação/gerência.';
      field.appendChild(note);
    }

    const saveBtn=document.getElementById('modalSave');
    if(saveBtn&&!saveBtn.dataset.fcAssignmentLocked){
      saveBtn.dataset.fcAssignmentLocked='1';
      const original=saveBtn.onclick;
      saveBtn.onclick=function(){
        /* Defesa adicional: mesmo que algum código tente alterar o select,
           o valor original da carteira será preservado antes de salvar. */
        select.value=lockedValue;
        if(typeof original==='function')return original.apply(this,arguments);
      };
    }
  }

  function installGuards(){
    if(window.__fcAnalystAssignmentGuard)return;
    if(typeof window.openStore==='function'){
      const oldOpenStore=window.openStore;
      window.openStore=function(id){
        if(isAnalyst()&&!id){
          toast('Analistas não podem cadastrar novas lojas. A carteira é definida pela coordenação/gerência.');
          return;
        }
        const result=oldOpenStore.apply(this,arguments);
        setTimeout(lockStoreAssignment,0);
        return result;
      };
    }
    if(typeof window.openAssign==='function'){
      const oldOpenAssign=window.openAssign;
      window.openAssign=function(){
        if(isAnalyst()){
          toast('Analistas não podem trocar a carteira de lojas.');
          return;
        }
        return oldOpenAssign.apply(this,arguments);
      };
    }
    window.__fcAnalystAssignmentGuard=true;
  }

  function apply(){
    cleanup();
    installGuards();
    lockStoreAssignment();
  }

  function init(){
    apply();
    setInterval(apply,500);
    new MutationObserver(()=>setTimeout(apply,20)).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
