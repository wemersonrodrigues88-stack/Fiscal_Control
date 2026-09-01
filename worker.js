const OBLIGATIONS = ['ICMS','PIS/COFINS','ISS','SPED ICMS','Fronteiras'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api(request, env, url);
    return env.ASSETS.fetch(request);
  }
};

async function api(request, env, url) {
  if (!env.DB) return json({error:'Banco de dados não configurado no Worker. Vincule o D1 em wrangler.toml antes do deploy.'}, 503);
  await ensureSchema(env.DB);
  const method = request.method;
  try {
    if (url.pathname === '/api/health') return json({ok:true, service:'fiscal-control', version:'clean-v1'});
    if (url.pathname === '/api/auth/login' && method === 'POST') return login(request, env);
    if (url.pathname === '/api/auth/logout' && method === 'POST') return logout();
    const user = await sessionUser(request, env);
    if (!user) return json({error:'Não autenticado'},401);
    if (url.pathname === '/api/me') return json({user});
    if (url.pathname === '/api/state' && method === 'GET') return state(env.DB, user);
    if (url.pathname === '/api/executions' && method === 'PUT') return updateExecution(request, env.DB, user);
    if (url.pathname === '/api/stores' && method === 'PUT') return updateStore(request, env.DB, user);
    return json({error:'Rota não encontrada'},404);
  } catch (e) { return json({error:'Erro interno', detail:e.message},500); }
}

async function ensureSchema(db){
  const sql = `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, profile TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS analysts (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, level TEXT, status TEXT NOT NULL DEFAULT 'Ativo');
  CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, number TEXT UNIQUE NOT NULL, name TEXT NOT NULL, uf TEXT NOT NULL, analyst_id TEXT, active INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS executions (id TEXT PRIMARY KEY, store_id TEXT NOT NULL, obligation TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pendente', updated_at TEXT NOT NULL, updated_by TEXT, UNIQUE(store_id, obligation));
  CREATE TABLE IF NOT EXISTS deadlines (id TEXT PRIMARY KEY, obligation TEXT NOT NULL, uf TEXT NOT NULL, due_date TEXT, note TEXT);
  CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, entity TEXT, entity_id TEXT, details TEXT, created_at TEXT NOT NULL);`;
  for (const statement of sql.split(';').map(x=>x.trim()).filter(Boolean)) await db.prepare(statement).run();
}

async function state(db,user){
  const [users, analysts, stores, executions, deadlines] = await Promise.all([
    db.prepare('SELECT id,name,profile,active FROM users WHERE active=1').all(),
    db.prepare('SELECT id,name,level,status FROM analysts WHERE status=? ORDER BY name').bind('Ativo').all(),
    user.profile==='Analista' ? db.prepare('SELECT s.id,s.number,s.name,s.uf,s.analyst_id,a.name analyst FROM stores s LEFT JOIN analysts a ON a.id=s.analyst_id WHERE s.active=1 AND a.name=? ORDER BY CAST(s.number AS INTEGER),s.name').bind(user.name).all() : db.prepare('SELECT s.id,s.number,s.name,s.uf,s.analyst_id,a.name analyst FROM stores s LEFT JOIN analysts a ON a.id=s.analyst_id WHERE s.active=1 ORDER BY CAST(s.number AS INTEGER),s.name').all(),
    db.prepare('SELECT id,store_id,obligation,status,updated_at,updated_by FROM executions').all(),
    db.prepare('SELECT id,obligation,uf,due_date,note FROM deadlines ORDER BY due_date').all()
  ]);
  return json({user, users:users.results, analysts:analysts.results, stores:stores.results, executions:executions.results, deadlines:deadlines.results, obligations:OBLIGATIONS});
}

async function login(request,env){
  const body=await request.json();
  const username=String(body.username||'').trim();
  const password=String(body.password||'');
  if(!username||!password)return json({error:'Informe usuário e senha'},400);
  const row=await env.DB.prepare('SELECT * FROM users WHERE username=? AND active=1').bind(username).first();
  if(!row || !(await verify(password,row.password_hash))) return json({error:'Usuário ou senha inválidos'},401);
  const token=await sign({id:row.id,exp:Date.now()+8*60*60*1000},env.SESSION_SECRET);
  return json({user:{id:row.id,name:row.name,profile:row.profile}},200,{'Set-Cookie':`fc_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`});
}
async function logout(){return json({ok:true},200,{'Set-Cookie':'fc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'});}
async function sessionUser(request,env){const cookie=request.headers.get('Cookie')||'';const m=cookie.match(/(?:^|; )fc_session=([^;]+)/);if(!m)return null;const data=await unsign(m[1],env.SESSION_SECRET);if(!data||data.exp<Date.now())return null;return await env.DB.prepare('SELECT id,name,profile,active FROM users WHERE id=? AND active=1').bind(data.id).first();}
async function updateExecution(request,db,user){if(!['Gerente','Coordenador','Desenvolvedor'].includes(user.profile)&&user.profile!=='Analista')return json({error:'Sem permissão'},403);const b=await request.json();if(!OBLIGATIONS.includes(b.obligation)||!['Pendente','Analisando','Finalizado'].includes(b.status))return json({error:'Dados inválidos'},400);const id=crypto.randomUUID(),now=new Date().toISOString();await db.prepare(`INSERT INTO executions(id,store_id,obligation,status,updated_at,updated_by) VALUES(?,?,?,?,?,?) ON CONFLICT(store_id,obligation) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).bind(id,b.store_id,b.obligation,b.status,now,user.id).run();await audit(db,user,'UPDATE','execution',b.store_id,JSON.stringify(b));return json({ok:true});}
async function updateStore(request,db,user){if(!['Gerente','Coordenador','Desenvolvedor'].includes(user.profile))return json({error:'Sem permissão'},403);const b=await request.json();if(!b.id||!b.analyst_id)return json({error:'Dados inválidos'},400);await db.prepare('UPDATE stores SET analyst_id=? WHERE id=?').bind(b.analyst_id,b.id).run();await audit(db,user,'UPDATE','store',b.id,JSON.stringify(b));return json({ok:true});}
async function audit(db,user,action,entity,entityId,details){await db.prepare('INSERT INTO audit_log(id,user_id,action,entity,entity_id,details,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,action,entity,entityId,details,new Date().toISOString()).run();}
async function hash(text){const data=new TextEncoder().encode(text);const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function verify(text,stored){return await hash(text)===stored;}
async function sign(obj,secret){const payload=btoa(JSON.stringify(obj)).replaceAll('=','');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));return payload+'.'+btoa(String.fromCharCode(...new Uint8Array(sig))).replaceAll('=','');}
async function unsign(token,secret){try{const [payload,sig]=token.split('.');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);const ok=await crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(sig),c=>c.charCodeAt(0)),new TextEncoder().encode(payload));return ok?JSON.parse(atob(payload)):null}catch{return null}}
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}})}
