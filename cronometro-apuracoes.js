/* Fiscal Control — cronômetro das apurações
   Início: clique em Analisando. Fim: clique em Finalizar.
   Gestor pode corrigir a hora de finalização quando necessário. */
(function(){
  'use strict';
  const KEY='fc_execucoes';
  const MARK='data-fc-cronometro';

  function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch(e){return fallback}}
  function save(v){localStorage.setItem(KEY,JSON.stringify(v));try{window.dispatchEvent(new StorageEvent('storage',{key:KEY,newValue:JSON.stringify(v)}))}catch(e){}}
  function user(){return (document.getElementById('usuario')?.value||'Daniela').trim()}
  function team(){const v=read('fc_equipe',[]);return Array.isArray(v)?v:[]}
  function isManager(){const u=user(); if(u==='Daniela'||u==='Leonardo')return true; const p=team().find(x=>x&&x.nome===u); return !!p&&(p.funcao==='Gerente'||p.funcao==='Coordenador')}
  function fmt(ms){if(!Number.isFinite(ms)||ms<0)return '—'; const sec=Math.floor(ms/1000),h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
  function key(id,tax){return String(id)+'|'+String(tax)}
  function execs(){const v=read(KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
  function getAction(btn){const a=btn?.getAttribute('onclick')||''; const m=a.match(/(?:setStatus|finalizar)\s*\(\s*['"]?([^,'")]+)['"]?\s*,\s*['"]([^'"]+)['"]/); if(!m)return null; return {id:m[1],tax:m[2]}}
  function refresh(){try{if(typeof window.renderApuracoes==='function')window.renderApuracoes()}catch(e){} try{if(typeof window.render==='function')window.render()}catch(e){}}
  function notify(msg){try{if(typeof window.showToast==='function')window.showToast(msg);else{const x=document.getElementById('toast');if(x){x.textContent=msg;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2200)}}}catch(e){}}

  function ensureClock(store,id,tax){
    if(!store)return;
    let box=store.querySelector('[data-fc-clock]');
    if(!box){box=document.createElement('div');box.setAttribute('data-fc-clock','1');box.style.cssText='margin-top:7px;font-size:10px;color:#687589;font-weight:750;display:flex;align-items:center;gap:8px;flex-wrap:wrap';store.appendChild(box)}
    const data=execs()[key(id,tax)]||{};
    box.dataset.id=id;box.dataset.tax=tax;
    const st=data.status;
    if(!data.iniciadoEm){box.innerHTML='';return}
    const start=new Date(data.iniciadoEm).getTime();
    const end=data.finalizadoEm?new Date(data.finalizadoEm).getTime():Date.now();
    const label=st==='Finalizada'?'Tempo para encerramento':'Tempo em execução';
    box.innerHTML='<span>⏱ '+label+': <b>'+fmt(end-start)+'</b></span>';
    if(data.iniciadoEm)box.insertAdjacentHTML('beforeend','<span>Início: '+new Date(data.iniciadoEm).toLocaleString('pt-BR')+'</span>');
    if(data.finalizadoEm)box.insertAdjacentHTML('beforeend','<span>Fim: '+new Date(data.finalizadoEm).toLocaleString('pt-BR')+'</span>');
    if(st==='Finalizada'&&isManager()){
      const b=document.createElement('button');b.className='btn';b.type='button';b.textContent='Ajustar hora final';b.style.cssText='font-size:10px;padding:4px 7px';b.onclick=()=>adjustEnd(id,tax);box.appendChild(b)
    }
  }

  function scan(){
    document.querySelectorAll('#page-apuracoes .store').forEach(store=>{
      const btn=store.querySelector('.rowBtns button[onclick]');
      const a=getAction(btn);if(a)ensureClock(store,a.id,a.tax);
    });
  }

  function adjustEnd(id,tax){
    if(!isManager()){notify('Somente gerente ou coordenador pode ajustar a hora.');return}
    const data=execs(),k=key(id,tax),item=data[k];if(!item||!item.iniciadoEm)return;
    const atual=item.finalizadoEm?new Date(item.finalizadoEm):new Date();
    const pad=n=>String(n).padStart(2,'0');
    const local=atual.getFullYear()+'-'+pad(atual.getMonth()+1)+'-'+pad(atual.getDate())+'T'+pad(atual.getHours())+':'+pad(atual.getMinutes());
    const input=window.prompt('Informe a data e hora correta da finalização (AAAA-MM-DDTHH:MM).',local);
    if(!input)return;
    const d=new Date(input);if(Number.isNaN(d.getTime()))return notify('Data/hora inválida.');
    const start=new Date(item.iniciadoEm).getTime();if(d.getTime()<start)return notify('A finalização não pode ser anterior ao início.');
    item.finalizadoEm=d.toISOString();item.tempoMs=d.getTime()-start;item.ajusteFinalizacao=true;item.ajustadoPor=user();item.ajustadoEm=new Date().toISOString();data[k]=item;save(data);refresh();notify('Hora de finalização ajustada.');
  }

  const old=window.setStatus;
  if(typeof old==='function'&&!window.__fcCronometroWrapped){
    window.setStatus=function(id,tax,status){
      const before=execs()[key(id,tax)]||{};
      const now=new Date().toISOString();
      const result=old.apply(this,arguments);
      const data=execs(),k=key(id,tax),item=Object.assign({},data[k]||before);
      if(status==='Analisando'&&!item.iniciadoEm){item.iniciadoEm=now;item.iniciadoPor=user();item.finalizadoEm=null;item.tempoMs=null}
      if(status==='Finalizada'){
        if(!item.iniciadoEm)item.iniciadoEm=before.iniciadoEm||now;
        item.finalizadoEm=now;item.tempoMs=Math.max(0,new Date(item.finalizadoEm).getTime()-new Date(item.iniciadoEm).getTime());item.finalizadoPor=user();
      }
      data[k]=item;save(data);setTimeout(refresh,0);return result;
    };
    window.__fcCronometroWrapped=true;
  }

  setInterval(()=>{
    scan();
    document.querySelectorAll('[data-fc-clock]').forEach(box=>{
      const data=execs()[key(box.dataset.id,box.dataset.tax)]||{};
      if(data.iniciadoEm&&data.status!=='Finalizada'){
        const b=box.querySelector('b');if(b)b.textContent=fmt(Date.now()-new Date(data.iniciadoEm).getTime());
      }
    });
  },1000);
  document.addEventListener('click',()=>setTimeout(scan,50),true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
})();
