/* Fiscal Control — atualização imediata da carteira após salvar uma loja. */
(function(){
  'use strict';

  function readStores(){
    try{
      const v=JSON.parse(localStorage.getItem('fc_lojas')||'[]');
      return Array.isArray(v)?v:[];
    }catch(e){return []}
  }

  function esc(v){
    return typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  }

  function render(){
    const table=document.getElementById('storesTable');
    if(!table)return;
    const lojas=readStores();
    const q=(document.getElementById('storeSearch')?.value||'').trim().toLowerCase();
    const uf=(document.getElementById('storeUF')?.value||'').trim().toUpperCase();
    const st=document.getElementById('storeStatus')?.value||'';
    const analista=(document.getElementById('storeAnalyst')?.value||'').trim();
    const lista=lojas.filter(l=>{
      if(!l)return false;
      if(q&&!`${l.numero??''} ${l.nome??''} ${l.cnpj??''} ${l.ie??''} ${l.im??''} ${l.endereco??''} ${l.uf??''} ${l.analista??''}`.toLowerCase().includes(q))return false;
      if(uf&&String(l.uf||'').trim().toUpperCase()!==uf)return false;
      if(st&&String(l.ativo!==false)!==st)return false;
      if(analista&&String(l.analista||'').trim()!==analista)return false;
      return true;
    });
    table.innerHTML=lista.map(l=>`<tr><td><b>${esc(l.numero)}</b></td><td><b>${esc(l.nome)}</b></td><td>${esc(l.cnpj||'—')}</td><td>${esc(l.ie||'—')}</td><td>${esc(l.im||'—')}</td><td>${esc(l.endereco||'—')}</td><td>${esc(l.uf||'—')}</td><td><span class="badge ${l.ativo!==false?'greenbg':'gray'}">${l.ativo!==false?'Ativa':'Inativa'}</span></td><td>${esc(l.analista||'Sem carteira')}</td><td><button class="btn" type="button" data-live-edit="${Number(l.id)}">Editar</button></td></tr>`).join('')||'<tr><td colspan="10" style="padding:20px;text-align:center">Nenhuma loja encontrada.</td></tr>';
    table.querySelectorAll('[data-live-edit]').forEach(b=>b.addEventListener('click',()=>{if(typeof window.openStore==='function')window.openStore(Number(b.dataset.liveEdit))}));
  }

  function sync(){
    try{
      const stores=readStores();
      if(Array.isArray(window.lojas)){
        const byId=new Map(stores.map(x=>[String(x.id),x]));
        window.lojas.forEach(x=>{const fresh=byId.get(String(x.id));if(fresh)Object.assign(x,fresh)});
      }
    }catch(e){}
    render();
  }

  function init(){
    render();
    document.addEventListener('click',function(ev){
      const save=ev.target&&ev.target.closest?ev.target.closest('#modalSave'):null;
      if(save){
        setTimeout(sync,0);
        setTimeout(sync,120);
        setTimeout(sync,400);
      }
    },true);
    ['storeSearch','storeUF','storeStatus','storeAnalyst'].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&!el.__fcLiveAssignment){el.addEventListener('input',render);el.addEventListener('change',render);el.__fcLiveAssignment=true}
    });
    const nav=document.querySelector('.nav button[data-page="carteiras"]');
    if(nav&&!nav.__fcLiveAssignmentNav){nav.addEventListener('click',()=>setTimeout(render,30));nav.__fcLiveAssignmentNav=true}
    setInterval(()=>{if(document.getElementById('page-carteiras')?.classList.contains('active'))render()},1000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
