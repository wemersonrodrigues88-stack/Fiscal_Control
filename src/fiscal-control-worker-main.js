import authWorker from './fiscal-control-auth-worker.js';

let ready;
const SCHEMA = `CREATE TABLE IF NOT EXISTS app_state(state_key TEXT PRIMARY KEY,state_value TEXT,version INTEGER NOT NULL DEFAULT 1,updated_by TEXT,updated_at TEXT NOT NULL DEFAULT(datetime('now'));CREATE INDEX IF NOT EXISTS idx_app_state_updated ON app_state(updated_at);`;

const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

async function schema(e){
  if(!e.DB) throw Error('DB_NOT_BOUND');
  if(!ready) ready=e.DB.exec(SCHEMA).catch(x=>{ready=null;throw x});
  await ready;
}

function ck(r){
  const m=(r.headers.get('Cookie')||'').match(/(?:^|;\s*)fc_session=([^;]+)/);
  return m?.[1];
}

async function hash(s){
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))]
    .map(x=>x.toString(16).padStart(2,'0')).join('');
}

async function auth(r,e){
  await schema(e);
  const c=ck(r);
  if(!c) return null;
  return e.DB.prepare("SELECT u.id,u.username,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now') AND u.status='Ativo' LIMIT 1")
    .bind(await hash(c)).first();
}

const valid=k=>typeof k==='string'&&/^fc_[A-Za-z0-9_.:-]{1,180}$/.test(k)&&k!=='fc_central_sync_meta_v1';

async function states(r,e){
  const u=await auth(r,e);
  if(!u) return json({error:'Não autenticado.'},401);
  const p=new URL(r.url).pathname;

  if(r.method==='GET'&&p==='/api/state'){
    const x=await e.DB.prepare('SELECT state_key,state_value,version,updated_by,updated_at FROM app_state ORDER BY state_key').all();
    return json({states:x.results||[]});
  }

  const k=decodeURIComponent(p.slice('/api/state/'.length));
  if(!valid(k)) return json({error:'Chave inválida.'},400);

  if(r.method==='PUT'){
    const b=await r.json().catch(()=>null);
    if(typeof b?.value!=='string'||b.value.length>600000) return json({error:'Estado inválido.'},413);
    const o=await e.DB.prepare('SELECT version FROM app_state WHERE state_key=?').bind(k).first();
    const v=Number(o?.version||0)+1;
    await e.DB.prepare(`INSERT INTO app_state(state_key,state_value,version,updated_by,updated_at) VALUES(?,?,?,?,datetime('now')) ON CONFLICT(state_key) DO UPDATE SET state_value=excluded.state_value,version=excluded.version,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .bind(k,b.value,v,u.display_name||u.username).run();
    return json({ok:true,version:v});
  }

  if(r.method==='DELETE'){
    await e.DB.prepare('DELETE FROM app_state WHERE state_key=?').bind(k).run();
    return json({ok:true});
  }

  return json({error:'Método não permitido.'},405);
}

async function asset(r,e){
  const x=await authWorker.fetch(r,e);
  const ct=x.headers.get('content-type')||'';
  if(!ct.includes('text/html')) return x;
  let t=await x.text();
  if(!t.includes('persistencia-central.js')){
    t=t.replace(/<\/head>/i,'<script src="/persistencia-central.js?v=2" defer></script></head>');
  }
  return new Response(t,{status:x.status,statusText:x.statusText,headers:x.headers});
}

export default {
  async fetch(r,e){
    try{
      const p=new URL(r.url).pathname;
      if(p==='/api/state'||p.startsWith('/api/state/')) return states(r,e);
      return asset(r,e);
    }catch(x){
      console.error(x);
      return json({error:'Erro interno do Fiscal Control.'},500);
    }
  }
};
