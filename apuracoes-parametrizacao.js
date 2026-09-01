/* Fiscal Control — parametrização operacional das ações de Apurações.
   Fluxo: Pendente → Gerando Query → Analisando → Finalizada.
   Cronometra cada etapa separadamente e disponibiliza os tempos para a gestão. */
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
  function saveExecs(v){ const raw=JSON.stringify(v); localStorage.setItem(PARAMETROS.storageKey,raw); try{window.dispatchEvent(new StorageEvent('storage',{key:PARAMETROS.storageKey,newValue:raw}));}catch(e){} }
  function executionKey(lojaId,tax){ return String(lojaId)+'|'+String(tax); }
  function findStore(id){ return stores().find(l=>String(l.id)===String(id)); }
  function now(){ return Date.now(); }
  function elapsed(ms){
    ms=Math.max(0,Number(ms)||0);
    const sec=Math.floor(ms/1000),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return [h,m,s].map((v,i)=>i===0?String(v).padStart(2,'0'):String(v).padStart(2,'0')).join(':');
  }
  function currentElapsed(e){
    if(!e)return {query:Number(e?.queryElapsedMs)||0,analysis:Number(e?.analysisElapsedMs)||0};
    const t=now();
    return {
      query:(Number(e.queryElapsedMs)||0)+(e.status===PARAMETROS.statusGerandoQuery&&e.queryStartedAt?t-Number(e.queryStartedAt):0),
      analysis:(Number(e.analysisElapsedMs)||0)+(e.status===PARAMETROS.statusEmAnalise&&e.analysisStartedAt?t-Number(e.analysisStartedAt):0)
    };
  }
  function refresh(){ try{if(typeof window.renderApuracoes==='function')window.renderApuracoes();}catch(e){} try{if(typeof window.render==='function')window.render();}catch(e){} try{if(typeof window.ensureUI==='function')window.ensureUI();if(typeof window.applyProfile==='function')window.applyProfile();}catch(e){} }
  function notify(message){ try{if(typeof window.showToast==='function')window.showToast(message);else if(typeof window.toast==='function')window.toast(message);else{const el=document.getElementById('toast');if(el){el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800);}}}catch(e){} }

  function updateTiming(previous,status,timestamp){
    const e=Object.assign({},previous||{});
    const t=Number(timestamp)||now();
    if(status===PARAMETROS.statusGerandoQuery){
      if(previous?.status!==PARAMETROS.statusGerandoQuery){
        e.queryElapsedMs=0;
        e.analysisElapsedMs=0;
        e.queryStartedAt=t;
        e.analysisStartedAt=null;
        e.iniciadoEm=new Date(t).toISOString();
        e.finalizadoEm=null;
      }
    } else if(status===PARAMETROS.statusEmAnalise){
      if(previous?.status===PARAMETROS.statusGerandoQuery&&previous.queryStartedAt){
        e.queryElapsedMs=(Number(previous.queryElapsedMs)||0)+Math.max(0,t-Number(previous.queryStartedAt));
      }
      if(previous?.status!==PARAMETROS.statusEmAnalise){
        e.queryStartedAt=null;
        e.analysisStartedAt=t;
        e.iniciadoEm=e.iniciadoEm||new Date(t).toISOString();
        e.finalizadoEm=null;
      }
    } else if(status===PARAMETROS.statusFinalizado){
      if(previous?.status===PARAMETROS.statusGerandoQuery&&previous.queryStartedAt){
        e.queryElapsedMs=(Number(previous.queryElapsedMs)||0)+Math.max(0,t-Number(previous.queryStartedAt));
      }
      if(previous?.status===PARAMETROS.statusEmAnalise&&previous.analysisStartedAt){
        e.analysisElapsedMs=(Number(previous.analysisElapsedMs)||0)+Math.max(0,t-Number(previous.analysisStartedAt));
      }
      e.queryStartedAt=null;
      e.analysisStartedAt=null;
      e.finalizadoEm=new Date(t).toISOString();
      e.tempoTotalMs=(Number(e.queryElapsedMs)||0)+(Number(e.analysisElapsedMs)||0);
    }
    return e;
  }

  window.setStatus=function(lojaId,tax,status){
    const loja=findStore(lojaId);
    if(!loja||!allowedStore(loja))return notify('Acesso não permitido para esta loja.');
    const valid=[PARAMETROS.statusEmAnalise,PARAMETROS.statusGerandoQuery,PARAMETROS.statusFinalizado];
    if(!valid.includes(status))return notify('Status de apuração inválido.');
    const data=execs(),key=executionKey(loja.id,tax),anterior=data[key]||{};
    const timing=updateTiming(anterior,status,now());
    data[key]=Object.assign({},timing,{lojaId:loja.id,lojaNumero:loja.numero,lojaNome:loja.nome,analista:loja.analista||'',imposto:tax,status:status,atualizadoEm:new Date().toISOString(),atualizadoPor:currentUser()});
    saveExecs(data);
    refresh();
    renderTimers();
    renderManagementTiming();
    notify(loja.nome+' · '+tax+' → '+status);
  };

  window.finalizar=function(lojaId,tax){ window.setStatus(lojaId,tax,PARAMETROS.statusFinalizado); };

  function identifyStoreFromButton(button){
    const store=button?.closest?.('.store'); if(!store)return null;
    const direct=store.querySelector('[data-op-analysis],[data-op-final]');
    if(direct?.dataset.opAnalysis)return {id:Number(direct.dataset.opAnalysis),tax:direct.dataset.opTax||''};
    if(direct?.dataset.opFinal)return {id:Number(direct.dataset.opFinal),tax:direct.dataset.opTax||''};
    const source=[...store.querySelectorAll('.rowBtns button')].find(b=>b!==button);
    const onclick=source?.getAttribute('onclick')||'';
    const m=onclick.match(/(?:setStatus|finalizar)\s*\(\s*([0-9]+)\s*,\s*['\"]([^'\"]+)['\"]/);
    return m?{id:Number(m[1]),tax:m[2]}:null;
  }

  document.addEventListener('fc:gerar-query',function(e){
    const d=e.detail||{},button=d.botao,tax=d.imposto;
    const store=button&&button.closest?button.closest('.store'):null;
    if(!store||!['ICMS','PIS/COFINS'].includes(String(tax).trim().toUpperCase()))return;
    const info=identifyStoreFromButton(button);
    if(!info)return notify('Não foi possível identificar a loja desta apuração.');
    window.setStatus(info.id,info.tax||tax,PARAMETROS.statusGerandoQuery);
  });

  document.addEventListener('click',function(e){
    const btn=e.target.closest&&e.target.closest('#page-apuracoes .rowBtns button'); if(!btn)return;
    const txt=(btn.textContent||'').trim().toLowerCase(); if(txt!=='analisando'&&txt!=='finalizar'&&txt!=='gerando query')return;
    const store=btn.closest('.store'); if(!store||management())return;
    const user=currentUser(),state=(store.querySelector('.state')?.textContent||'');
    if(!state.includes('· '+user)){e.preventDefault();e.stopImmediatePropagation();notify('Você só pode acompanhar lojas da sua carteira.');}
  },true);

  function findTaxFromCard(card){
    const h=card?.querySelector('h2,h3,h4,.cardTitle strong,.cardTitle b');
    return String(h?.textContent||'').trim().toUpperCase().replace(/\s+/g,' ');
  }

  function findStoreInfo(storeEl){
    const btns=[...storeEl.querySelectorAll('.rowBtns button')];
    for(const b of btns){
      const d=b.dataset||{};
      if(d.opAnalysis)return {id:Number(d.opAnalysis),tax:d.opTax||''};
      if(d.opFinal)return {id:Number(d.opFinal),tax:d.opTax||''};
      const m=(b.getAttribute('onclick')||'').match(/(?:setStatus|finalizar)\s*\(\s*([0-9]+)\s*,\s*['\"]([^'\"]+)['\"]/);
      if(m)return {id:Number(m[1]),tax:m[2]};
    }
    return null;
  }

  function timerMarkup(e){
    if(!e)return '<span class="fc-exec-clock fc-exec-pending">⏱ 00:00:00</span>';
    const t=currentElapsed(e),total=t.query+t.analysis;
    if(e.status===PARAMETROS.statusGerandoQuery)return '<span class="fc-exec-clock fc-exec-running">⏱ Query '+elapsed(t.query)+'</span>';
    if(e.status===PARAMETROS.statusEmAnalise)return '<span class="fc-exec-clock fc-exec-running">⏱ Analisando '+elapsed(t.analysis)+'</span>';
    if(e.status===PARAMETROS.statusFinalizado)return '<span class="fc-exec-clock fc-exec-done">⏱ Total '+elapsed(total)+'</span>';
    return '<span class="fc-exec-clock fc-exec-pending">⏱ 00:00:00</span>';
  }

  function injectStyle(){
    if(document.getElementById('fc-exec-timer-style'))return;
    const s=document.createElement('style');s.id='fc-exec-timer-style';s.textContent=`
      .fc-exec-clock{display:inline-flex;align-items:center;margin-left:7px;padding:3px 7px;border-radius:99px;font-size:9px;font-weight:850;white-space:nowrap;vertical-align:middle}
      .fc-exec-running{background:#eaf1ff;color:#185ebc}
      .fc-exec-done{background:#e5f7f0;color:#087453}
      .fc-exec-pending{background:#edf0f4;color:#667286}
      .fc-time-panel{margin-top:12px;border-top:1px solid #e1e7ef;padding-top:12px}
      .fc-time-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
      .fc-time-box{border:1px solid #e1e7ef;border-radius:10px;padding:9px;background:#fff}
      .fc-time-box small{display:block;color:#687589;font-size:9px;font-weight:800;text-transform:uppercase}
      .fc-time-box b{display:block;margin-top:4px;font-size:15px}
      .fc-time-total{font-size:11px;color:#687589;margin-top:8px}
      @media(max-width:680px){.fc-time-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function renderTimers(){
    injectStyle();
    const data=execs();
    document.querySelectorAll('#page-apuracoes .tax .store').forEach(storeEl=>{
      const info=findStoreInfo(storeEl); if(!info||!info.id)return;
      const card=storeEl.closest('.tax'),tax=findTaxFromCard(card)||info.tax;
      const key=executionKey(info.id,info.tax||tax),e=data[key];
      let clock=storeEl.querySelector('.fc-exec-clock');
      if(!clock){
        const status=storeEl.querySelector('.status');
        if(status)status.insertAdjacentHTML('afterend',timerMarkup(e));
      }else clock.outerHTML=timerMarkup(e);
    });
  }

  function renderManagementTiming(){
    const modal=document.getElementById('fc-acomp-modal');
    if(!modal||!modal.classList.contains('show'))return;
    const title=(document.getElementById('fc-acomp-title')?.textContent||'').trim();
    if(title!=='Acompanhamento individual')return;
    const card=document.querySelector('#fc-analyst-grid .fc-analyst-card.active');
    const analystName=(card?.querySelector('b')?.textContent||'').trim();
    if(!analystName)return;
    const data=execs();
    const rows=Object.values(data).filter(e=>e&&String(e.analista||'').trim()===analystName);
    let query=0,analysis=0,total=0,running=0;
    rows.forEach(e=>{const t=currentElapsed(e);query+=t.query;analysis+=t.analysis;total+=t.query+t.analysis;if(e.status!==PARAMETROS.statusFinalizado)running+=t.query+t.analysis});
    let panel=document.getElementById('fc-management-time-panel');
    if(!panel){
      panel=document.createElement('div');panel.id='fc-management-time-panel';panel.className='fc-time-panel';
      const content=document.getElementById('fc-individual-content');
      if(content)content.insertBefore(panel,content.firstChild);
    }
    panel.innerHTML='<b>Tempo de execução</b><div class="fc-time-grid"><div class="fc-time-box"><small>Gerando Query</small><b>'+elapsed(query)+'</b></div><div class="fc-time-box"><small>Analisando</small><b>'+elapsed(analysis)+'</b></div><div class="fc-time-box"><small>Total</small><b>'+elapsed(total)+'</b></div></div><div class="fc-time-total">'+(running?'⏱ '+elapsed(running)+' em execução neste momento.':'✓ Nenhuma apuração em execução.')+'</div>';
  }

  function tick(){renderTimers();renderManagementTiming();}
  function init(){
    injectStyle();
    tick();
    setInterval(tick,1000);
    new MutationObserver(()=>{renderTimers();renderManagementTiming();}).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
