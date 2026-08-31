/* Fiscal Control — destaque da linha da Equipe ao passar o mouse.
   Correção visual isolada: não altera dados, regras, botões ou layout estrutural. */
(function(){
  'use strict';
  const STYLE_ID='fc-equipe-row-hover-style-v2';
  function apply(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      /* A tela Equipe pode ser renderizada sem #page-equipe.
         Aplicamos o efeito diretamente às tabelas de colaboradores. */
      table tbody tr{transition:background-color .14s ease,box-shadow .14s ease}
      table tbody tr:hover{background:#f1f6ff !important;box-shadow:inset 3px 0 0 #1769e0}
      table tbody tr:hover td:first-child{font-weight:900}
    `;
    document.head.appendChild(s);
  }
  function watch(){
    apply();
    const root=document.body;
    if(!root || root.__fcEquipeHoverWatch) return;
    root.__fcEquipeHoverWatch=true;
    new MutationObserver(apply).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',watch);
  else watch();
})();
