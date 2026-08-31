/* Fiscal Control — destaque da linha da Equipe ao passar o mouse.
   Alteração visual isolada: não muda dados, regras, botões ou layout estrutural. */
(function(){
  'use strict';
  const STYLE_ID='fc-equipe-row-hover-style';
  function apply(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #page-equipe .table tbody tr{transition:background-color .14s ease,box-shadow .14s ease}
      #page-equipe .table tbody tr:hover{background:#f1f6ff;box-shadow:inset 3px 0 0 var(--blue)}
      #page-equipe .table tbody tr:hover td:first-child{font-weight:900}
    `;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
