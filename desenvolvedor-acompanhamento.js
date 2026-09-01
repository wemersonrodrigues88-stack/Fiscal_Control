/* Compatibilidade: o privilégio Desenvolvedor é restaurado pela autorização central.
   Não criar atalhos paralelos nem duplicar a interface de acompanhamento. */
(function(){
  'use strict';
  function cleanup(){
    const el=document.getElementById('fc-dev-acomp-actions');
    if(el)el.remove();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup);else cleanup();
})();
