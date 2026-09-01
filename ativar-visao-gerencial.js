/* Ativador da visão gerencial sem alterar o layout-base. */
(function(){
'use strict';
function activate(){
  if(!document.getElementById('visao-gerencial-script')){
    const s=document.createElement('script');s.id='visao-gerencial-script';s.src='visao-gerencial.js?v=1';document.body.appendChild(s);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate);else activate();
})();
