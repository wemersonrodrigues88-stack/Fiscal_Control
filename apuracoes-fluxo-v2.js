/* Fiscal Control — Fluxo definitivo das Apurações V3
   Pendente -> Gerando Query -> Analisando -> Finalizada
   Interface sem Suspender Apuração e com cards mais espaçosos.
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
  function refresh(){try{if(typeof window.render==='function')window.render()}catch(e){}try{window.renderApuracoesV2?.()}catch(e){}}

  if(!localStorage.getItem(INIT)){write(KEY,{});localStorage.setItem(INIT,'1')}

  function impostos(){
    const s=document.getElementById('filtroImposto');
    const vals=s?[...s.options].map(o=>o.value).filter(v=>v):[];
    if(vals.length)return vals;
    return ['ICMS','PIS/COFINS','ISS','SPED ICMS','Fronteiras'];
  }

  function estado(l,ob){return execucoes()[key(l.id,ob)]?.status||STATUS.PENDENTE}
  function classe(st){return st===STATUS.FINALIZADA?'greenbg':st===STATUS.ANALISE?'yellowbg':st===STATUS.QUERY?'blue':'gray'}

  function injectApuracoesStyle(){
    if(document.getElementById('fc-apuracoes-v3-style'))return;
    const s=document.createElement('style');s.id='fc-apuracoes-v3-style';
    s.textContent=`
      #taxCards{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
      #taxCards>.card.tax{margin:0 !important;padding:18px !important;min-width:0}
      #taxCards .taxHead{padding-bottom:13px;margin-bottom:2px}
      #taxCards .taxHead h3{font-size:17px}
      #taxCards .store{padding:15px 0 !important;margin:0 !important;border-top:1px solid #e4e9f0;display:block !important}
      #taxCards .storeTop{display:flex !important;align-items:flex-start !important;justify-content:space-between !important;gap:14px !important;margin-bottom:11px !important}
      #taxCards .storeName{font-size:13px !important;line-height:1.25 !important}
      #taxCards .state{font-size:11px !important;margin-top:4px !important}
      #taxCards .status{flex:0 0 auto !important;white-space:nowrap !important}
      #taxCards .rowBtns{display:grid !important;grid-template-columns:1fr 1fr !important;gap:9px !important;margin-top:0 !important}
      #taxCards .rowBtns .btn{width:100% !important;min-height:37px !important;padding:8px 10px !important;font-size:11px !important}
      #taxCards .rowBtns .btn.primary{grid-column:1 / -1}
      #taxCards .rowBtns .btn[onclick*="suspenderApuracao"],#taxCards button[title*="Suspender"],#taxCards button[data-action="suspender"]{display:none !important}
      @media(max-width:1050px){#taxCards{grid-template-columns:1fr !important}}
    `;
    document.head.appendChild(s);
  }

  function removeSuspensaoResidual(){
    document.querySelectorAll('#taxCards button').forEach(b=>{
      const text=(b.textContent||'').trim().toLowerCase();
      const onclick=(b.getAttribute('onclick')||'').toLowerCase();
      if(text.includes('suspender apuração')||text.includes('suspender apuracao')||onclick.includes('suspenderapuracao'))b.remove();
    });
  }

  function renderApuracoesV2(){
    injectApuracoesStyle();
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
    removeSuspensaoResidual();
  }

  function esc(s){return String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}

  function row(l,ob,ex){
    const st=ex[key(l.id,ob)]?.status||STATUS.PENDENTE;
    let actions='';
    if(st===STATUS.PENDENTE){
      actions=`<button class="btn primary" onclick="setStatus(${Number(l.id)},'${esc(ob)}','${STATUS.QUERY}')">Gerar Query</button>`;
    }else if(st===STATUS.QUERY){
      actions=`<button class="btn yellow" onclick="setStatus(${Number(l.id)},'${esc(ob)}','${STATUS.ANALISE}')">Iniciar análise</button>`;
    }else if(st===STATUS.ANALISE){
      actions=`<button class="btn green" onclick="finalizar(${Number(l.id)},'${esc(ob)}')">Finalizar</button>`;
    }else if(st===STATUS.FINALIZADA){
      actions=`<span class="badge greenbg" style="display:inline-flex;justify-content:center;align-items:center;min-height:37px;width:100%;font-size:11px">Concluída</span>`;
    }
    return `<div class="store"><div class="storeTop"><div><div class="storeName">${esc(l.numero)} · ${esc(l.nome)}</div><div class="state">${esc(l.uf)} · ${esc(l.analista||'Sem carteira')}</div></div><span class="status ${classe(st)} badge">${st}</span></div><div class="rowBtns">${actions}</div></div>`;
  }

  window.setStatus=function(id,ob,status){
    const l=lojas().find(x=>String(x.id)===String(id));
    if(!l||!pode(l))return toast('Acesso não permitido para esta loja.');
    const ex=execucoes();const k=key(id,ob);const prev=ex[k]?.status||STATUS.PENDENTE;
    const allowed=(prev===STATUS.PENDENTE&&status===STATUS.QUERY)||(prev===STATUS.QUERY&&status===STATUS.ANALISE);
    if(!allowed)return toast(`Fluxo inválido: ${prev} → ${status}.`);
    const now=Date.now();const old=ex[k]||{};
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
    else{const alertas=read('fc_alertas',[]);alertas.push({tipo:'red',titulo:`⚠️ ${ob} — ${l.nome}`,msg:`${l.analista||'Sem carteira'} finalizou sem realizar a análise diária. Alerta para Leonardo e Daniela.`,analista:l.analista,data:new Date().toLocaleString('pt-BR'),lida:false});write('fc_alertas',alertas)}
    const now=Date.now(),old=ex[k]||{};old.analysisElapsedMs=(Number(old.analysisElapsedMs)||0)+(old.analysisStartedAt?Math.max(0,now-Number(old.analysisStartedAt)):0);old.analysisStartedAt=null;old.queryStartedAt=null;old.tempoTotalMs=(Number(old.queryElapsedMs)||0)+(Number(old.analysisElapsedMs)||0);old.status=STATUS.FINALIZADA;old.analiseDiaria=daily;old.ultimoDia=data;old.finalizadoEm=agora();old.atualizadoEm=agora();old.atualizadoPor=usuario();ex[k]=old;write(KEY,ex);refresh();toast(`${l.nome} · ${ob} → Finalizada`);
  };

  window.suspenderApuracao=function(id,ob){
    /* Compatibilidade técnica com dados antigos. A ação não é mais exibida na interface. */
    const l=lojas().find(x=>String(x.id)===String(id));
    if(!l||!pode(l))return toast('Acesso não permitido para esta loja.');
    const ex=execucoes(),k=key(id,ob),old=ex[k];
    if(!old||old.status===STATUS.PENDENTE)return toast('A apuração já está Pendente.');
    ex[k]={...old,status:STATUS.PENDENTE,queryElapsedMs:0,analysisElapsedMs:0,queryStartedAt:null,analysisStartedAt:null,iniciadoEm:null,finalizadoEm:null,tempoTotalMs:0,atualizadoEm:agora(),atualizadoPor:usuario()};
    write(KEY,ex);refresh();toast(`${l.nome} · ${ob} → Pendente`);
  };

  window.renderApuracoes=renderApuracoesV2;
  window.renderApuracoesV2=renderApuracoesV2;
  document.addEventListener('DOMContentLoaded',function(){setTimeout(renderApuracoesV2,0);setTimeout(renderApuracoesV2,250)});
  setTimeout(renderApuracoesV2,0);
})();