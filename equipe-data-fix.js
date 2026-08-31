(function(){
'use strict';
function loadData(){
  try{
    const e=JSON.parse(localStorage.getItem('fc_equipe')||'[]');
    const l=JSON.parse(localStorage.getItem('fc_lojas')||'[]');
    const x=JSON.parse(localStorage.getItem('fc_execucoes')||'{}');
    if(Array.isArray(e)) window.equipe=e;
    if(Array.isArray(l)) window.lojas=l;
    if(x&&typeof x==='object') window.execucoes=x;
  }catch(err){console.error('Fiscal Control: erro ao carregar equipe',err)}
}
function renderEquipeCompleta(){
  loadData();
  const table=document.getElementById('teamTable');
  if(!table) return;
  const equipe=window.equipe||[];
  const lojas=window.lojas||[];
  const esc=window.esc||((s)=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])));
  const rows=equipe.map(e=>{
    const carteira=e.funcao==='Analista'?lojas.filter(l=>l&&l.analista===e.nome&&l.ativo!==false).length:'—';
    const status=e.situacao||'Ativo';
    return `<tr><td><b>${esc(e.nome)}</b></td><td>${esc(e.funcao)}</td><td>${esc(e.nivel)}</td><td>${carteira}</td><td><span class="badge ${status==='Ativo'?'greenbg':'yellowbg'}">${esc(status)}</span></td><td>${e.nome==='Daniela'||e.nome==='Leonardo'?'—':'<button class="btn" type="button" data-fc-member="'+e.id+'">Alterar situação</button>'}</td></tr>`;
  }).join('');
  table.innerHTML=rows||'<tr><td colspan="6" style="padding:20px;text-align:center">Nenhum colaborador cadastrado.</td></tr>';
  table.querySelectorAll('[data-fc-member]').forEach(btn=>btn.addEventListener('click',()=>{if(typeof window.removeMember==='function')window.removeMember(Number(btn.dataset.fcMember))}));
}
function init(){
  loadData();
  renderEquipeCompleta();
  document.querySelectorAll('.nav button[data-page="equipe"]').forEach(btn=>{
    if(btn.__fcTeamFix)return;
    const old=btn.onclick;
    btn.onclick=function(ev){if(typeof old==='function')old.call(this,ev);setTimeout(renderEquipeCompleta,0)};
    btn.__fcTeamFix=true;
  });
  if(typeof window.render==='function'&&!window.__fcTeamDataFix){
    const original=window.render;
    window.render=function(){loadData();original.apply(this,arguments);setTimeout(renderEquipeCompleta,0)};
    window.__fcTeamDataFix=true;
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();