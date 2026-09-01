/* Fiscal Control — Acompanhamento do gestor.
   Adiciona somente os comandos de Acompanhamento geral e individual.
   Não altera o layout, regras operacionais ou permissões existentes. */
(function(){
  'use strict';

  const read=(key,fallback)=>{
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value==null?fallback:value;
    }catch(_){return fallback;}
  };
  const esc=value=>String(value??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));

  function isManager(){
    const auth=window.FC_AUTH?.user;
    if(auth?.perfil==='Gerente'||auth?.perfil==='Coordenador')return true;
    if(window.FC_AUTH?.managementPreview===true)return true;
    return false;
  }

  function team(){
    return read('fc_equipe',[]).filter(p=>p&&String(p.funcao||'').trim().toLowerCase()==='analista');
  }
  function activeTeam(){
    return team().filter(p=>String(p.situacao||'Ativo').trim().toLowerCase()==='ativo');
  }
  function stores(){
    return read('fc_lojas',[]).filter(l=>l&&l.ativo!==false);
  }
  function execs(){
    const v=read('fc_execucoes',{});
    return v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  }
  function alerts(){return read('fc_alertas',[]);}

  function analystStats(name){
    const ss=stores().filter(l=>String(l.analista||'').trim()===String(name).trim());
    const e=execs();
    const own=Object.values(e).filter(x=>x&&String(x.analista||'').trim()===String(name).trim());
    const done=own.filter(x=>x.status==='Finalizada'||x.status==='Finalizado').length;
    const analyzing=own.filter(x=>x.status==='Analisando').length;
    const pending=own.filter(x=>x.status==='Pendente').length;
    const al=alerts().filter(x=>String(x.analista||'').trim()===String(name).trim()&&!x.lida).length;
    return {stores:ss.length,done,analyzing,pending,alerts:al};
  }

  function injectStyles(){
    if(document.getElementById('fc-manager-acomp-style'))return;
    const style=document.createElement('style');
    style.id='fc-manager-acomp-style';
    style.textContent=`
      #fc-manager-acomp-actions{display:flex;gap:6px;align-items:center}
      #fc-manager-acomp-actions .btn{white-space:nowrap}
      #fc-manager-acomp-modal{position:fixed;inset:0;background:#0c152a99;display:none;place-items:center;z-index:10000;padding:14px}
      #fc-manager-acomp-modal.show{display:grid}
      .fc-ma-card{background:#fff;width:min(900px,100%);max-height:88vh;overflow:auto;border-radius:17px;box-shadow:0 20px 70px #0004}
      .fc-ma-head{padding:15px 17px;border-bottom:1px solid #e1e7ef;display:flex;justify-content:space-between;align-items:center;gap:10px}
      .fc-ma-body{padding:17px}
      .fc-ma-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
      .fc-ma-kpi{border:1px solid #e1e7ef;border-radius:11px;padding:12px}
      .fc-ma-kpi small{display:block;color:#687589;font-size:10px;text-transform:uppercase;font-weight:800}
      .fc-ma-kpi b{display:block;font-size:22px;margin-top:4px}
      .fc-ma-table{width:100%;border-collapse:collapse}
      .fc-ma-table th,.fc-ma-table td{padding:9px;border-bottom:1px solid #e1e7ef;text-align:left;font-size:11px}
      .fc-ma-table th{font-size:9px;color:#788498;text-transform:uppercase;background:#f8fafc}
      .fc-ma-select{width:100%;margin-bottom:13px}
      @media(max-width:680px){.fc-ma-grid{grid-template-columns:1fr 1fr}.fc-ma-table{font-size:10px}.fc-ma-table th:nth-child(4),.fc-ma-table td:nth-child(4){display:none}}
    `;
    document.head.appendChild(style);
  }

  function close(){document.getElementById('fc-manager-acomp-modal')?.remove();}

  function modal(title,body){
    close();
    const root=document.createElement('div');
    root.id='fc-manager-acomp-modal';
    root.className='show';
    root.innerHTML=`<div class="fc-ma-card"><div class="fc-ma-head"><b>${esc(title)}</b><button type="button" class="btn" id="fc-ma-close">×</button></div><div class="fc-ma-body">${body}</div></div>`;
    document.body.appendChild(root);
    root.querySelector('#fc-ma-close').onclick=close;
    root.addEventListener('click',e=>{if(e.target===root)close();});
    return root;
  }

  function openGeneral(){
    const analysts=activeTeam();
    const stats=analysts.map(a=>({a,s:analystStats(a.nome)}));
    const totalStores=stats.reduce((n,x)=>n+x.s.stores,0);
    const totalDone=stats.reduce((n,x)=>n+x.s.done,0);
    const totalAlerts=stats.reduce((n,x)=>n+x.s.alerts,0);
    const rows=stats.map(x=>`<tr><td><b>${esc(x.a.nome)}</b></td><td>${x.s.stores}</td><td>${x.s.done}</td><td>${x.s.analyzing}</td><td>${x.s.pending}</td><td>${x.s.alerts}</td><td>${esc(x.a.situacao||'Ativo')}</td></tr>`).join('');
    modal('Acompanhamento geral',`
      <div class="fc-ma-grid">
        <div class="fc-ma-kpi"><small>Analistas ativos</small><b>${analysts.length}</b></div>
        <div class="fc-ma-kpi"><small>Lojas nas carteiras</small><b>${totalStores}</b></div>
        <div class="fc-ma-kpi"><small>Execuções finalizadas</small><b>${totalDone}</b></div>
        <div class="fc-ma-kpi"><small>Alertas</small><b>${totalAlerts}</b></div>
      </div>
      <table class="fc-ma-table"><thead><tr><th>Analista</th><th>Lojas</th><th>Finalizado</th><th>Analisando</th><th>Pendente</th><th>Alertas</th><th>Situação</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Nenhum analista ativo cadastrado.</td></tr>'}</tbody></table>
    `);
  }

  function openIndividual(){
    const analysts=activeTeam();
    const first=analysts[0]?.nome||'';
    const options=analysts.map(a=>`<option value="${esc(a.nome)}">${esc(a.nome)}</option>`).join('');
    const root=modal('Acompanhamento individual',`
      <label style="display:block;font-size:10px;font-weight:850;margin-bottom:5px">ANALISTA</label>
      <select id="fc-ma-analyst" class="fc-ma-select">${options||'<option value="">Nenhum analista ativo</option>'}</select>
      <div id="fc-ma-individual-content"></div>
    `);
    const select=root.querySelector('#fc-ma-analyst');
    if(first)select.value=first;
    const renderOne=()=>{
      const name=select.value;
      if(!name){root.querySelector('#fc-ma-individual-content').innerHTML='<div class="alert blue">Nenhum analista ativo cadastrado.</div>';return;}
      const s=analystStats(name);
      root.querySelector('#fc-ma-individual-content').innerHTML=`
        <div class="fc-ma-grid">
          <div class="fc-ma-kpi"><small>Lojas</small><b>${s.stores}</b></div>
          <div class="fc-ma-kpi"><small>Finalizadas</small><b>${s.done}</b></div>
          <div class="fc-ma-kpi"><small>Analisando</small><b>${s.analyzing}</b></div>
          <div class="fc-ma-kpi"><small>Alertas</small><b>${s.alerts}</b></div>
        </div>
        <div class="alert blue"><b>${esc(name)}</b> — acompanhamento individual da carteira ativa.</div>
      `;
    };
    select.onchange=renderOne;
    renderOne();
  }

  function install(){
    if(!isManager()){
      document.getElementById('fc-manager-acomp-actions')?.remove();
      return;
    }
    if(document.getElementById('fc-manager-acomp-actions'))return;
    const host=document.querySelector('.persona');
    if(!host)return;
    const wrap=document.createElement('div');
    wrap.id='fc-manager-acomp-actions';
    wrap.innerHTML='<button type="button" class="btn">Acompanhamento geral</button><button type="button" class="btn">Acompanhamento individual</button>';
    host.insertBefore(wrap,host.firstChild);
    const buttons=wrap.querySelectorAll('button');
    buttons[0].onclick=openGeneral;
    buttons[1].onclick=openIndividual;
  }

  function init(){injectStyles();install();setTimeout(install,300);setTimeout(install,1000);setInterval(install,1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
