const SESSION_COOKIE = 'fc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_ITERATIONS = 310000;

const PROFILE_RULES = {
  Analista: { pages: ['dashboard', 'apuracoes'], gerencial: false, carteira: 'propria' },
  Coordenador: { pages: ['dashboard', 'apuracoes', 'carteiras', 'prazos', 'historico', 'equipe'], gerencial: true, carteira: 'todas' },
  Gerente: { pages: ['dashboard', 'apuracoes', 'carteiras', 'prazos', 'historico', 'equipe'], gerencial: true, carteira: 'todas' }
};

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
  const salt = Uint8Array.from(atob(saltB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return hex(bits);
}

async function makePasswordRecord(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = base64url(salt);
  return { salt: saltB64, hash: await hashPassword(password, saltB64), iterations: PASSWORD_ITERATIONS };
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function requireUser(request, env) {
  if (!env.DB) return { error: 'AUTH_DB_NOT_BOUND' };
  const raw = cookieValue(request, SESSION_COOKIE);
  if (!raw) return null;
  const tokenHash = await sha256(raw);
  const row = await env.DB.prepare(`
    SELECT u.id,u.username,u.display_name,u.profile,u.privilege,u.status,u.must_change_password,s.expires_at
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>datetime('now') AND u.status='Ativo'
  `).bind(tokenHash).first();
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    nome: row.display_name,
    perfil: row.profile,
    privilegio: row.privilege,
    situacao: row.status,
    mustChangePassword: !!row.must_change_password,
    pages: row.privilege === 'Desenvolvedor' ? Object.keys(PROFILE_RULES.Analista.pages.reduce((a,p)=>{a[p]=1;return a},{})).concat(['carteiras','prazos','historico','equipe']).filter((v,i,a)=>a.indexOf(v)===i) : (PROFILE_RULES[row.profile]?.pages || [])
  };
}

function canManage(user) {
  return user && (user.privilegio === 'Desenvolvedor' || user.perfil === 'Gerente' || user.perfil === 'Coordenador');
}

async function login(request, env) {
  if (!env.DB) return json({ error: 'Banco de autenticação ainda não está vinculado ao Worker.' }, 503);
  const body = await request.json().catch(() => null);
  if (!body?.username || !body?.password) return json({ error: 'Usuário e senha são obrigatórios.' }, 400);
  const username = String(body.username).trim().toLowerCase();
  const row = await env.DB.prepare('SELECT * FROM users WHERE username=? LIMIT 1').bind(username).first();
  if (!row || row.status !== 'Ativo' || !row.password_hash || !row.password_salt) return json({ error: 'Usuário ou senha inválidos.' }, 401);
  const calculated = await hashPassword(String(body.password), row.password_salt, row.password_iterations || PASSWORD_ITERATIONS);
  if (!safeEqual(calculated, row.password_hash)) return json({ error: 'Usuário ou senha inválidos.' }, 401);
  const token = await randomToken();
  const tokenHash = await sha256(token);
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime(\'now\',\'+12 hours\'))').bind(tokenHash, row.id).run();
  const headers = { 'Set-Cookie': `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}` };
  return json({ ok: true, user: { username: row.username, nome: row.display_name, perfil: row.profile, privilegio: row.privilege, situacao: row.status, mustChangePassword: !!row.must_change_password } }, 200, headers);
}

async function logout(request, env) {
  if (env.DB) {
    const raw = cookieValue(request, SESSION_COOKIE);
    if (raw) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(raw)).run();
  }
  return new Response(null, { status: 204, headers: { 'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`, 'Cache-Control': 'no-store' } });
}

async function me(request, env) {
  const user = await requireUser(request, env);
  if (user?.error === 'AUTH_DB_NOT_BOUND') return json({ authenticated: false, error: user.error }, 503);
  if (!user) return json({ authenticated: false }, 401);
  return json({ authenticated: true, user });
}

async function changePassword(request, env, user) {
  const body = await request.json().catch(() => null);
  if (!body?.password || String(body.password).length < 10) return json({ error: 'A nova senha deve ter pelo menos 10 caracteres.' }, 400);
  const rec = await makePasswordRecord(String(body.password));
  await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=0,updated_at=datetime(\'now\') WHERE id=?').bind(rec.hash, rec.salt, rec.iterations, user.id).run();
  return json({ ok: true });
}

async function bootstrap(request, env) {
  if (!env.BOOTSTRAP_TOKEN) return json({ error: 'Bootstrap não configurado.' }, 503);
  if (request.headers.get('X-Bootstrap-Token') !== env.BOOTSTRAP_TOKEN) return json({ error: 'Não autorizado.' }, 401);
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.users) || !body.users.length) return json({ error: 'Informe a lista de usuários.' }, 400);
  for (const item of body.users) {
    const username = String(item.username || '').trim().toLowerCase();
    const password = String(item.password || '');
    const displayName = String(item.nome || item.username || '').trim();
    const profile = String(item.perfil || 'Analista');
    const privilege = item.privilegio ? String(item.privilegio) : null;
    if (!username || password.length < 10 || !displayName) return json({ error: `Dados inválidos para ${username || 'usuário'}.` }, 400);
    const rec = await makePasswordRecord(password);
    await env.DB.prepare(`INSERT INTO users(username,display_name,profile,privilege,status,password_hash,password_salt,password_iterations,must_change_password)
      VALUES(?,?,?,?,?,?,?,?,1)
      ON CONFLICT(username) DO UPDATE SET display_name=excluded.display_name,profile=excluded.profile,privilege=excluded.privilege,status=excluded.status,password_hash=excluded.password_hash,password_salt=excluded.password_salt,password_iterations=excluded.password_iterations,must_change_password=1,updated_at=datetime('now')`
    ).bind(username, displayName, profile, privilege, 'Ativo', rec.hash, rec.salt, rec.iterations).run();
  }
  return json({ ok: true, count: body.users.length });
}

async function api(request, env) {
  const { pathname } = new URL(request.url);
  if (request.method === 'GET' && pathname === '/api/health') return json({ ok: true, service: 'fiscal-control-auth', database: !!env.DB });
  if (request.method === 'POST' && pathname === '/api/login') return login(request, env);
  if (request.method === 'POST' && pathname === '/api/logout') return logout(request, env);
  if (request.method === 'GET' && pathname === '/api/me') return me(request, env);
  if (request.method === 'POST' && pathname === '/api/bootstrap') return bootstrap(request, env);
  if (request.method === 'POST' && pathname === '/api/change-password') {
    const user = await requireUser(request, env);
    if (!user || user.error) return json({ error: 'Não autenticado.' }, 401);
    return changePassword(request, env, user);
  }
  if (pathname.startsWith('/api/')) return json({ error: 'Rota não encontrada.' }, 404);
  return null;
}

function securityHeaders(headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Cache-Control', 'no-store');
  return headers;
}

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const headers = securityHeaders(new Headers(response.headers));
  if ((headers.get('content-type') || '').includes('text/html')) {
    return new HTMLRewriter()
      .on('head', {
        element(el) {
          el.append('<link rel="stylesheet" href="/auth-client.css"><script src="/auth-client.js" defer></script>', { html: true });
        }
      })
      .transform(new Response(response.body, { status: response.status, headers }));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    try {
      const result = await api(request, env);
      if (result) return result;
      return serveAsset(request, env);
    } catch (error) {
      console.error(error);
      return json({ error: 'Erro interno do serviço.', detail: 'Consulte os logs do Worker.' }, 500);
    }
  }
};
