/* Fiscal Control — parametrização operacional das ações de Apurações.
   Mantém o layout existente e torna Analisando/Finalizar/Gerando Query persistentes e sincronizados. */
(function(){
  'use strict';

  const PARAMETROS = window.FC_APURACOES_PARAMETROS = {
    statusEmAnalise: 'Analisando',
    statusGerandoQuery: 'Gerando Query',
    statusFinalizado: 'Finalizada',
    storageKey: 'fc_execucoes'
  };

  function readJSON(key, fallback){
    try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; }
    catch(e){ return fallback; }
  }

  function currentUser(){ return (document.getElementById('usuario')?.value || 'Daniela').trim(); }
  function team(){ const v=readJSON('fc_equipe',[]); return Array.isArray(v)?v:[]; }
  function stores(){ const v=readJSON('fc_lojas',[]); return Array.isArray(v)?v:[]; }
  function management(){ const p=team().find(x=>x&&x.nome===currentUser()); return currentUser()==='Daniela'||currentUser()==='Leonardo'||!!p&&(p.funcao==='Gerente'||p.funcao==='Coordenador'); }
  function allowedStore(loja){ if(!loja)return false; if(management())return true; const p=team().find(x=>x&&x.nome===currentUser()); return !!p&&p.funcao==='Analista'&&String(loja.analista||'').trim()===currentUser(); }
  function execs(){ const v=readJSON(PARAMETROS.storageKey,{}); return v&&typeof v==='object'&&!Array.isArray(v)?v:{}; }
  function saveExecs(v){ localStorage.setItem(PARAMETROS.storageKey,JSON.stringify(v)); try{window.dispatchEvent(new StorageEvent('storage',{key:PARAMETROS.storageKey,newValue:JSON.stringify(v)}));}catch(e){} }
  function executionKey(lojaId,tax){ return String(lojaId)+'|'+String(tax); }
  function findStore(id){ return stores().find(l=>String(l.id)===String(id)); }
  function refresh(){ try{if(typeof window.renderApuracoes==='function')window.renderApuracoes();}catch(e){} try{if(typeof window.render==='function')window.render();}catch(e){} try{if(typeof window.ensureUI==='function')window.ensureUI();if(typeof window.applyProfile==='function')window.applyProfile();}catch(e){} }
  function notify(message){ try{if(typeof window.showToast==='function')window.showToast(message);else if(typeof window.toast==='function')window.toast(message);else{const el=document.getElementById('toast');if(el){el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800);}}}catch(e){} }

  window.setStatus=function(lojaId,tax,status){
    const loja=findStore(lojaId);
    if(!loja||!allowedStore(loja))return notify('Acesso não permitido para esta loja.');
    const valid=[PARAMETROS.statusEmAnalise,PARAMETROS.statusGerandoQuery,PARAMETROS.statusFinalizado];
    if(!valid.includes(status))return notify('Status de apuração inválido.');
    const data=execs(),key=executionKey(loja.id,tax),anterior=data[key]||{};
    data[key]=Object.assign({},anterior,{lojaId:loja.id,lojaNumero:loja.numero,lojaNome:loja.nome,analista:loja.analista||'',imposto:tax,status:status,atualizadoEm:new Date().toISOString(),atualizadoPor:currentUser()});
    saveExecs(data); refresh(); notify(loja.nome+' · '+tax+' → '+status);
  };
  window.finalizar=function(lojaId,tax){ window.setStatus(lojaId,tax,PARAMETROS.statusFinalizado); };

  document.addEventListener('fc:gerar-query',function(e){
    const d=e.detail||{},button=d.botao,tax=d.imposto;
    const store=button&&button.closest?button.closest('.store'):null;
    if(!store||!['ICMS','PIS/COFINS'].includes(String(tax).trim().toUpperCase()))return;
    const source=[...store.querySelectorAll('.rowBtns button')].find(b=>b!==button&&/setStatus\s*\(\s*([0-9]+)\s*,\s*['\"]([^'\"]+)['\"]/.test(b.getAttribute('onclick')||''));
    const m=source&&(source.getAttribute('onclick')||'').match(/setStatus\s*\(\s*([0-9]+)\s*,\s*['\"]([^'\"]+)['\"]/);
    if(!m)return notify('Não foi possível identificar a loja desta apuração.');
    if(typeof window.setStatus==='function')window.setStatus(Number(m[1]),m[2],PARAMETROS.statusGerandoQuery);
  });

  document.addEventListener('click',function(e){
    const btn=e.target.closest&&e.target.closest('#page-apuracoes .rowBtns button'); if(!btn)return;
    const txt=(btn.textContent||'').trim().toLowerCase(); if(txt!=='analisando'&&txt!=='finalizar'&&txt!=='gerando query')return;
    const store=btn.closest('.store'); if(!store||management())return;
    const user=currentUser(),state=(store.querySelector('.state')?.textContent||'');
    if(!state.includes('· '+user)){e.preventDefault();e.stopImmediatePropagation();notify('Você só pode acompanhar lojas da sua carteira.');}
  },true);
})();
