/* Fiscal Control — acesso técnico do Desenvolvedor aos acompanhamentos de gestão.
   Não altera o perfil operacional do usuário e não libera esta interface para analistas comuns. */
(function(){
  'use strict';
  function isDeveloper(){ return window.FC_AUTH?.isDeveloper===true || window.FC_ACCESS?.isDeveloper?.()===true; }
  function management(){ return window.FC_AUTH?.managementPreview===true; }
  function clickExisting(id){
    const b=document.getElementById(id);
    if(b){ b.click(); return true; }
    return false;
  }
  function openAsManagement(id){
    if(clickExisting(id)) return;
    const select=document.getElementById('usuario');
    if(!select) return;
    const original=select.value;
    let option=[...select.options].find(o=>o.value==='Daniela');
    if(!option){ option=new Option('Daniela','Daniela'); select.add(option); }
    select.value='Daniela';
    setTimeout(()=>{
      if(clickExisting(id)){
        setTimeout(()=>{ select.value=original; },50);
      } else {
        select.value=original;
      }
    },0);
  }
  function install(){
    if(!isDeveloper()) return;
    if(document.getElementById('fc-dev-acomp-actions')) return;
    const host=document.querySelector('.persona');
    if(!host) return;
    const wrap=document.createElement('div');
    wrap.id='fc-dev-acomp-actions';
    wrap.style.cssText='display:flex;gap:6px;align-items:center;margin-right:4px;';
    wrap.innerHTML='<button type="button" class="btn" id="fc-dev-acomp-geral">Acompanhamento geral</button><button type="button" class="btn" id="fc-dev-acomp-individual">Acompanhamento individual</button>';
    host.insertBefore(wrap,host.firstChild);
    document.getElementById('fc-dev-acomp-geral').onclick=()=>openAsManagement('fc-geral');
    document.getElementById('fc-dev-acomp-individual').onclick=()=>openAsManagement('fc-individual');
  }
  function hook(){ install(); setTimeout(install,300); setTimeout(install,1000); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',hook); else hook();
  setInterval(()=>{if(isDeveloper())install();},1000);
})();
