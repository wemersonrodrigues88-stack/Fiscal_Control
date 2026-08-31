/* Perfil: botão Abrir apurações somente para analistas. Mantém o restante do dashboard intacto. */
(function(){
  function applyProfileRule(){
    const usuario=document.getElementById('usuario');
    const btn=[...document.querySelectorAll('.actions .btn.primary')].find(b=>b.textContent.trim().toLowerCase().includes('abrir apurações'));
    if(!usuario||!btn)return;
    const nome=usuario.value||'';
    const equipe=window.equipe||[];
    const pessoa=equipe.find(e=>e.nome===nome);
    const isAnalista=!!pessoa&&pessoa.funcao==='Analista';
    btn.style.display=isAnalista?'':'none';
  }
  document.addEventListener('DOMContentLoaded',applyProfileRule);
  const originalRender=window.render;
  if(typeof originalRender==='function'){
    window.render=function(){const r=originalRender.apply(this,arguments);applyProfileRule();return r;};
  }
  setInterval(applyProfileRule,500);
})();
