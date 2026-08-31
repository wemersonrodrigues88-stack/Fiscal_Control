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
  }catch(err){console.error('Fiscal Control: erro ao carregar dados',err)}
}
function renderEquipeCompleta(){
  const table=document.getElementById('teamTable');
  if(!table)return;
  const equipe=window.equipe||[];
  const lojas=window.lojas||[];
  const esc=window.esc||((s)=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])));
  table.innerHTML=equipe.map(e=>{
    const carteira=e.funcao==='Analista'?lojas.filter(l=>l&&l.analista===e.nome&&l.ativo!==false).length:'—';
    const status=e.situacao||'Ativo';
    return `<tr><td><b>${esc(e.nome)}</b></td><td>${esc(e.funcao)}</td><td>${esc(e.nivel)}</td><td>${carteira}</td><td><span class="badge ${status==='Ativo'?'greenbg':'yellowbg'}">${esc(status)}</span></td><td>${e.nome==='Daniela'||e.nome==='Leonardo'?'—':'<button class="btn" type="button" data-fc-member="'+e.id+'">Alterar situação</button>'}</td></tr>`;
  }).join('')||'<tr><td colspan="6" style="padding:20px;text-align:center">Nenhum colaborador cadastrado.</td></tr>';
  table.querySelectorAll('[data-fc-member]').forEach(btn=>btn.addEventListener('click',()=>{if(typeof window.removeMember==='function')window.removeMember(Number(btn.dataset.fcMember))}));
}
function syncStatusViews(){
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
function signature(){
  try{return ['fc_equipe','fc_lojas','fc_prazos_v2','fc_execucoes','fc_alertas'].map(k=>localStorage.getItem(k)||'').join('|')}catch(e){return ''}
}
let lastSignature='';
let refreshing=false;
function refreshTela(){
  if(refreshing)return;
  refreshing=true;
  try{
    loadData();
    if(typeof window.render==='function')window.render();
    renderEquipeCompleta();
    syncStatusViews();
  }catch(err){console.error('Fiscal Control: erro na atualização automática',err)}
  finally{setTimeout(()=>{refreshing=false},80)}
}
function watchStorage(){
  lastSignature=signature();
  window.addEventListener('storage',function(ev){
    if(ev.key&&ev.key.indexOf('fc_')===0)setTimeout(refreshTela,20);
  });
  const originalSet=localStorage.setItem.bind(localStorage);
  if(!window.__fcSetWrapped){
    localStorage.setItem=function(key,value){
      const result=originalSet(key,value);
      if(key&&key.indexOf('fc_')===0)setTimeout(refreshTela,20);
      return result;
    };
    window.__fcSetWrapped=true;
  }
  setInterval(function(){
    const now=signature();
    if(now!==lastSignature){lastSignature=now;refreshTela()}
    syncStatusViews();
  },250);
}
function watchAllButtons(){
  if(window.__fcAllButtonsAutoRefresh)return;
  window.__fcAllButtonsAutoRefresh=true;
  document.addEventListener('click',function(ev){
    const btn=ev.target&&ev.target.closest?ev.target.closest('button'):null;
    if(btn)setTimeout(refreshTela,50);
  },true);
}
function init(){
  loadData();
  watchStorage();
  watchAllButtons();
  renderEquipeCompleta();
  syncStatusViews();
  if(typeof window.render==='function'&&!window.__fcRenderWrapped){
    const original=window.render;
    window.render=function(){
      loadData();
      const result=original.apply(this,arguments);
      setTimeout(()=>{renderEquipeCompleta();syncStatusViews()},0);
      return result;
    };
    window.__fcRenderWrapped=true;
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
