const SESSION_COOKIE = 'fc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_ITERATIONS = 310000;
let schemaReady;

const ALL_PAGES = ['dashboard','apuracoes','carteiras','prazos','historico','equipe'];
const PROFILE_RULES = {
  Analista: { pages: ['dashboard', 'apuracoes'], carteira: 'propria' },
  Coordenador: { pages: ALL_PAGES, carteira: 'todas' },
  Gerente: { pages: ALL_PAGES, carteira: 'todas' }
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  profile TEXT NOT NULL CHECK (profile IN ('Analista','Coordenador','Gerente')),
  privilege TEXT NULL CHECK (privilege IS NULL OR privilege IN ('Desenvolvedor')),
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Férias','Licença médica','Demissão','Pediu demissão')),
  password_hash TEXT,
  password_salt TEXT,
  password_iterations INTEGER DEFAULT 310000,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
INSERT OR IGNORE INTO users(username,display_name,profile,privilege,status) VALUES
('wemerson','Wemerson','Analista','Desenvolvedor','Ativo'),
('daniela','Daniela','Gerente',NULL,'Ativo'),
('leonardo','Leonardo','Coordenador',NULL,'Ativo');
`;

async function ensureSchema(env) {
  if (!env.DB) return false;
  if (!schemaReady) schemaReady = env.DB.exec(SCHEMA_SQL).catch(err => { schemaReady = null; throw err; });
  await schemaReady;
  return true;
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });
}

function cookieValue(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function base64url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(text) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

async function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function hashPassword(password, saltB64, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: base64urlBytes(saltB64), iterations, hash: 'SHA-256' }, key, 256);
  return hex(bits);
}

async function makePasswordRecord(password) {
  const saltB64 = base64url(crypto.getRandomValues(new Uint8Array(16)));
  return { salt: saltB64, hash: await hashPassword(password, saltB64), iterations: PASSWORD_ITERATIONS };
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    nome: row.display_name,
    perfil: row.profile,
    privilegio: row.privilege,
    situacao: row.status,
    mustChangePassword: !!row.must_change_password,
    pages: row.privilege === 'Desenvolvedor' ? ALL_PAGES : (PROFILE_RULES[row.profile]?.pages || [])
  };
}

function canManage(user) {
  return !!user && (user.privilegio === 'Desenvolvedor' || user.perfil === 'Gerente' || user.perfil === 'Coordenador');
}

function canChangePrivilege(user) {
  return user?.privilegio === 'Desenvolvedor';
}

async function requireUser(request, env) {
  if (!env.DB) return { error: 'AUTH_DB_NOT_BOUND' };
  await ensureSchema(env);
  const raw = cookieValue(request, SESSION_COOKIE);
  if (!raw) return null;
  const tokenHash = await sha256(raw);
  const row = await env.DB.prepare(`
    SELECT u.id,u.username,u.display_name,u.profile,u.privilege,u.status,u.must_change_password
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>datetime('now') AND u.status='Ativo'
  `).bind(tokenHash).first();
  return row ? publicUser(row) : null;
}

async function login(request, env) {
  if (!env.DB) return json({ error: 'Banco de autenticação ainda não está vinculado ao Worker.' }, 503);
  await ensureSchema(env);
  const body = await request.json().catch(() => null);
  if (!body?.username || !body?.password) return json({ error: 'Usuário e senha são obrigatórios.' }, 400);
  const username = String(body.username).trim().toLowerCase();
  const row = await env.DB.prepare('SELECT * FROM users WHERE username=? LIMIT 1').bind(username).first();
  if (!row || row.status !== 'Ativo' || !row.password_hash || !row.password_salt) return json({ error: 'Usuário ou senha inválidos.' }, 401);
  const calculated = await hashPassword(String(body.password), row.password_salt, row.password_iterations || PASSWORD_ITERATIONS);
  if (!safeEqual(calculated, row.password_hash)) return json({ error: 'Usuário ou senha inválidos.' }, 401);
  const token = await randomToken();
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime(\'now\',\'+12 hours\'))').bind(await sha256(token), row.id).run();
  return json({ ok: true, user: publicUser(row) }, 200, { 'Set-Cookie': `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}` });
}

async function logout(request, env) {
  if (env.DB) {
    await ensureSchema(env);
    const raw = cookieValue(request, SESSION_COOKIE);
    if (raw) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(raw)).run();
  }
  return new Response(null, { status: 204, headers: { 'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`, 'Cache-Control': 'no-store' } });
}

