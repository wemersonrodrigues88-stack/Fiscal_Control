(function(){
'use strict';
function esc(v){return typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
const rawSetItem=Storage.prototype.setItem;
let syncing=false;
function isLoja01(l){const n=String(l&&l.numero??'').trim().replace(/^0+/,'')||'0';const nome=String(l&&l.nome??'').trim().toLowerCase();return n==='1'||/capinape|capina(?:p|pe)?/.test(nome)}
function normalizar(lojas){
 if(!Array.isArray(lojas))return [];
 let changed=false;
 const out=lojas.map(l=>{
   if(!l||typeof l!=='object')return l;
   const c={...l};
   if(isLoja01(c)){
     if(String(c.numero??'')!=='01'){c.numero='01';changed=true}
     if(c.nome!=='Carpina'){c.nome='Carpina';changed=true}
   }
   return c;
 });
 return {data:out,changed};
}
function readStores(){
 try{
   const raw=localStorage.getItem('fc_lojas');
   let data=raw?JSON.parse(raw):null;
   if(!Array.isArray(data)&&Array.isArray(window.lojas))data=window.lojas;
   if(!Array.isArray(data))data=[];
   const n=normalizar(data);
   if(n.changed&&!syncing){syncing=true;try{rawSetItem.call(localStorage,'fc_lojas',JSON.stringify(n.data))}finally{syncing=false}}
   window.lojas=n.data;
   return n.data;
 }catch(e){console.error('Fiscal Control: erro ao carregar lojas',e);return Array.isArray(window.lojas)?window.lojas:[]}
}
function persistAndRefresh(value){
 let data;
 try{data=JSON.parse(value);if(!Array.isArray(data))return}catch(e){return}
 const n=normalizar(data);
 syncing=true;
 try{rawSetItem.call(localStorage,'fc_lojas',JSON.stringify(n.data));window.lojas=n.data}catch(e){console.error('Fiscal Control: erro ao salvar lojas',e)}
 finally{syncing=false}
 setTimeout(()=>{renderCarteirasCompleta();if(typeof window.render==='function')window.render()},0);
}
Storage.prototype.setItem=function(key,value){
 if(key==='fc_lojas'&&!syncing){persistAndRefresh(String(value));return}
 return rawSetItem.call(this,key,value);
};
function renderCarteirasCompleta(){
 const table=document.getElementById('storesTable');if(!table)return;
 const lojas=readStores();
 const search=(document.getElementById('storeSearch')?.value||'').trim().toLowerCase();
 const uf=(document.getElementById('storeUF')?.value||'').trim().toUpperCase();
 const status=document.getElementById('storeStatus')?.value||'';
 const lista=lojas.filter(l=>{
   if(!l)return false;
   if(search&&!`${l.numero??''} ${l.nome??''} ${l.cnpj??''} ${l.ie??''} ${l.im??''} ${l.endereco??''}`.toLowerCase().includes(search))return false;
   if(uf&&String(l.uf||'').toUpperCase()!==uf)return false;
   if(status&&String(l.ativo)!==status)return false;
   return true;
 });
 table.innerHTML=lista.map(l=>`<tr><td><b>${esc(l.numero)}</b></td><td>${esc(l.nome)}</td><td>${esc(l.cnpj||'—')}</td><td>${esc(l.ie||'—')}</td><td>${esc(l.im||'—')}</td><td>${esc(l.endereco||'—')}</td><td>${esc(l.uf||'—')}</td><td><span class="badge ${l.ativo!==false?'greenbg':'gray'}">${l.ativo!==false?'Ativa':'Inativa'}</span></td><td>${esc(l.analista||'Sem carteira')}</td><td>${typeof window.openStore==='function'?`<button class="btn" type="button" data-fc-store="${Number(l.id)}">Editar</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="10" style="padding:20px;text-align:center">Nenhuma loja encontrada.</td></tr>';
 table.querySelectorAll('[data-fc-store]').forEach(b=>b.addEventListener('click',()=>window.openStore(Number(b.dataset.fcStore))));
 const portfolio=document.getElementById('portfolio');
 if(portfolio){const ativos=lojas.filter(l=>l&&l.ativo!==false).length;const inativos=lojas.filter(l=>l&&l.ativo===false).length;const total=lojas.length;portfolio.innerHTML=[['Total de lojas',total,'base completa'],['Lojas ativas',ativos,'em operação'],['Lojas inativas',inativos,'fora de operação']].map(x=>`<div class="card kpi"><small>${x[0]}</small><b>${x[1]}</b><span>${x[2]}</span></div>`).join('')}
}
function init(){
 readStores();
 renderCarteirasCompleta();
 ['storeSearch','storeUF','storeStatus'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.__fcStoreFix){el.addEventListener('input',renderCarteirasCompleta);el.addEventListener('change',renderCarteirasCompleta);el.__fcStoreFix=true}});
 document.querySelectorAll('.nav button[data-page="carteiras"]').forEach(btn=>{if(btn.__fcCarteiraNav)return;btn.addEventListener('click',()=>setTimeout(renderCarteirasCompleta,0));btn.__fcCarteiraNav=true});
 if(typeof window.render==='function'&&!window.__fcCarteiraRender){const old=window.render;window.render=function(){readStores();old.apply(this,arguments);setTimeout(renderCarteirasCompleta,0)};window.__fcCarteiraRender=true}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();