/* Fiscal Control — hotfix operacional analista V4 */
(function(){
'use strict';
const TAXES=['ICMS','PIS/COFINS','ISS','SPED ICMS','Fronteiras'];
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v}catch(e){return f}};
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const user=()=>{try{return window.FCAuth&&window.FCAuth.getUser?window.FCAuth.getUser():null}catch(e){return null}};
const name=()=>String(user()?.nome||document.getElementById('usuario')?.value||'').trim();
const analyst=()=>{const u=user();if(u)return u.perfil==='Analista';const p=read('fc_equipe',[]).find(x=>x&&x.nome===name());return !!p&&p.funcao==='Analista'};
const stores=()=>{const v=read('fc_lojas',[]);return Array.isArray(v)?v.filter(l=>l&&l.ativo!==false&&String(l.analista||'').trim()===name()):[]};
function style(){if(document.getElementById('fc-hotfix-v4-style'))return;const s=document.createElement('style');s.id='fc-hotfix-v4-style';s.textContent=`
.fc-iss-field{margin-top:11px}.fc-iss-field label{display:block;font-size:10px;font-weight:850;margin-bottom:5px}.fc-iss-field input{width:100%}
#fc-analyst-stores-card{margin-top:14px}
#fc-analyst-chart-card{margin-top:14px}
.fc-analyst-right-stack{display:grid;gap:14px}
@media(max-width:1050px){.fc-analyst-right-stack{display:block}}
`;document.head.appendChild(s)}
function fixButton(){if(!analyst())return;document.querySelectorAll('button').forEach(b=>{const t=(b.textContent||'').trim().toLowerCase();if(t==='completar cadastro'||t==='completar cadastro')b.textContent='Editar'})}
function addIssField(id){if(!analyst())return;const modal=document.querySelector('.modalBack.show .modal');if(!modal)return;const form=modal.querySelector('.form');if(!form)return;if(form.querySelector('#fc-iss-vencimento'))return;const loja=stores().find(l=>String(l.id)===String(id))||read('fc_lojas',[]).find(l=>String(l.id)===String(id));if(!loja)return;const field=document.createElement('div');field.className='field fc-iss-field';field.innerHTML='<label for="fc-iss-vencimento">Data vencimento ISS</label><input id="fc-iss-vencimento" type="number" min="1" max="31" step="1" placeholder="Dia do mês (1 a 31)" value="'+esc(loja.issVencimento||loja.vencimentoISS||'')+'"><small style="display:block;color:#687589;font-size:10px;margin-top:4px">Informe o dia de vencimento definido pela prefeitura desta loja.</small>';form.appendChild(field);const save=modal.querySelector('.modalFoot .btn.primary')||[...modal.querySelectorAll('.modalFoot .btn')].find(b=>/salvar/i.test(b.textContent||''));if(save&&!save.dataset.fcIssHook){save.dataset.fcIssHook='1';save.addEventListener('click',()=>{const raw=document.getElementById('fc-iss-vencimento')?.value||'';const v=raw?Math.max(1,Math.min(31,parseInt(raw,10)||1)):'';const all=read('fc_lojas',[]);const i=Array.isArray(all)?all.findIndex(l=>String(l.id)===String(id)):-1;if(i>=0){all[i].issVencimento=v;all[i].vencimentoISS=v;localStorage.setItem('fc_lojas',JSON.stringify(all));setTimeout(()=>{try{window.render()}catch(e){}},80)}})}}
function hookOpenStore(){if(window.__fcHotfixOpenStore)return true;if(typeof window.openStore!=='function')return false;const old=window.openStore;window.openStore=function(id){const r=old.apply(this,arguments);setTimeout(()=>addIssField(id),120);setTimeout(()=>addIssField(id),450);setTimeout(()=>addIssField(id),900);return r};window.__fcHotfixOpenStore=true;return true}
function reorder(){if(!analyst())return;const page=document.getElementById('page-dashboard');if(!page)return;const mainGrid=page.querySelector('.grid.two');const dashLower=page.querySelector('.dashLower');const alertCard=mainGrid?.children[1];const deadlines=dashLower?.children[1];const chart=document.getElementById('fc-analyst-chart-card');const storesCard=document.getElementById('fc-analyst-stores-card');if(!mainGrid||!alertCard||!dashLower)return;
 let stack=document.getElementById('fc-analyst-right-stack');if(!stack){stack=document.createElement('div');stack.id='fc-analyst-right-stack';stack.className='fc-analyst-right-stack';mainGrid.parentNode.insertBefore(stack,mainGrid.nextSibling)}
 stack.appendChild(alertCard);if(chart)stack.appendChild(chart);if(deadlines)stack.appendChild(deadlines);if(storesCard)storesCard.remove();
 mainGrid.style.gridTemplateColumns='1.3fr';
 dashLower.style.gridTemplateColumns='1fr';
 const exec=dashLower.children[0];if(exec)exec.style.width='100%';
 // Minha carteira fica abaixo do bloco de prazos, na coluna esquerda.
 if(storesCard){const anchor=page.querySelector('.grid.two + .grid.two');if(anchor)anchor.parentNode.insertBefore(storesCard,anchor)}
}
function ensureStoreCard(){if(!analyst())return;const existing=document.getElementById('fc-analyst-stores-card');if(existing)return;const page=document.getElementById('page-dashboard');const blocks=page?.querySelectorAll('.card');if(!blocks||!blocks.length)return;const c=document.createElement('div');c.id='fc-analyst-stores-card';c.className='card pad';const ss=stores();c.innerHTML='<div class="cardTitle"><h3>Minha carteira</h3><span class="badge blue">'+ss.length+'</span></div><div style="font-size:11px;color:#687589;margin-bottom:8px">Lojas vinculadas à sua carteira.</div>'+(ss.map(l=>'<div class="fc-analyst-store" style="border-top:1px solid #e1e7ef;padding:10px 0;display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>'+esc(l.numero)+' · '+esc(l.nome)+'</b><small style="display:block;color:#687589">'+esc(l.uf||'—')+' · '+esc(l.analista||'')+'</small></div><button class="btn" type="button" data-fc-edit-store="'+Number(l.id)+'">Editar</button></div>').join('')||'<div style="color:#687589;font-size:12px">Nenhuma loja ativa vinculada à sua carteira.</div>');c.querySelectorAll('[data-fc-edit-store]').forEach(b=>b.onclick=()=>{const id=b.dataset.fcEditStore;if(typeof window.openStore==='function')window.openStore(id);else if(typeof window.go==='function')window.go('carteiras')});const lower=page.querySelector('.dashLower');if(lower)lower.parentNode.insertBefore(c,lower.nextSibling)}
function apply(){if(!analyst())return;style();fixButton();hookOpenStore();ensureStoreCard();reorder()}
function init(){apply();setInterval(apply,700);const mo=new MutationObserver(()=>{if(analyst()){fixButton();setTimeout(()=>addIssField(window.__fcHotfixCurrentStore),30)}});mo.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