async function changePassword(request, env, user) {
  const body = await request.json().catch(() => null);
  if (!body?.password || String(body.password).length < 10) return json({ error: 'A nova senha deve ter pelo menos 10 caracteres.' }, 400);
  const rec = await makePasswordRecord(String(body.password));
  await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=0,updated_at=datetime(\'now\') WHERE id=?').bind(rec.hash, rec.salt, rec.iterations, user.id).run();
  return json({ ok: true });
}

async function listUsers(request, env, actor) {
  if (!canManage(actor)) return json({ error: 'Acesso gerencial não autorizado.' }, 403);
  const result = await env.DB.prepare('SELECT id,username,display_name,profile,privilege,status,must_change_password,created_at,updated_at FROM users ORDER BY display_name').all();
  return json({ users: result.results || [] });
}

async function createUser(request, env, actor) {
  if (!canManage(actor)) return json({ error: 'Acesso gerencial não autorizado.' }, 403);
  const body = await request.json().catch(() => null);
  const username = String(body?.username || '').trim().toLowerCase();
  const nome = String(body?.nome || '').trim();
  const password = String(body?.password || '');
  const perfil = String(body?.perfil || 'Analista');
  const status = String(body?.situacao || 'Ativo');
  const privilegio = body?.privilegio === 'Desenvolvedor' && canChangePrivilege(actor) ? 'Desenvolvedor' : null;
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || !nome || password.length < 10) return json({ error: 'Usuário, nome ou senha inválidos. A senha deve ter pelo menos 10 caracteres.' }, 400);
  if (!PROFILE_RULES[perfil] || !['Ativo','Férias','Licença médica','Demissão','Pediu demissão'].includes(status)) return json({ error: 'Perfil ou situação inválidos.' }, 400);
  const rec = await makePasswordRecord(password);
  try {
    await env.DB.prepare('INSERT INTO users(username,display_name,profile,privilege,status,password_hash,password_salt,password_iterations,must_change_password) VALUES(?,?,?,?,?,?,?,?,1)')
      .bind(username,nome,perfil,privilegio,status,rec.hash,rec.salt,rec.iterations).run();
  } catch (_) { return json({ error: 'Não foi possível criar o usuário. Verifique se o usuário já existe.' }, 409); }
  return json({ ok: true });
}

async function updateUser(request, env, actor, username) {
  if (!canManage(actor)) return json({ error: 'Acesso gerencial não autorizado.' }, 403);
  const body = await request.json().catch(() => null);
  const row = await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(username).first();
  if (!row) return json({ error: 'Usuário não encontrado.' }, 404);
  const perfil = body?.perfil ? String(body.perfil) : row.profile;
  const status = body?.situacao ? String(body.situacao) : row.status;
  const privilegio = canChangePrivilege(actor) && body && Object.prototype.hasOwnProperty.call(body,'privilegio') ? (body.privilegio === 'Desenvolvedor' ? 'Desenvolvedor' : null) : row.privilege;
  if (!PROFILE_RULES[perfil] || !['Ativo','Férias','Licença médica','Demissão','Pediu demissão'].includes(status)) return json({ error: 'Perfil ou situação inválidos.' }, 400);
  if (String(row.username) === 'wemerson' && actor.username === 'wemerson' && status !== 'Ativo') return json({ error: 'O usuário desenvolvedor não pode ser desativado por esta rotina.' }, 400);
  if (body?.password) {
    if (String(body.password).length < 10) return json({ error: 'A senha deve ter pelo menos 10 caracteres.' }, 400);
    const rec = await makePasswordRecord(String(body.password));
    await env.DB.prepare('UPDATE users SET profile=?,privilege=?,status=?,password_hash=?,password_salt=?,password_iterations=?,must_change_password=1,updated_at=datetime(\'now\') WHERE username=?').bind(perfil,privilegio,status,rec.hash,rec.salt,rec.iterations,username).run();
  } else {
    await env.DB.prepare('UPDATE users SET profile=?,privilege=?,status=?,updated_at=datetime(\'now\') WHERE username=?').bind(perfil,privilegio,status,username).run();
  }
  return json({ ok: true });
}

