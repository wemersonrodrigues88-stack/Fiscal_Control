/* Fiscal Control — destaque visual da linha ao passar o mouse.
   Patch isolado: não altera dados, regras, botões ou layout estrutural.
   Atua somente na tabela de Cadastro de lojas. */
(function(){
  'use strict';
  function apply(){
    if(document.getElementById('fc-carteiras-row-hover-style'))return;
    const style=document.createElement('style');
    style.id='fc-carteiras-row-hover-style';
    style.textContent=`
      #page-carteiras .table tbody tr{
        transition:background-color .12s ease, box-shadow .12s ease;
      }
      #page-carteiras .table tbody tr:hover > td{
        background:#eef5ff;
      }
      #page-carteiras .table tbody tr:hover > td:first-child{
        box-shadow:inset 3px 0 0 #1769e0;
      }
      #page-carteiras .table tbody tr:hover{
        cursor:default;
      }
    `;
    document.head.appendChild(style);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
