/* Fiscal Control — compatibilidade.
   Acompanhamento de gestão é implementado exclusivamente por
   acompanhamento-gestao-consolidado.js. Este arquivo permanece apenas
   porque versões antigas do HTML ainda podem referenciá-lo.
*/
(function(){
  'use strict';
  function load(){
    if(document.querySelector('script[data-fc-acomp-consolidado]'))return;
    const s=document.createElement('script');
    s.src='/acompanhamento-gestao-consolidado.js?v=3';
    s.async=false;
    s.dataset.fcAcompConsolidado='1';
    document.body.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
