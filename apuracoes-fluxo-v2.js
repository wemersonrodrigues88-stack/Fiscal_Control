/* Fiscal Control — Fluxo definitivo das Apurações V2
   Pendente -> Gerando Query -> Analisando -> Finalizada
   Suspender Apuração retorna para Pendente e zera a execução.
*/
(function(){
  'use strict';

  const KEY='fc_execucoes';
  const INIT='fc_fluxo_apuracoes_v2_initialized';
  const STATUS={PENDENTE:'Pendente',QUERY:'Gerando Query',ANALISE:'Analisando',FINALIZADA:'Finalizada'};

  function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch(e){return fallback}}
  function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function lojas(){const v=read('fc_lojas',[]);return Array.isArray(v)?v:[]}
  function equipe(){const v=read('fc_equipe',[]);return Array.isArray(v)?v:[]}
  function execucoes(){const v=read(KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
  function usuario(){return (document.getElementById('usuario')?.value||'Daniela').trim()}
  function gestor(){const u=usuario();const p=equipe().find(x=>x&&x.nome===u);return u==='Daniela'||u==='Leonardo'||!!p&&(p.funcao==='Gerente'||p.funcao==='Coordenador')}
  function pode(l){return !!l&&(gestor()||String(l.analista||'').trim()===usuario())}
  function key(id,ob){return String(id)+'|'+String(ob)}
  function agora(){return new Date().toISOString()}
  function toast(msg){try{if(typeof window.showToast==='function')return window.showToast(msg);if(typeof window.toast==='function')return window.toast(msg);const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}}catch(e){}}
  function refresh(){try{if(typeof window.render==='function')window.render()}catch(e){}try{if(typeof window.renderApuracoes==='function')window.renderApuracoes()}catch(e){}}

  // Primeira carga da V2: toda loja/imposto começa Pendente.
  if(!localStorage.getItem(INIT)){
    write(KEY,{});
    localStorage.setItem(INIT,'1');
  }

  function impostos(){
    const s=document.getElementById('filtroImposto');
    const vals=s?[...s.options].map(o=>o.value).filter(v=>v):[];
    if(vals.length)return vals;
    return ['ICMS','PIS/COFINS'];
  }

  function estado(l,ob){return execucoes()[key(l.id,ob)]?.status||STATUS.PENDENTE}
  function classe(st){return st===STATUS.FINALIZADA?'greenbg':st===STATUS.ANALISE?'yellowbg':st===STATUS.QUERY?'blue':'gray'}

  function renderApuracoesV2(){
    const fi=document.getElementById('filtroImposto');
    const old=fi?.value||'';
    const allImp=impostos();
    if(fi){
      fi.innerHTML='<option value="">Todos os impostos</option>'+allImp.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('');
      fi.value=allImp.includes(old)?old:'';
    }
    const busca=(document.getElementById('busca')?.value||'').toLowerCase().trim();
    const uf=(document.getElementById('filtroUF')?.value||'').trim().toUpperCase();
    const base=gestor()?lojas():lojas().filter(l=>String(l.analista||'').trim()===usuario());
    const visible=base.filter(l=>l&&l.ativo!==false&&(!busca||`${l.numero||''} ${l.nome||''}`.toLowerCase().includes(busca))&&(!uf||String(l.uf||'').trim().toUpperCase()===uf));
    const selected=fi?.value||'';
    const arr=selected?[selected]:allImp;
    const ex=execucoes();
    const html=arr.map(ob=>{
      const units=visible.filter(l=>!Array.isArray(l.impostos)||l.impostos.length===0||l.impostos.includes(ob));
      const fin=units.filter(l=>estado(l,ob)===STATUS.FINALIZADA).length;
      return `<div class="card tax"><div class="taxHead"><div><h3>${esc(ob)}</h3><div class="taxMeta">${units.length} loja(s)</div></div><span class="badge blue">${fin}/${units.length}</span></div>`+
        units.map(l=>row(l,ob,ex)).join('')+'</div>';
    }).join('');
    const target=document.getElementById('taxCards');
    if(target)target.innerHTML=html||'<div class="alert blue">Nenhuma loja encontrada.</div>';
  }

  function esc(s){return String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}

  function row(l,ob,ex){
    const st=ex[key(l.id,ob)]?.status||STATUS.PENDENTE;
    let actions='';
    if(st===STATUS.PENDENTE){
      actions=`<button class="btn primary" onclick="setStatus(${Number(l.id)},'${esc(ob)}','${STATUS.QUERY}')">Gerar Query</button>`;
    }else if(st===STATUS.QUERY){
      actions=`<button class="btn yellow" onclick="setStatus(${Number(l.id)},'${esc(ob)}','${STATUS.ANALISE}')">Analisando</button><button class="btn red" onclick="suspenderApuracao(${Number(l.id)},'${esc(ob)}')">Suspender Apuração</button>`;
    }else if(st===STATUS.ANALISE){
      actions=`<button class="btn green" onclick="finalizar(${Number(l.id)},'${esc(ob)}')">Finalizar</button><button class="btn red" onclick="suspenderApuracao(${Number(l.id)},'${esc(ob)}')">Suspender Apuração</button>`;
    }else if(st===STATUS.FINALIZADA){
      actions=`<button class="btn red" onclick="suspenderApuracao(${Number(l.id)},'${esc(ob)}')">Suspender Apuração</button>`;
    }
    return `<div class="store"><div class="storeTop"><div><div class="storeName">${esc(l.numero)} · ${esc(l.nome)}</div><div class="state">${esc(l.uf)} · ${esc(l.analista||'Sem carteira')}</div></div><span class="status ${classe(st)} badge">${st}</span></div><div class="rowBtns">${actions}</div></div>`;
  }

  window.setStatus=function(id,ob,status){
    const l=lojas().find(x=>String(x.id)===String(id));
    if(!l||!pode(l))return toast('Acesso não permitido para esta loja.');
    const ex=execucoes();const k=key(id,ob);const prev=ex[k]?.status||STATUS.PENDENTE;
    const allowed=(prev===STATUS.PENDENTE&&status===STATUS.QUERY)||(prev===STATUS.QUERY&&status===STATUS.ANALISE);
    if(!allowed)return toast(`Fluxo inválido: ${prev} → ${status}.`);
    const now=Date.now();
    const old=ex[k]||{};
    ex[k]={...old,lojaId:l.id,lojaNumero:l.numero,lojaNome:l.nome,loja:l.nome,analista:l.analista||'',uf:l.uf||'',imposto:ob,obrigacao:ob,status,atualizadoEm:agora(),atualizadoPor:usuario()};
    if(status===STATUS.QUERY){ex[k].queryStartedAt=now;ex[k].analysisStartedAt=null;ex[k].iniciadoEm=agora();ex[k].finalizadoEm=null;ex[k].queryElapsedMs=0;ex[k].analysisElapsedMs=0}
    if(status===STATUS.ANALISE){ex[k].queryElapsedMs=old.queryStartedAt?Math.max(0,now-Number(old.queryStartedAt)):Number(old.queryElapsedMs)||0;ex[k].queryStartedAt=null;ex[k].analysisStartedAt=now}
    write(KEY,ex);refresh();toast(`${l.nome} · ${ob} → ${status}`);
  };

  window.finalizar=function(id,ob){
    const l=lojas().find(x=>String(x.id)===String(id));
    if(!l||!pode(l))return toast('Acesso não permitido para esta loja.');
    const ex=execucoes();const k=key(id,ob);if((ex[k]?.status||STATUS.PENDENTE)!==STATUS.ANALISE)return toast('A apuração precisa estar em Analisando.');
    const daily=confirm('Foi feita a análise diária?\n\nOK = SIM\nCancelar = NÃO');
    let data='';
    if(daily){data=prompt('Informe a data do último dia analisado (DD/MM/AAAA):','');if(!data)return}
    else{
      const alertas=read('fc_alertas',[]);alertas.push({tipo:'red',titulo:`⚠️ ${ob} — ${l.nome}`,msg:`${l.analista||'Sem carteira'} finalizou sem realizar a análise diária. Alerta para Leonardo e Daniela.`,analista:l.analista,data:new Date().toLocaleString('pt-BR'),lida:false});write('fc_alertas',alertas);
    }
    const now=Date.now(),old=ex[k]||{};old.analysisElapsedMs=(Number(old.analysisElapsedMs)||0)+(old.analysisStartedAt?Math.max(0,now-Number(old.analysisStartedAt)):0);old.analysisStartedAt=null;old.queryStartedAt=null;old.tempoTotalMs=(Number(old.queryElapsedMs)||0)+(Number(old.analysisElapsedMs)||0);old.status=STATUS.FINALIZADA;old.analiseDiaria=daily;old.ultimoDia=data;old.finalizadoEm=agora();old.atualizadoEm=agora();old.atualizadoPor=usuario();ex[k]=old;write(KEY,ex);refresh();toast(`${l.nome} · ${ob} → Finalizada`);
  };

  window.suspenderApuracao=function(id,ob){
    const l=lojas().find(x=>String(x.id)===String(id));
    if(!l||!pode(l))return toast('Acesso não permitido para esta loja.');
    const ex=execucoes(),k=key(id,ob),old=ex[k];
    if(!old||old.status===STATUS.PENDENTE)return toast('A apuração já está Pendente.');
    ex[k]={lojaId:l.id,lojaNumero:l.numero,lojaNome:l.nome,loja:l.nome,analista:l.analista||'',uf:l.uf||'',imposto:ob,obrigacao:ob,status:STATUS.PENDENTE,queryElapsedMs:0,analysisElapsedMs:0,queryStartedAt:null,analysisStartedAt:null,iniciadoEm:null,finalizadoEm:null,tempoTotalMs:0,atualizadoEm:agora(),atualizadoPor:usuario(),suspensaEm:agora(),suspensaPor:usuario()};
    write(KEY,ex);refresh();toast(`${l.nome} · ${ob} → Pendente`);
  };

  window.renderApuracoes=renderApuracoesV2;
  document.addEventListener('DOMContentLoaded',function(){setTimeout(renderApuracoesV2,0)});
  setTimeout(renderApuracoesV2,0);
})();