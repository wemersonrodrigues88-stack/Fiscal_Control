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
function escStatus(v){return typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function syncStatusViews(){
  loadData();
  const equipe=window.equipe||[];
  document.querySelectorAll('.fc-analyst-card').forEach(card=>{
    const name=(card.querySelector('b')?.textContent||'').trim();
    const person=equipe.find(e=>e.nome===name);
    if(!person)return;
    let badge=card.querySelector('.fc-team-status');
    if(!badge){badge=document.createElement('span');badge.className='fc-team-status badge';badge.style.marginTop='6px';card.appendChild(badge)}
    const status=person.situacao||'Ativo';
    badge.textContent=status;
    badge.className='fc-team-status badge '+(status==='Ativo'?'greenbg':status==='Férias'?'yellowbg':'gray');
  });
}
function teamSignature(){
  try{return localStorage.getItem('fc_equipe')||''}catch(e){return ''}
}
function refreshAfterTeamChange(){
  loadData();
  renderEquipeCompleta();
  syncStatusViews();
  if(typeof window.render==='function'&&!window.__fcStatusRefreshing){
    window.__fcStatusRefreshing=true;
    try{window.render()}finally{setTimeout(()=>{window.__fcStatusRefreshing=false;syncStatusViews()},0)}
  }
}
function watchTeamChanges(){
  let last=teamSignature();
  window.addEventListener('storage',e=>{if(e.key==='fc_equipe'){last=teamSignature();refreshAfterTeamChange()}});
  const originalSet=localStorage.setItem.bind(localStorage);
  if(!localStorage.__fcStatusSetWrapped){
    localStorage.setItem=function(key,value){
      const result=originalSet(key,value);
      if(key==='fc_equipe'&&value!==last){last=value;setTimeout(refreshAfterTeamChange,0)}
      return result;
    };
    try{localStorage.__fcStatusSetWrapped=true}catch(e){}
  }
  setInterval(()=>{const now=teamSignature();if(now!==last){last=now;refreshAfterTeamChange()}syncStatusViews()},300);
}
function refreshAfterButton(){
  setTimeout(()=>{
    try{
      loadData();
      if(typeof window.render==='function')window.render();
      renderEquipeCompleta();
      syncStatusViews();
    }catch(err){console.error('Fiscal Control: erro na atualização automática',err)}
  },0);
}
function watchAllButtons(){
  if(window.__fcAllButtonsAutoRefresh)return;
  window.__fcAllButtonsAutoRefresh=true;
  document.addEventListener('click',function(ev){
    const btn=ev.target&&ev.target.closest?ev.target.closest('button'):null;
    if(btn)refreshAfterButton();
  },true);
}
function init(){
  loadData();
  renderEquipeCompleta();
  syncStatusViews();
  watchTeamChanges();
  watchAllButtons();
  document.querySelectorAll('.nav button[data-page="equipe"]').forEach(btn=>{
    if(btn.__fcTeamFix)return;
    const old=btn.onclick;
    btn.onclick=function(ev){if(typeof old==='function')old.call(this,ev);setTimeout(()=>{renderEquipeCompleta();syncStatusViews()},0)};
    btn.__fcTeamFix=true;
  });
  if(typeof window.render==='function'&&!window.__fcTeamDataFix){
    const original=window.render;
    window.render=function(){loadData();original.apply(this,arguments);setTimeout(()=>{renderEquipeCompleta();syncStatusViews()},0)};
    window.__fcTeamDataFix=true;
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
