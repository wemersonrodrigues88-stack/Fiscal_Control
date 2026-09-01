/* Fiscal Control — compatibilidade.
   A implementação oficial de acompanhamento foi consolidada em
   acompanhamento-gestao-consolidado.js.
   Este arquivo permanece apenas para compatibilidade com referências antigas.
*/
(function(){
  'use strict';
  function load(){
    if(!document.querySelector('script[data-fc-acomp-consolidado]')){
      const s=document.createElement('script');
      s.src='acompanhamento-gestao-consolidado.js?v=2';
      s.async=false;
      s.dataset.fcAcompConsolidado='1';
      document.body.appendChild(s);
    }
  }
  function syncDeveloperAccess(){
    const api=window.FiscalControlAcompanhamento;
    const actions=document.getElementById('fcg-actions');
    if(!api||!actions)return;
    try{actions.style.display=api.canManage()?'flex':'none'}catch(_){actions.style.display='none'}
  }
  function init(){
    load();
    syncDeveloperAccess();
    setInterval(syncDeveloperAccess,250);
    document.addEventListener('fc-auth-ready',syncDeveloperAccess);
    document.addEventListener('fc-auth-access-applied',syncDeveloperAccess);
    window.addEventListener('fc-auth-ready',syncDeveloperAccess);
    window.addEventListener('fc-auth-access-applied',syncDeveloperAccess);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
