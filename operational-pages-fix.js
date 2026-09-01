(function(){
'use strict';
const OPS_TAXES=['ICMS','PIS/COFINS','ISS','SPED ICMS','Fronteiras'];
const OPS_UFS=['PE','AL','PB','SP'];
function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch(e){return fallback}}
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function stores(){const v=read('fc_lojas',null);if(Array.isArray(v)&&v.length)return v;const w=Array.isArray(window.lojas)?window.lojas:[];return w}
function execs(){const v=read('fc_execucoes',null);if(v&&typeof v==='object'&&Object.keys(v).length)return v;const w=window.execucoes;return w&&typeof w==='object'?w:{} }
function prazosData(){const keys=['fc_prazos_v2','fc_prazos'];for(const k of keys){const v=read(k,null);if(Array.isArray(v)&&v.length)return v}const w=window.prazos;return Array.isArray(w)?w:[]}
function currentUser(){return (document.getElementById('usuario')?.value||'Daniela').trim()}
function manager(){return currentUser()==='Daniela'||currentUser()==='Leonardo'}
function analystStores(name){return stores().filter(l=>l&&l.ativo!==false&&l.analista===name)}
function statusFor(l,ob){const e=execs()[(l.id)+'|'+ob];return e&&e.status?e.status:'Pendente'}
function statusClass(st){return st==='Finalizada'?'greenbg':(st==='Analisando'?'blue':(st==='Gerando Query'?'blue':'yellowbg'))}
function renderApuracoesFix(){
 const cards=document.getElementById('taxCards');if(!cards)return;
 const q=(document.getElementById('busca')?.value||'').trim().toLowerCase();
 const uf=(document.getElementById('filtroUF')?.value||'').trim().toUpperCase();
 const imp=document.getElementById('filtroImposto')?.value||'';
 let base=manager()?stores():analystStores(currentUser());
 base=base.filter(l=>l&&l.ativo!==false&&(!q||`${l.numero??''} ${l.nome??''}`.toLowerCase().includes(q))&&(!uf||String(l.uf||'').toUpperCase()===uf));
 const obs=imp?[imp]:OPS_TAXES;
 cards.innerHTML=obs.map(ob=>{
   const units=base.filter(l=>!Array.isArray(l.impostos)||l.impostos.length===0||l.impostos.includes(ob));
   const done=units.filter(l=>statusFor(l,ob)==='Finalizada').length;
   return `<div class="card tax"><div class="taxHead"><div><h3>${esc(ob)}</h3><div class="taxMeta">${units.length} loja(s)</div></div><span class="badge blue">${done}/${units.length}</span></div>${units.map(l=>{const st=statusFor(l,ob);return `<div class="store"><div class="storeTop"><div><div class="storeName">${esc(l.numero)} · ${esc(l.nome)}</div><div class="state">${esc(l.uf)} · ${esc(l.analista||'Sem carteira')}</div></div><span class="status ${statusClass(st)} badge">${esc(st)}</span></div><div class="rowBtns"><button class="btn ${st==='Analisando'?'yellow':''}" type="button" data-op-analysis="${l.id}" data-op-tax="${esc(ob)}">Analisando</button><button class="btn green" type="button" data-op-final="${l.id}" data-op-tax="${esc(ob)}">Finalizar</button></div></div>`}).join('')}</div>`
 }).join('')||'<div class="alert blue">Nenhuma loja encontrada.</div>';
 cards.querySelectorAll('[data-op-analysis]').forEach(b=>b.onclick=()=>{if(typeof window.setStatus==='function')window.setStatus(Number(b.dataset.opAnalysis),b.dataset.opTax,'Analisando');else renderApuracoesFix()});
 cards.querySelectorAll('[data-op-final]').forEach(b=>b.onclick=()=>{if(typeof window.finalizar==='function')window.finalizar(Number(b.dataset.opFinal),b.dataset.opTax);else renderApuracoesFix()});
}
function renderPrazosFix(){
 const cards=document.getElementById('deadlineCards'),table=document.getElementById('deadlineTable');if(!cards||!table)return;
 const list=prazosData();
 cards.innerHTML=OPS_UFS.map(uf=>`<div class="card pad"><div class="cardTitle"><h3>${uf}</h3><span class="badge blue">${list.filter(p=>p.uf===uf&&p.data).length}/${OPS_TAXES.length} cadastrados</span></div>${OPS_TAXES.map(ob=>{const p=list.find(x=>x.uf===uf&&x.obrigacao===ob)||{uf,obrigacao:ob};return `<div class="metric"><b>${esc(ob)}</b><button class="btn" type="button" data-op-deadline-uf="${uf}" data-op-deadline-ob="${esc(ob)}">${esc(p.data||p.obs||'Não cadastrado')}</button></div>`}).join('')}</div>`).join('');
 table.innerHTML=OPS_UFS.flatMap(uf=>OPS_TAXES.map(ob=>{const p=list.find(x=>x.uf===uf&&x.obrigacao===ob)||{};return `<tr><td>${esc(ob)}</td><td>${uf}</td><td>${esc(p.data||'—')}</td><td>${esc(p.obs||'—')}</td></tr>`})).join('');
 cards.querySelectorAll('[data-op-deadline-uf]').forEach(b=>b.onclick=()=>{if(typeof window.openDeadline==='function')window.openDeadline(b.dataset.opDeadlineUf,b.dataset.opDeadlineOb)});
}
function refresh(){setTimeout(()=>{renderApuracoesFix();renderPrazosFix()},0)}
function init(){
 refresh();
 document.querySelectorAll('.nav button[data-page="apuracoes"],.nav button[data-page="prazos"]').forEach(b=>{if(b.__opsFix)return;b.addEventListener('click',refresh);b.__opsFix=true});
 if(typeof window.render==='function'&&!window.__opsRender){const old=window.render;window.render=function(){const r=old.apply(this,arguments);setTimeout(()=>{renderApuracoesFix();renderPrazosFix()},0);return r};window.__opsRender=true}
 ['busca','filtroImposto','filtroUF'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.__opsInput){el.addEventListener('input',renderApuracoesFix);el.addEventListener('change',renderApuracoesFix);el.__opsInput=true}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();