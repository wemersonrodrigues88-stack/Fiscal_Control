/* Fiscal Control — acesso gerencial temporário do Desenvolvedor.
   Wemerson continua autenticado como Desenvolvedor, mas recebe a mesma visão
   gerencial de acompanhamento sem alterar sua identidade técnica.
*/
(function(){
  'use strict';
  function load(){
    if(document.querySelector('script[data-fc-acomp-consolidado]'))return;
    const s=document.createElement('script');
    s.src='/acompanhamento-gestao-consolidado.js?v=2';
    s.async=false;
    s.dataset.fcAcompConsolidado='1';
    document.body.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
