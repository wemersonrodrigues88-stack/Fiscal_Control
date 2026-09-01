import authWorker from './fiscal-control-auth-worker.js';

let ready;
const SCHEMA = `CREATE TABLE IF NOT EXISTS app_state(state_key TEXT PRIMARY KEY,state_value TEXT,version INTEGER NOT NULL DEFAULT 1,updated_by TEXT,updated_at TEXT NOT NULL DEFAULT(datetime('now')));CREATE INDEX IF NOT EXISTS idx_app_state_updated ON app_state(updated_at);`;
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function schema(e){if(!e.DB)throw Error('DB_NOT_BOUND');if(!ready)ready=e.DB.exec(SCHEMA).catch(x=>{ready=null;throw x});await ready}
function ck(r){const m=(r.headers.get('Cookie')||'').match(/(?:^|;\s*)fc_session=([^;]+)/);return m?.[1]}
async function hash(s){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function auth(r,e){await schema(e);const c=ck(r);if(!c)return null;return e.DB.prepare("SELECT u.id,u.username,u.display_name,u.profile,u.privilege,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now') AND u.status='Ativo' LIMIT 1").bind(await hash(c)).first()}
const valid=k=>typeof k==='string'&&/^fc_[A-Za-z0-9_.:-]{1,180}$/.test(k)&&k!=='fc_central_sync_meta_v1';
const manager=u=>!!u&&(u.privilege==='Desenvolvedor'||u.profile==='Gerente'||u.profile==='Coordenador'||u.profile==='Gestão');
const developer=u=>u?.privilege==='Desenvolvedor';
const ownStateKeys=new Set(['fc_execucoes','fc_alertas','fc_mensagens_gestao']);
const managerStateKeys=new Set(['fc_equipe','fc_lojas','fc_prazos','fc_mensagens_gestao']);
async function readState(e,k){return e.DB.prepare('SELECT state_key,state_value,version,updated_by,updated_at FROM app_state WHERE state_key=?').bind(k).first()}
function parse(v,f){try{const x=JSON.parse(v);return x==null?f:x}catch(_){return f}}
function ownedStoreIds(lojas,u){return new Set((Array.isArray(lojas)?lojas:[]).filter(l=>l&&l.ativo!==false&&String(l.analista||'').trim()===String(u.display_name||'').trim()).map(l=>String(l.id)))}
function filterExec(obj,ids){const out={};for(const [k,v] of Object.entries(obj&&typeof obj==='object'?obj:{})){const id=String(k).split('|')[0];if(ids.has(id))out[k]=v}return out}
function filterAlerts(arr,name){return (Array.isArray(arr)?arr:[]).filter(x=>!x?.analista||String(x.analista).trim()===name)}
function filterMessages(arr,name){return (Array.isArray(arr)?arr:[]).filter(x=>!x?.destinatario||String(x.destinatario).trim()===name||String(x.usuario||'').trim()===name)}
async function analystView(r,e,u,rows){
  const lojaRow=rows.find(x=>x.state_key==='fc_lojas');
  const lojas=parse(lojaRow?.state_value,'[]');
  const ids=ownedStoreIds(lojas,u);
  const out=[];
  for(const x of rows){
    if(x.state_key==='fc_lojas')out.push({...x,state_value:JSON.stringify((Array.isArray(lojas)?lojas:[]).filter(l=>ids.has(String(l.id)))}));
    else if(x.state_key==='fc_execucoes')out.push({...x,state_value:JSON.stringify(filterExec(parse(x.state_value,{}),ids))});
    else if(x.state_key==='fc_alertas')out.push({...x,state_value:JSON.stringify(filterAlerts(parse(x.state_value,[]),u.display_name))});
    else if(x.state_key==='fc_mensagens_gestao')out.push({...x,state_value:JSON.stringify(filterMessages(parse(x.state_value,[]),u.display_name))});
    else if(x.state_key==='fc_prazos')out.push(x);
  }
  return out;
}
async function states(r,e){
  const u=await auth(r,e);if(!u)return json({error:'Não autenticado.'},401);
  const p=new URL(r.url).pathname;
  if(r.method==='GET'&&p==='/api/state'){
    const x=await e.DB.prepare('SELECT state_key,state_value,version,updated_by,updated_at FROM app_state ORDER BY state_key').all();
    const rows=x.results||[];return json({states:manager(u)?rows:await analystView(r,e,u,rows)});
  }
  const k=decodeURIComponent(p.slice('/api/state/'.length));
  if(!valid(k))return json({error:'Chave inválida.'},400);
  if(r.method==='PUT'){
    if(!manager(u)&&!ownStateKeys.has(k))return json({error:'Acesso não autorizado para esta informação.'},403);
    const b=await r.json().catch(()=>null);if(typeof b?.value!=='string'||b.value.length>600000)return json({error:'Estado inválido.'},413);
    const incoming=parse(b.value,null);if(incoming===null)return json({error:'Conteúdo JSON inválido.'},400);
    if(!manager(u)&&k==='fc_execucoes'){
      const lojaRow=await readState(e,'fc_lojas');
      const lojas=parse(lojaRow?.state_value,[]);const ids=ownedStoreIds(lojas,u);
      const currentRow=await readState(e,k);const current=parse(currentRow?.state_value,{});const merged={...(current&&typeof current==='object'?current:{})};
      for(const [ek,ev] of Object.entries(incoming&&typeof incoming==='object'?incoming:{})){if(ids.has(String(ek).split('|')[0]))merged[ek]=ev}
      for(const ek of Object.keys(merged)){if(!ids.has(String(ek).split('|')[0]))continue;if(!(incoming&&Object.prototype.hasOwnProperty.call(incoming,ek)))delete merged[ek]}
      b.value=JSON.stringify(merged);
    } else if(!manager(u)){
      if(k==='fc_alertas')b.value=JSON.stringify(filterAlerts(incoming,u.display_name));
      if(k==='fc_mensagens_gestao')b.value=JSON.stringify(filterMessages(incoming,u.display_name));
    }
    const o=await readState(e,k);const v=Number(o?.version||0)+1;
    await e.DB.prepare(`INSERT INTO app_state(state_key,state_value,version,updated_by,updated_at) VALUES(?,?,?,?,datetime('now')) ON CONFLICT(state_key) DO UPDATE SET state_value=excluded.state_value,version=excluded.version,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).bind(k,b.value,v,u.display_name||u.username).run();
    return json({ok:true,version:v});
  }
  if(r.method==='DELETE'){
    if(!manager(u))return json({error:'Somente a gestão pode remover dados centrais.'},403);
    await e.DB.prepare('DELETE FROM app_state WHERE state_key=?').bind(k).run();return json({ok:true});
  }
  return json({error:'Método não permitido.'},405);
}
async function asset(r,e){const x=await authWorker.fetch(r,e);const ct=x.headers.get('content-type')||'';if(!ct.includes('text/html'))return x;let t=await x.text();if(!t.includes('persistencia-central.js'))t=t.replace(/<\/head>/i,'<script src="/persistencia-central.js?v=4" defer></script></head>');if(!t.includes('acompanhamento-gestao-consolidado.js'))t=t.replace(/<\/body>/i,'<script src="/acompanhamento-gestao-consolidado.js?v=3"></script></body>');return new Response(t,{status:x.status,statusText:x.statusText,headers:x.headers})}
export default {async fetch(r,e){try{const p=new URL(r.url).pathname;if(p==='/api/state'||p.startsWith('/api/state/'))return states(r,e);return asset(r,e)}catch(x){console.error(x);return json({error:'Erro interno do Fiscal Control.'},500)}}};
