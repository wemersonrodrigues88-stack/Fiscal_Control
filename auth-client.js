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
        if (state.user.mustChangePassword) await forcePasswordChange();
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
    if (!option) { option = new Option(state.user.nome, state.user.nome); select.add(option); }
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
        if (text === 'equipe' || (text.includes('analistas') && btn.closest('#page-dashboard'))) btn.style.display = 'none';
      });
    }
  }

  async function applyAccess() {
    hideManualUserSelector();
    applyNavAccess();
    window.FC_AUTH = { user: state.user, allowedPages: allowedPages(), isDeveloper: state.user?.privilegio === 'Desenvolvedor' };
    if (typeof window.render === 'function') { try { window.render(); } catch (_) {} }
    installDeveloperAdmin();
  }

  function modal(title, bodyHtml) {
    const old = document.getElementById('fc-auth-modal');
    if (old) old.remove();
    const root = el('div', { id: 'fc-auth-modal', class: 'fc-auth-modal' });
    root.innerHTML = `<div class="fc-auth-modal-backdrop"></div><div class="fc-auth-modal-card"><div class="fc-auth-modal-head"><strong>${title}</strong><button type="button" id="fc-auth-modal-close">×</button></div><div class="fc-auth-modal-body">${bodyHtml}</div></div>`;
    document.body.appendChild(root);
    root.querySelector('#fc-auth-modal-close').onclick = () => root.remove();
    root.querySelector('.fc-auth-modal-backdrop').onclick = () => root.remove();
    return root;
  }

  async function forcePasswordChange() {
    const root = modal('Defina sua senha', `<p>Por segurança, defina uma senha pessoal antes de continuar.</p><form id="fc-password-form"><label>Nova senha<input id="fc-new-password" type="password" minlength="10" required></label><label>Confirmar senha<input id="fc-new-password2" type="password" minlength="10" required></label><div id="fc-password-error" class="fc-auth-error"></div><button class="fc-auth-submit" type="submit">Salvar senha</button></form>`);
    root.querySelector('#fc-password-form').addEventListener('submit', async e => {
      e.preventDefault();
      const p = root.querySelector('#fc-new-password').value;
      const p2 = root.querySelector('#fc-new-password2').value;
      const err = root.querySelector('#fc-password-error');
      if (p.length < 10 || p !== p2) { err.textContent = p.length < 10 ? 'Use pelo menos 10 caracteres.' : 'As senhas não conferem.'; return; }
      const r = await fetch('/api/change-password', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify({password:p}) });
      const d = await r.json().catch(()=>({}));
      if (!r.ok) { err.textContent = d.error || 'Não foi possível salvar.'; return; }
      state.user.mustChangePassword = false;
      root.remove();
    });
  }

  function installDeveloperAdmin() {
    if (state.user?.privilegio !== 'Desenvolvedor' || document.getElementById('fc-admin-users-btn')) return;
    const button = el('button', { id:'fc-admin-users-btn', type:'button', text:'Usuários' });
    button.style.cssText = 'position:fixed;right:140px;top:16px;z-index:9998;border:1px solid #d8e1ef;background:#fff;border-radius:8px;padding:9px 13px;font-weight:700;cursor:pointer;';
    button.onclick = openUserAdmin;
    document.body.appendChild(button);
  }

  async function openUserAdmin() {
    const root = modal('Usuários e acessos', `<div id="fc-users-loading">Carregando usuários…</div>`);
    const r = await fetch('/api/users', { credentials:'same-origin', cache:'no-store' });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { root.querySelector('.fc-auth-modal-body').textContent = d.error || 'Não foi possível carregar usuários.'; return; }
    const users = d.users || [];
    root.querySelector('.fc-auth-modal-body').innerHTML = `<p>Altere perfil, situação ou redefina a senha sem mudar o layout principal.</p><div id="fc-users-list"></div><hr><h4>Novo usuário</h4><form id="fc-new-user"><input name="nome" placeholder="Nome" required><input name="username" placeholder="Usuário" required><select name="perfil"><option>Analista</option><option>Coordenador</option><option>Gerente</option></select><select name="situacao"><option>Ativo</option><option>Férias</option><option>Licença médica</option><option>Pediu demissão</option><option>Demissão</option></select><input name="password" type="password" minlength="10" placeholder="Senha inicial" required><button class="fc-auth-submit">Criar usuário</button><div id="fc-users-error" class="fc-auth-error"></div></form>`;
    const list = root.querySelector('#fc-users-list');
    users.forEach(u => {
      const row = document.createElement('div'); row.style.cssText='display:grid;grid-template-columns:1.4fr .9fr .9fr 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #e6ebf2;';
      row.innerHTML = `<strong>${u.display_name}</strong><span>${u.username}</span><span>${u.profile}</span><span>${u.status}</span><button type="button">Redefinir senha</button>`;
      row.querySelector('button').onclick = async () => { const p = prompt('Nova senha para '+u.display_name+' (mínimo 10 caracteres):'); if (!p) return; if (p.length<10) return alert('A senha deve ter pelo menos 10 caracteres.'); const rr=await fetch('/api/users/'+encodeURIComponent(u.username),{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({password:p})}); if(!rr.ok){const dd=await rr.json().catch(()=>({}));alert(dd.error||'Erro');} else alert('Senha redefinida.'); };
      list.appendChild(row);
    });
    root.querySelector('#fc-new-user').addEventListener('submit', async e => {
      e.preventDefault(); const fd=new FormData(e.target); const body=Object.fromEntries(fd.entries()); const err=root.querySelector('#fc-users-error');
      const rr=await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)}); const dd=await rr.json().catch(()=>({}));
      if(!rr.ok){err.textContent=dd.error||'Não foi possível criar.';return;} err.textContent='Usuário criado. Feche e abra a administração para atualizar.';
    });
  }

  async function checkSession() {
    ensureUi();
    try {
      const response = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
      if (response.ok) {
        const data = await response.json(); state.user = data.user; await applyAccess(); showApp(); if(state.user.mustChangePassword) await forcePasswordChange(); return;
      }
      if (response.status === 503) showLogin('O servidor de autenticação ainda precisa ser configurado.'); else showLogin();
    } catch (_) { showLogin('Não foi possível validar a sessão.'); }
    finally { state.ready = true; }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    state.user = null;
    const admin = document.getElementById('fc-admin-users-btn'); if(admin) admin.remove();
    showLogin();
  }

  window.FCAuth = { checkSession, logout, getUser: () => state.user };

  document.addEventListener('DOMContentLoaded', () => {
    ensureUi(); checkSession();
    let attempts = 0;
    const timer = setInterval(() => { if (state.user) { hideManualUserSelector(); installDeveloperAdmin(); } if (++attempts > 30) clearInterval(timer); }, 250);
  });
})();

/* auth-ui activation trigger v3 */
