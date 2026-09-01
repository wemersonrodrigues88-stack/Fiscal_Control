/* Fiscal Control — persistência central compartilhada entre dispositivos.
   Primeiro hidrata o navegador a partir do estado central; só depois permite
   que alterações locais sejam enviadas. Isso evita que um aparelho novo
   sobrescreva o estado do setor com valores vazios durante a inicialização.
*/
(function(){
  'use strict';
  if(window.__FC_CENTRAL__)return;
  window.__FC_CENTRAL__=1;
  const dirty=new Set();
  let remote=false;
  let hydrated=false;
  const S=Storage.prototype.setItem;
  const R=Storage.prototype.removeItem;
  const key=k=>typeof k==='string'&&/^fc_[A-Za-z0-9_.:-]{1,180}$/.test(k)&&k!=='fc_central_sync_meta_v1';
  const redraw=()=>{try{window.render?.()}catch(e){}try{window.renderApuracoes?.()}catch(e){}};
  async function push(k){
    if(!key(k)||remote)return;
    if(!hydrated){dirty.add(k);return;}
    try{
      const v=localStorage.getItem(k);
      const r=await fetch('/api/state/'+encodeURIComponent(k),{method:'PUT',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({value:v===null?'null':v})});
      if(r.ok)dirty.delete(k);
    }catch(e){}
  }
  Storage.prototype.setItem=function(k,v){S.call(this,k,v);if(key(k)&&!remote)push(k)};
  Storage.prototype.removeItem=function(k){R.call(this,k);if(key(k)&&!remote)push(k)};
  async function sync(){
    try{
      const r=await fetch('/api/state',{credentials:'same-origin',cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();
      const states=d.states||[];
      const remoteKeys=new Set(states.map(x=>x.key||x.state_key));
      remote=true;
      for(const x of states){
        const stateKey=x.key||x.state_key; const stateValue=x.value??x.state_value;
        if(!key(stateKey)||dirty.has(stateKey))continue;
        if(stateValue===null||stateValue==='null')R.call(localStorage,stateKey);else S.call(localStorage,stateKey,String(stateValue));
      }
      remote=false;
      hydrated=true;
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(key(k)&&!remoteKeys.has(k))push(k);
      }
      for(const k of [...dirty])push(k);
      redraw();
    }catch(e){remote=false}
  }
  function start(){sync();setInterval(sync,1000);addEventListener('focus',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
