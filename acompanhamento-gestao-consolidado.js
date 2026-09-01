/* Fiscal Control — Acompanhamento de gestão consolidado.
   Camada oficial para Acompanhamento geral + individual.
   Não altera o layout base, páginas operacionais ou permissões técnicas.
*/
(function(){
  'use strict';
  const TAXES=['ICMS','PIS/COFINS','ISS','SPED ICMS','Fronteiras'];
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v}catch(_){return f}};
  const stores=()=>{const v=read('fc_lojas',[]);return Array.isArray(v)?v:[]};
  const team=()=>{const v=read('fc_equipe',[]);return Array.isArray(v)?v:[]};
  const execs=()=>{const v=read('fc_execucoes',{});return v&&typeof v==='object'?v:{}};
  const alerts=()=>{const v=read('fc_alertas',[]);return Array.isArray(v)?v:[]};
  const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  function authUser(){return window.FC_AUTH?.user||window.FCAuth?.getUser?.()||null}
  function management(){
    const u=authUser();
    return !!u && (u.privilegio==='Desenvolvedor'||u.perfil==='Gerente'||u.perfil==='Coordenador'||u.perfil==='Gestão'||u.profile==='Gerente'||u.profile==='Coordenador'||u.profile==='Gestão');
  }
  function activeAnalysts(){return team().filter(p=>p&&String(p.funcao||'').trim().toLowerCase()==='analista'&&String(p.situacao||'').trim().toLowerCase()==='ativo')}
  function activeStores(){return stores().filter(l=>l&&l.ativo!==false)}
  function statusOf(l,t){
    const e=execs()[String(l.id)+'|'+t];
    if(!e||!e.status)return ['Pendente','yellowbg'];
    if(e.status==='Analisando')return ['Analisando','blue'];
    if(e.status==='Finalizada'||e.status==='Finalizado')return ['Finalizado','greenbg'];
    return [String(e.status),'gray'];
  }
  function summary(){
    const ss=activeStores(), aa=activeAnalysts(), ex=execs();
    let finalizadas=0, analisando=0, pendentes=0;
    ss.forEach(l=>TAXES.forEach(t=>{const s=statusOf(l,t)[0];if(s==='Finalizado')finalizadas++;else if(s==='Analisando')analisando++;else pendentes++}));
    const openAlerts=alerts().filter(a=>!a.lida).length;
    return {analysts:aa.length,stores:ss.length,finalizadas,analisando,pendentes,alerts:openAlerts,executions:finalizadas+analisando+pendentes,rawExecutions:Object.keys(ex).length};
  }
  function ensureStyle(){
    if(document.getElementById('fc-acomp-consolidado-style'))return;
    const s=document.createElement('style');s.id='fc-acomp-consolidado-style';s.textContent=`
      .fcg-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-bottom:14px}.fcg-kpi{border:1px solid #e1e7ef;border-radius:11px;padding:11px;background:#f8fafc}.fcg-kpi small{display:block;color:#687589;text-transform:uppercase;font-size:9px;font-weight:850}.fcg-kpi b{display:block;font-size:21px;margin-top:4px}.fcg-kpi span{display:block;color:#687589;font-size:10px;margin-top:2px}.fcg-alerts{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.fcg-alert{border:1px solid #f1dfb1;background:#fff9eb;border-radius:10px;padding:9px 11px;font-size:11px}.fcg-alert.red{border-color:#f2cece;background:#fff1f1}.fcg-analyst-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}.fcg-analyst-card{border:1px solid #e1e7ef;border-radius:12px;padding:12px;cursor:pointer;background:#fff;text-align:left;font:inherit;color:#172033}.fcg-analyst-card.active{border-color:#1769e0;box-shadow:0 0 0 2px #1769e01a}.fcg-analyst-card b{display:block}.fcg-analyst-card small{display:block;color:#687589;margin-top:3px}.fcg-empty{padding:22px;text-align:center;color:#687589}.fcg-modal{position:fixed;inset:0;background:#0c152a99;display:none;place-items:center;z-index:90;padding:14px}.fcg-modal.show{display:grid}.fcg-box{background:#fff;width:min(1250px,100%);max-height:92vh;overflow:auto;border-radius:17px;box-shadow:0 25px 80px #0004}.fcg-head{padding:16px 18px;border-bottom:1px solid #e1e7ef;display:flex;justify-content:space-between;align-items:center;gap:12px;position:sticky;top:0;background:#fff;z-index:2}.fcg-head h2{margin:0;font-size:19px}.fcg-sub{font-size:11px;color:#687589;margin-top:3px}.fcg-body{padding:16px 18px}.fcg-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}.fcg-search{border:1px solid #e1e7ef;border-radius:9px;padding:9px 11px;min-width:170px;font:inherit;background:#fff}.fcg-table-wrap{overflow:auto;border:1px solid #e1e7ef;border-radius:12px}.fcg-table{width:100%;border-collapse:collapse;min-width:850px}.fcg-table th,.fcg-table td{padding:10px 11px;border-bottom:1px solid #e1e7ef;text-align:left;white-space:nowrap}.fcg-table th{font-size:10px;text-transform:uppercase;color:#788498;background:#f8fafc}.fcg-table td{font-size:12px}.fcg-status{display:inline-flex;border-radius:99px;padding:5px 8px;font-size:10px;font-weight:850;white-space:nowrap}.fcg-status.yellowbg{background:#fff3d8;color:#966100}.fcg-status.blue{background:#eaf1ff;color:#1b5eb7}.fcg-status.greenbg{background:#e5f7f0;color:#087453}.fcg-status.gray{background:#edf0f4;color:#667286}@media(max-width:900px){.fcg-summary{grid-template-columns:repeat(3,1fr)}.fcg-analyst-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.fcg-summary{grid-template-columns:1fr 1fr}.fcg-analyst-grid{grid-template-columns:1fr}.fcg-head{align-items:flex-start}.fcg-box{max-height:95vh}}`;
    document.head.appendChild(s);
  }
  function ensureUI(){
    ensureStyle();
    const head=document.querySelector('#page-dashboard .head');
    if(head&&!document.getElementById('fcg-actions')){
      const actions=head.querySelector('.actions');
      if(actions){
        const wrap=document.createElement('div');wrap.id='fcg-actions';wrap.className='fc-acomp-actions';
        wrap.innerHTML='<button type="button" class="fc-acomp-btn primary" id="fcg-general-btn">Acompanhamento geral</button><button type="button" class="fc-acomp-btn individual" id="fcg-individual-btn">Acompanhamento individual</button>';
        actions.appendChild(wrap);
        wrap.querySelector('#fcg-general-btn').onclick=openGeneral;
        wrap.querySelector('#fcg-individual-btn').onclick=openIndividual;
      }
    }
    if(!document.getElementById('fcg-modal')){
      const m=document.createElement('div');m.id='fcg-modal';m.className='fcg-modal';
      m.innerHTML='<div class="fcg-box"><div class="fcg-head"><div><h2 id="fcg-title"></h2><div class="fcg-sub" id="fcg-sub"></div></div><button type="button" class="fc-acomp-btn" id="fcg-close">Fechar</button></div><div class="fcg-body" id="fcg-body"></div></div>';
      document.body.appendChild(m);m.querySelector('#fcg-close').onclick=close;m.addEventListener('click',e=>{if(e.target===m)close()});
    }
    const actions=document.getElementById('fcg-actions');
    if(actions)actions.style.display=management()?'flex':'none';
    const accessButton=document.getElementById('fc-management-access-btn');
    if(accessButton){ accessButton.onclick=()=>{ if(management()) openGeneral(); }; }
  }
  function summaryHTML(s){return `<div class="fcg-summary"><div class="fcg-kpi"><small>Analistas ativos</small><b>${s.analysts}</b><span>equipe operacional</span></div><div class="fcg-kpi"><small>Lojas ativas</small><b>${s.stores}</b><span>carteiras em execução</span></div><div class="fcg-kpi"><small>Finalizadas</small><b>${s.finalizadas}</b><span>execuções concluídas</span></div><div class="fcg-kpi"><small>Analisando</small><b>${s.analisando}</b><span>em andamento</span></div><div class="fcg-kpi"><small>Pendentes</small><b>${s.pendentes}</b><span>aguardando execução</span></div><div class="fcg-kpi"><small>Alertas</small><b>${s.alerts}</b><span>não lidos</span></div></div>`}
  function openGeneral(){
    if(!management())return;ensureUI();const s=summary();
    document.getElementById('fcg-title').textContent='Acompanhamento geral';
    document.getElementById('fcg-sub').textContent='Visão consolidada dos analistas ativos, lojas, execuções e alertas.';
    const body=document.getElementById('fcg-body');
    body.innerHTML=summaryHTML(s)+`<div id="fcg-alerts"></div><div class="fcg-toolbar"><div><b>Execução por loja</b><div class="fcg-sub">Status alimentado pelas execuções registradas em Apurações.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="fcg-search" class="fcg-search" placeholder="🔎 Buscar loja ou analista"><select id="fcg-analyst" class="fcg-search"><option value="">Todos os analistas</option></select><select id="fcg-uf" class="fcg-search"><option value="">Todas as UFs</option></select><select id="fcg-status" class="fcg-search"><option value="">Todos os status</option><option>Pendente</option><option>Analisando</option><option>Finalizado</option></select></div></div><div class="fcg-table-wrap"><table class="fcg-table"><thead><tr><th>Loja</th><th>Analista</th><th>ICMS</th><th>PIS/COFINS</th><th>ISS</th><th>SPED</th><th>Fronteiras</th></tr></thead><tbody id="fcg-body"></tbody></table></div>`;
    const alertBox=document.getElementById('fcg-alerts'), openAlerts=alerts().filter(a=>!a.lida).slice(-4).reverse();
    alertBox.innerHTML=openAlerts.length?'<div class="fcg-alerts">'+openAlerts.map(a=>`<div class="fcg-alert ${a.tipo==='red'?'red':''}"><b>${esc(a.titulo||'Alerta')}</b> — ${esc(a.msg||'')}</div>`).join('')+'</div>':'';
    const active=activeStores(), aa=activeAnalysts();
    const names=[...new Set(aa.map(x=>x.nome))].sort(),ufs=[...new Set(active.map(x=>x.uf).filter(Boolean))].sort();
    document.getElementById('fcg-analyst').innerHTML='<option value="">Todos os analistas</option>'+names.map(x=>`<option>${esc(x)}</option>`).join('');
    document.getElementById('fcg-uf').innerHTML='<option value="">Todas as UFs</option>'+ufs.map(x=>`<option>${esc(x)}</option>`).join('');
    const draw=()=>{const q=document.getElementById('fcg-search').value.toLowerCase().trim(),a=document.getElementById('fcg-analyst').value,u=document.getElementById('fcg-uf').value,st=document.getElementById('fcg-status').value;const arr=active.filter(l=>{if(q&&!`${l.numero??''} ${l.nome??''} ${l.analista??''} ${l.uf??''}`.toLowerCase().includes(q))return false;if(a&&l.analista!==a)return false;if(u&&l.uf!==u)return false;if(st&&!TAXES.some(t=>statusOf(l,t)[0]===st))return false;return true});document.getElementById('fcg-body').innerHTML=arr.map(l=>`<tr><td><b>${esc(l.numero)} · ${esc(l.nome)}</b><br><small style="color:#687589">${esc(l.uf)}</small></td><td>${esc(l.analista||'Sem carteira')}</td>${TAXES.map(t=>{const s=statusOf(l,t);return `<td><span class="fcg-status ${s[1]}">${s[0]}</span></td>`}).join('')}</tr>`).join('')||'<tr><td colspan="7" class="fcg-empty">Nenhuma loja encontrada.</td></tr>'};
    ['fcg-search','fcg-analyst','fcg-uf','fcg-status'].forEach(id=>{document.getElementById(id).oninput=draw;document.getElementById(id).onchange=draw});draw();document.getElementById('fcg-modal').classList.add('show');
  }
  function openIndividual(){
    if(!management())return;ensureUI();const analysts=activeAnalysts();
    document.getElementById('fcg-title').textContent='Acompanhamento individual';
    document.getElementById('fcg-sub').textContent='Selecione um analista ativo para acompanhar sua carteira e execução.';
    const body=document.getElementById('fcg-body');body.innerHTML='<div class="fcg-analyst-grid" id="fcg-analyst-grid"></div><div id="fcg-individual-content"></div>';
    const grid=document.getElementById('fcg-analyst-grid');
    analysts.forEach((a,i)=>{const ss=activeStores().filter(l=>l.analista===a.nome),c=document.createElement('button');c.type='button';c.className='fcg-analyst-card'+(i===0?' active':'');c.innerHTML=`<b>${esc(a.nome)}</b><small>${esc(a.nivel||'')} · ${ss.length} loja(s) · ${String(a.situacao)}</small>`;c.onclick=()=>{grid.querySelectorAll('.fcg-analyst-card').forEach(x=>x.classList.remove('active'));c.classList.add('active');drawIndividual(a)};grid.appendChild(c)});
    if(analysts.length)drawIndividual(analysts[0]);else document.getElementById('fcg-individual-content').innerHTML='<div class="fcg-empty">Nenhum analista ativo cadastrado.</div>';
    document.getElementById('fcg-modal').classList.add('show');
  }
  function drawIndividual(a){
    const ss=activeStores().filter(l=>l.analista===a.nome),done=ss.reduce((n,l)=>n+TAXES.filter(t=>statusOf(l,t)[0]==='Finalizado').length,0),total=ss.length*TAXES.length,pct=total?Math.round(done/total*100):0,al=alerts().filter(x=>!x.lida&&x.analista===a.nome);
    document.getElementById('fcg-individual-content').innerHTML=`<div class="fcg-toolbar"><div><b>${esc(a.nome)}</b><div class="fcg-sub">${esc(a.nivel||'')} · ${ss.length} loja(s) · ${done}/${total} execuções finalizadas · ${pct}% de conclusão</div></div></div>${al.length?'<div class="fcg-alerts">'+al.slice(-3).reverse().map(x=>`<div class="fcg-alert ${x.tipo==='red'?'red':''}"><b>${esc(x.titulo||'Alerta')}</b> — ${esc(x.msg||'')}</div>`).join('')+'</div>':''}<div class="fcg-table-wrap"><table class="fcg-table"><thead><tr><th>Loja</th><th>ICMS</th><th>PIS/COFINS</th><th>ISS</th><th>SPED</th><th>Fronteiras</th></tr></thead><tbody>${ss.map(l=>`<tr><td><b>${esc(l.numero)} · ${esc(l.nome)}</b><br><small style="color:#687589">${esc(l.uf)}</small></td>${TAXES.map(t=>{const s=statusOf(l,t);return `<td><span class="fcg-status ${s[1]}">${s[0]}</span></td>`}).join('')}</tr>`).join('')||'<tr><td colspan="6" class="fcg-empty">Nenhuma loja vinculada a este analista.</td></tr>'}</tbody></table></div>`;
  }
  function close(){const m=document.getElementById('fcg-modal');if(m)m.classList.remove('show')}
  function apply(){try{ensureUI();const a=document.getElementById('fcg-actions');if(a)a.style.display=management()?'flex':'none'}catch(_){} }
  function init(){apply();new MutationObserver(()=>setTimeout(apply,20)).observe(document.body,{childList:true,subtree:true});window.addEventListener('storage',()=>setTimeout(apply,20));document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.FiscalControlAcompanhamento={openGeneral,openIndividual,close,activeAnalysts,activeStores,canManage:management};
})();
