/* Fiscal Control — persistência central
   Fonte compartilhada: D1 via /api/state
   Mantém localStorage como cache local e sincroniza todos os estados fc_*. */
(function(){
'use strict';
if(window.__FC_CENTRAL_PERSISTENCE__)return;
window.__FC_CENTRAL_PERSISTENCE__=true;
const PREFIX='fc_';
const dirty=new Set();
let applyingRemote=false;
let ready=false;
let timer=null;
const originalSet=Storage.prototype.setItem;
const originalRemove=Storage.prototype.removeItem;
function isStateKey(k){return typeof k==='string'&&k.indexOf(PREFIX)===0&&k!=='fc_central_sync_meta_v1'}
function redraw(){
  try{if(typeof window.render==='function')window.render()}catch(e){}
  try{if(typeof window.renderApuracoes==='function')window.renderApuracoes()}catch(e){}
}
async function put(key){
  if(!isStateKey(key)||applyingRemote)return;
  dirty.add(key);
  try{
    const value=localStorage.getItem(key);
    const r=await fetch('/api/state/'+encodeURIComponent(key),{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({value})});
    if(r.ok)dirty.delete(key);
  }catch(e){}
}
Storage.prototype.setItem=function(key,value){originalSet.call(this,key,value);if(isStateKey(key)&&!applyingRemote)put(key)};
Storage.prototype.removeItem=function(key){originalRemove.call(this,key);if(isStateKey(key)&&!applyingRemote)put(key)};
async function pull(){
  try{
    const r=await fetch('/api/state',{credentials:'same-origin',cache:'no-store'});
    if(r.status===401||!r.ok)return;
    const data=await r.json();
    const states=Array.isArray(data.states)?data.states:[];
    if(!states.length){
      if(!ready){
        for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(isStateKey(k))dirty.add(k)}
        for(const k of [...dirty])await put(k);
      }
      ready=true;return;
    }
    applyingRemote=true;
    for(const item of states){
      if(!item||!isStateKey(item.key)||dirty.has(item.key))continue;
      if(item.value===null||item.value===undefined)originalRemove.call(localStorage,item.key);
      else originalSet.call(localStorage,item.key,String(item.value));
    }
    applyingRemote=false;
    ready=true;
    redraw();
  }catch(e){applyingRemote=false}
}
function start(){
  pull();
  if(timer)clearInterval(timer);
  timer=setInterval(pull,1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()});
  window.addEventListener('focus',pull);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
