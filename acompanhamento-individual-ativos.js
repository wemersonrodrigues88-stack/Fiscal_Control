/* Fiscal Control — compatibilidade.
   A implementação oficial de acompanhamento foi consolidada em
   acompanhamento-gestao-consolidado.js.
   Este arquivo permanece apenas para compatibilidade com referências antigas
   no HTML publicado e não contém mais lógica de negócio duplicada.
*/
(function(){
  'use strict';
  function load(){
    if(document.querySelector('script[data-fc-acomp-consolidado]'))return;
    const s=document.createElement('script');
    s.src='acompanhamento-gestao-consolidado.js?v=1';
    s.async=false;
    s.dataset.fcAcompConsolidado='1';
    document.body.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
