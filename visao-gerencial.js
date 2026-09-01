/* Fiscal Control — Visão gerencial executiva
   Camada complementar: não altera o layout-base das telas operacionais. */
(function(){
'use strict';
const TAXES=['ICMS','PIS/COFINS','ISS','SPED ICMS','Fronteiras'];
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const stores=()=>{const v=read('fc_lojas');return Array.isArray(v)?v.filter(x=>x&&x.ativo!==false):[]};
const team=()=>{const v=read('fc_equipe');return Array.isArray(v)?v:[]};
const execs=()=>{const v=read('fc_execucoes');return v&&typeof v==='object'?v:{}};
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function status(l,t){const e=execs()[l.id+'|'+t];return e?.status||'Pendente'}
function render(){
 const root=document.getElementById('page-dashboard');if(!root)return;
 const user=(document.getElementById('usuario')?.value||'').trim();
 const management=user==='Daniela'||user==='Leonardo'||(window.FC_ACCESS?.isDeveloper?.()&&window.FC_AUTH?.managementPreview===true);
 let old=document.getElementById('fc-gerencial-view');if(!management){if(old)old.remove();return}
 if(old)old.remove();
 const ss=stores(), people=team().filter(x=>x&&x.funcao==='Analista');
 const total=ss.length, totalOps=total*TAXES.length;
 let done=0, analysing=0;
 ss.forEach(l=>TAXES.forEach(t=>{const s=status(l,t);if(s==='Finalizada'||s==='Finalizado')done++;else if(s==='Analisando')analysing++}));
 const pct=totalOps?Math.round(done/totalOps*100):0, pending=totalOps-done-analysing;
 const analystRows=people.map(a=>{const own=ss.filter(l=>l.analista===a.nome);let d=0,p=0;own.forEach(l=>TAXES.forEach(t=>{const s=status(l,t);if(s==='Finalizada'||s==='Finalizado')d++;else p++}));return {a,own,d,p,pct:own.length*TAXES.length?Math.round(d/(own.length*TAXES.length)*100):0}});
 const critical=ss.flatMap(l=>TAXES.filter(t=>status(l,t)==='Pendente').map(t=>({l,t})));
 old=document.createElement('div');old.id='fc-gerencial-view';
 old.innerHTML=`<style>
#fc-gerencial-view{margin-bottom:18px}.fcg-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:14px}.fcg-head h2{margin:0;font-size:20px}.fcg-sub{color:#687589;font-size:12px;margin-top:4px}.fcg-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}.fcg-kpi{background:#fff;border:1px solid #e1e7ef;border-radius:14px;padding:14px;box-shadow:0 5px 18px #1020400b}.fcg-kpi small{display:block;text-transform:uppercase;font-size:9px;font-weight:800;color:#778399}.fcg-kpi b{display:block;font-size:25px;margin-top:7px}.fcg-kpi span{font-size:10px;color:#687589}.fcg-progress{height:8px;background:#edf1f5;border-radius:99px;overflow:hidden;margin-top:9px}.fcg-progress i{display:block;height:100%;background:#1769e0;border-radius:99px}.fcg-cols{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}.fcg-card{background:#fff;border:1px solid #e1e7ef;border-radius:14px;padding:16px}.fcg-card h3{margin:0 0 12px;font-size:15px}.fcg-table{width:100%;border-collapse:collapse}.fcg-table th,.fcg-table td{padding:9px 7px;border-bottom:1px solid #edf0f4;text-align:left;font-size:11px}.fcg-table th{text-transform:uppercase;font-size:9px;color:#7a8799}.fcg-pill{display:inline-block;padding:4px 7px;border-radius:99px;font-size:9px;font-weight:800;background:#edf1f5}.fcg-list{display:grid;gap:8px}.fcg-alert{padding:10px;border:1px solid #f1d6d6;background:#fff7f7;border-radius:9px;font-size:11px}.fcg-empty{padding:14px;text-align:center;color:#687589;font-size:11px}@media(max-width:1000px){.fcg-grid{grid-template-columns:repeat(3,1fr)}.fcg-cols{grid-template-columns:1fr}}@media(max-width:650px){.fcg-grid{grid-template-columns:1fr 1fr}}
</style><div class="fcg-head"><div><h2>Visão gerencial</h2><div class="fcg-sub">Acompanhamento consolidado da execução fiscal mensal.</div></div><span class="fcg-pill">${total} lojas · ${TAXES.length} obrigações</span></div>
<div class="fcg-grid"><div class="fcg-kpi"><small>Lojas</small><b>${total}</b><span>carteira ativa</span></div><div class="fcg-kpi"><small>Conclusão</small><b>${pct}%</b><div class="fcg-progress"><i style="width:${pct}%"></i></div></div><div class="fcg-kpi"><small>Finalizadas</small><b>${done}</b><span>de ${totalOps} execuções</span></div><div class="fcg-kpi"><small>Em andamento</small><b>${analysing}</b><span>execuções analisando</span></div><div class="fcg-kpi"><small>Pendências</small><b>${pending}</b><span>execuções restantes</span></div></div>
<div class="fcg-cols"><section class="fcg-card"><h3>Desempenho por analista</h3><table class="fcg-table"><thead><tr><th>Analista</th><th>Carteira</th><th>Concluído</th><th>Pendente</th><th>Progresso</th></tr></thead><tbody>${analystRows.map(x=>`<tr><td><b>${esc(x.a.nome)}</b><br><small>${esc(x.a.nivel||'')}</small></td><td>${x.own.length}</td><td>${x.d}</td><td>${x.p}</td><td><b>${x.pct}%</b></td></tr>`).join('')||'<tr><td colspan="5" class="fcg-empty">Nenhum analista cadastrado.</td></tr>'}</tbody></table></section>
<section class="fcg-card"><h3>Pontos para decisão</h3><div class="fcg-list">${critical.slice(0,8).map(x=>`<div class="fcg-alert"><b>${esc(x.l.numero)} · ${esc(x.l.nome)}</b><br>${esc(x.t)} · Pendente · ${esc(x.l.analista||'Sem responsável')}</div>`).join('')||'<div class="fcg-empty">Nenhuma pendência registrada.</div>'}</div></section></div>`;
 const anchor=root.querySelector('.head');anchor?.after(old);if(!anchor)root.prepend(old);
}
function hook(){render();const u=document.getElementById('usuario');if(u&&!u.__fcGer){u.addEventListener('change',()=>setTimeout(render,0));u.__fcGer=true}if(typeof window.render==='function'&&!window.__fcGerRender){const o=window.render;window.render=function(){const r=o.apply(this,arguments);setTimeout(render,0);return r};window.__fcGerRender=true}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();window.addEventListener('storage',()=>setTimeout(render,0));
})();
