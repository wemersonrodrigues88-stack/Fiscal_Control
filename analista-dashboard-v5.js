/* Fiscal Control — Analista V5: substitui Obrigações por estado por Progresso por imposto. */
(function(){
'use strict';
const TAXES=['ICMS','PIS/COFINS','ISS','SPED ICMS','Fronteiras'];
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v}catch(e){return f}};
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function user(){try{return window.FCAuth&&window.FCAuth.getUser?window.FCAuth.getUser():null}catch(e){return null}}
function name(){return String(user()?.nome||document.getElementById('usuario')?.value||'').trim()}
function analyst(){const u=user();if(u)return String(u.perfil||'').toLowerCase()==='analista';const p=read('fc_equipe',[]).find(x=>x&&x.nome===name());return !!p&&String(p.funcao||'').toLowerCase()==='analista'}
function stores(){const v=read('fc_lojas',[]);return Array.isArray(v)?v.filter(l=>l&&l.ativo!==false&&String(l.analista||'').trim()===name()):[]}
function execs(){const v=read('fc_execucoes',{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function render(){
 if(!analyst())return;
 const page=document.getElementById('page-dashboard');if(!page)return;
 const mains=[...page.querySelectorAll('.grid.two')];
 const main=mains.find(g=>g.querySelector('.cardTitle h3')?.textContent.trim()==='Obrigações por estado'||g.querySelector('#fc-analyst-progress-card'))||mains[0];
 if(!main)return;
 const obligation=[...main.children].find(c=>c.querySelector('.cardTitle h3')?.textContent.trim()==='Obrigações por estado');
 let card=main.querySelector('#fc-analyst-progress-card');
 if(!card){card=document.createElement('div');card.id='fc-analyst-progress-card';card.className='card pad';}
 const ss=stores(),e=execs(),n=ss.length;
 card.innerHTML='<div class="cardTitle"><h3>Progresso por imposto</h3><span class="badge blue">'+n+' lojas</span></div><div id="fc-analyst-progress-rows">'+TAXES.map(t=>{const done=ss.filter(l=>{const x=e[String(l.id)+'|'+t];const s=x&&x.status;return s==='Finalizada'||s==='Finalizado'}).length;const pct=n?Math.round(done/n*100):0;return '<div style="display:grid;grid-template-columns:105px 1fr 48px;gap:9px;align-items:center;margin:12px 0;font-size:11px"><b>'+esc(t)+'</b><div style="height:9px;background:#edf1f6;border-radius:99px;overflow:hidden"><span style="display:block;height:100%;width:'+pct+'%;background:#1769e0;border-radius:99px"></span></div><b style="text-align:right">'+done+'/'+n+'</b></div>'}).join('')+'</div>';
 if(obligation)obligation.replaceWith(card);else if(!card.parentNode)main.appendChild(card);
 main.style.gridTemplateColumns='1.3fr .7fr';
}
function apply(){if(!analyst())return;render()}
function init(){apply();setInterval(apply,700);new MutationObserver(()=>setTimeout(apply,20)).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
