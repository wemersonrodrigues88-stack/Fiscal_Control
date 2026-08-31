/* Fiscal Control — destaque da linha da Equipe ao passar o mouse.
   Correção visual isolada: não altera dados, regras, botões ou layout estrutural.
   V2: seletor independente da estrutura interna da página. */
(function(){
  'use strict';
  const STYLE_ID='fc-equipe-row-hover-style-v2';
  function apply(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      table tbody tr{transition:background-color .14s ease,box-shadow .14s ease}
      table tbody tr:hover{background:#f1f6ff !important;box-shadow:inset 3px 0 0 #1769e0 !important}
      table tbody tr:hover td:first-child{font-weight:900}
    `;
    document.head.appendChild(s);
  }
  function watch(){
    apply();
    if(!document.body || document.body.__fcEquipeHoverWatch) return;
    document.body.__fcEquipeHoverWatch=true;
    new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',watch);
  else watch();
})();