async function bootstrap(request, env) {
  if (!env.BOOTSTRAP_TOKEN) return json({ error: 'Configure o segredo BOOTSTRAP_TOKEN no Worker antes do primeiro cadastro.' }, 503);
  if (request.headers.get('X-Bootstrap-Token') !== env.BOOTSTRAP_TOKEN) return json({ error: 'Não autorizado.' }, 401);
  await ensureSchema(env);
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.users) || !body.users.length) return json({ error: 'Informe a lista de usuários.' }, 400);
  for (const item of body.users) {
    const username = String(item.username || '').trim().toLowerCase();
    const password = String(item.password || '');
    const nome = String(item.nome || item.username || '').trim();
    const perfil = String(item.perfil || 'Analista');
    const privilegio = item.privilegio === 'Desenvolvedor' ? 'Desenvolvedor' : null;
    if (!username || !nome || password.length < 10 || !PROFILE_RULES[perfil]) return json({ error: `Dados inválidos para ${username || 'usuário'}.` }, 400);
    const rec = await makePasswordRecord(password);
    await env.DB.prepare(`INSERT INTO users(username,display_name,profile,privilege,status,password_hash,password_salt,password_iterations,must_change_password)
      VALUES(?,?,?,?,?,?,?,?,1)
      ON CONFLICT(username) DO UPDATE SET display_name=excluded.display_name,profile=excluded.profile,privilege=excluded.privilege,status='Ativo',password_hash=excluded.password_hash,password_salt=excluded.password_salt,password_iterations=excluded.password_iterations,must_change_password=1,updated_at=datetime('now')`)
      .bind(username,nome,perfil,privilegio, 'Ativo',rec.hash,rec.salt,rec.iterations).run();
  }
  return json({ ok: true, count: body.users.length });
}

async function api(request, env) {
  const { pathname } = new URL(request.url);
  if (request.method === 'GET' && pathname === '/api/health') {
    if (env.DB) await ensureSchema(env);
    return json({ ok: true, service: 'fiscal-control-auth', database: !!env.DB });
  }
  if (request.method === 'POST' && pathname === '/api/login') return login(request, env);
  if (request.method === 'POST' && pathname === '/api/logout') return logout(request, env);
  if (request.method === 'GET' && pathname === '/api/me') {
    const user = await requireUser(request, env);
    if (user?.error) return json({ authenticated: false, error: user.error }, 503);
    return user ? json({ authenticated: true, user }) : json({ authenticated: false }, 401);
  }
  if (request.method === 'POST' && pathname === '/api/bootstrap') return bootstrap(request, env);
  if (request.method === 'POST' && pathname === '/api/change-password') {
    const user = await requireUser(request, env);
    if (!user || user.error) return json({ error: 'Não autenticado.' }, 401);
    return changePassword(request, env, user);
  }
  if (pathname === '/api/users') {
    const actor = await requireUser(request, env);
    if (!actor || actor.error) return json({ error: 'Não autenticado.' }, 401);
    if (request.method === 'GET') return listUsers(request, env, actor);
    if (request.method === 'POST') return createUser(request, env, actor);
  }
  const match = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (match && request.method === 'PATCH') {
    const actor = await requireUser(request, env);
    if (!actor || actor.error) return json({ error: 'Não autenticado.' }, 401);
    return updateUser(request, env, actor, decodeURIComponent(match[1]).toLowerCase());
  }
  if (pathname.startsWith('/api/')) return json({ error: 'Rota não encontrada.' }, 404);
  return null;
}

function securityHeaders(headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return headers;
}

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const headers = securityHeaders(new Headers(response.headers));
  if ((headers.get('content-type') || '').includes('text/html')) {
    headers.set('Cache-Control', 'no-store');
    return new HTMLRewriter().on('head', { element(el) => {} }).transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers }));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    try {
      const result = await api(request, env);
      if (result) return result;
      const response = await env.ASSETS.fetch(request);
      const headers = securityHeaders(new Headers(response.headers));
      if ((headers.get('content-type') || '').includes('text/html')) {
        headers.set('Cache-Control', 'no-store');
        return new HTMLRewriter().on('head', {
          element(el) {
            el.append('<link rel="stylesheet" href="/auth-client.css"><script src="/auth-client.js" defer></script>', { html: true });
          }
        }).transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers }));
      }
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      console.error(error);
      return json({ error: 'Erro interno do serviço.', detail: 'Consulte os logs do Worker.' }, 500);
    }
  }
};
