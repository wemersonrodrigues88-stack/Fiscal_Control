(() => {
  'use strict';
  const state = { user: null, ready: false };

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => k === 'text' ? node.textContent = v : node.setAttribute(k, v));
    children.forEach(child => node.appendChild(child));
    return node;
  }

  function ensureUi() {
    if (document.getElementById('fc-auth-root')) return;
    const root = el('div', { id: 'fc-auth-root', class: 'fc-auth-hidden' });
    const card = el('div', { class: 'fc-auth-card' });
    card.innerHTML = `
      <div class="fc-auth-brand"><div class="fc-auth-mark">FC</div><div><strong>Fiscal Control</strong><small>Gestão Fiscal Mensal</small></div></div>
      <div class="fc-auth-title">Acesso ao sistema</div>
      <div class="fc-auth-sub">Entre com seu usuário e senha.</div>
      <form id="fc-login-form" autocomplete="on">
        <label>Usuário<input id="fc-username" name="username" autocomplete="username" required></label>
        <label>Senha<input id="fc-password" name="password" type="password" autocomplete="current-password" required></label>
        <button class="fc-auth-submit" type="submit">Entrar</button>
        <div id="fc-login-error" class="fc-auth-error" role="alert"></div>
      </form>
      <div id="fc-auth-loading" class="fc-auth-loading">Validando sessão…</div>`;
    root.appendChild(card);
    document.body.appendChild(root);
    root.querySelector('#fc-login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = root.querySelector('#fc-username').value.trim();
      const password = root.querySelector('#fc-password').value;
      const error = root.querySelector('#fc-login-error');
      const button = root.querySelector('.fc-auth-submit');
      error.textContent = '';
      button.disabled = true;
      button.textContent = 'Entrando…';
      try {
        const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ username, password }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
        state.user = data.user;
        await applyAccess();
        showApp();
      } catch (err) {
        error.textContent = err.message;
      } finally {
        button.disabled = false;
        button.textContent = 'Entrar';
      }
    });
  }

  function showLogin(message = '') {
    ensureUi();
    const root = document.getElementById('fc-auth-root');
    root.classList.remove('fc-auth-hidden');
    root.classList.add('fc-auth-show');
    const loading = root.querySelector('#fc-auth-loading');
    if (loading) loading.style.display = 'none';
    const error = root.querySelector('#fc-login-error');
    if (error) error.textContent = message;
    document.body.classList.add('fc-auth-locked');
  }

  function showApp() {
    ensureUi();
    const root = document.getElementById('fc-auth-root');
    root.classList.remove('fc-auth-show');
    root.classList.add('fc-auth-hidden');
    document.body.classList.remove('fc-auth-locked');
  }

  function hideManualUserSelector() {
    const select = document.getElementById('usuario');
    if (!select || !state.user) return false;
    let option = [...select.options].find(o => o.value === state.user.nome);
    if (!option) {
      option = new Option(state.user.nome, state.user.nome);
      select.add(option);
    }
    select.value = state.user.nome;
    select.disabled = true;
    const persona = select.closest('.persona');
    if (persona) select.style.display = 'none';
    const avatar = document.getElementById('avatar');
    if (avatar) avatar.textContent = state.user.nome.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
    return true;
  }

  function allowedPages() {
    if (!state.user) return [];
    if (state.user.privilegio === 'Desenvolvedor') return ['dashboard','apuracoes','carteiras','prazos','historico','equipe'];
    if (state.user.perfil === 'Gerente' || state.user.perfil === 'Coordenador') return ['dashboard','apuracoes','carteiras','prazos','historico','equipe'];
    return ['dashboard','apuracoes'];
  }

  function applyNavAccess() {
    const allowed = new Set(allowedPages());
    document.querySelectorAll('.nav button[data-page]').forEach(btn => {
      const page = btn.dataset.page;
      btn.style.display = allowed.has(page) ? '' : 'none';
    });
    if (!allowed.has('equipe')) {
      document.querySelectorAll('button').forEach(btn => {
        const text = (btn.textContent || '').trim().toLowerCase();
        if (text === 'equipe' || text.includes('analistas') && btn.closest('#page-dashboard')) btn.style.display = 'none';
      });
    }
  }

  async function applyAccess() {
    hideManualUserSelector();
    applyNavAccess();
    window.FC_AUTH = { user: state.user, allowedPages: allowedPages(), isDeveloper: state.user?.privilegio === 'Desenvolvedor' };
    if (typeof window.render === 'function') {
      try { window.render(); } catch (_) {}
    }
  }

  async function checkSession() {
    ensureUi();
    try {
      const response = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        state.user = data.user;
        await applyAccess();
        showApp();
        return;
      }
      if (response.status === 503) showLogin('O servidor de autenticação ainda precisa ser configurado.');
      else showLogin();
    } catch (_) {
      showLogin('Não foi possível validar a sessão.');
    } finally {
      state.ready = true;
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    state.user = null;
    showLogin();
  }

  window.FCAuth = { checkSession, logout, getUser: () => state.user };

  document.addEventListener('DOMContentLoaded', () => {
    ensureUi();
    checkSession();
    let attempts = 0;
    const timer = setInterval(() => {
      if (state.user) hideManualUserSelector();
      if (++attempts > 30) clearInterval(timer);
    }, 250);
  });
})();
