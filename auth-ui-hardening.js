/* Fiscal Control — endurecimento da camada de autenticação no cliente.
   Não substitui a autorização do Worker; apenas sincroniza a UI com a sessão real. */
(() => {
  'use strict';
  let passwordPromptShown = false;
  let goGuardInstalled = false;
  let identityObserverInstalled = false;

  function user() {
    return window.FCAuth?.getUser?.() || window.FC_AUTH?.user || null;
  }

  function addStyle() {
    if (document.getElementById('fc-auth-hardening-style')) return;
    const style = document.createElement('style');
    style.id = 'fc-auth-hardening-style';
    style.textContent = `
      #fc-password-root{position:fixed;inset:0;z-index:10001;display:none;place-items:center;background:rgba(10,20,35,.72);backdrop-filter:blur(4px);padding:20px}
      #fc-password-root.show{display:grid}
      .fc-password-card{width:min(430px,100%);background:#fff;border:1px solid #e1e7ef;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.25);padding:26px}
      .fc-password-card h2{margin:0 0 7px;color:#172033;font-size:21px}.fc-password-card p{margin:0 0 18px;color:#687589;font-size:13px}
      .fc-password-card label{display:block;font-size:11px;font-weight:800;margin:12px 0 5px}.fc-password-card input{display:block;width:100%;padding:11px 12px;border:1px solid #d9e1eb;border-radius:9px;font:inherit}
      .fc-password-card button{margin-top:16px;width:100%;border:1px solid #1769e0;background:#1769e0;color:#fff;border-radius:9px;padding:11px 14px;font:inherit;font-weight:800;cursor:pointer}
      .fc-password-error{min-height:18px;color:#b42f2f;font-size:12px;margin-top:8px}
      .fc-auth-identity-select{display:none !important}
      .fc-auth-identity-avatar{display:grid !important;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function enforceIdentity() {
    const current = user();
    if (!current) return;
    const name = String(current.nome || current.display_name || current.username || '').trim();
    if (!name) return;
    addStyle();
    const select = document.getElementById('usuario');
    if (select) {
      let option = [...select.options].find(o => o.value === name);
      if (!option) { option = new Option(name, name); select.add(option); }
      select.value = name;
      select.disabled = true;
      select.classList.add('fc-auth-identity-select');
      select.setAttribute('aria-hidden', 'true');
    }
    const avatar = document.getElementById('avatar');
    if (avatar) {
      avatar.textContent = name.split(/\s+/).map(x => x[0]).slice(0,2).join('').toUpperCase();
      avatar.title = 'Sair do sistema';
      avatar.classList.add('fc-auth-identity-avatar');
      avatar.onclick = () => {
        if (confirm('Deseja sair do Fiscal Control?')) window.FCAuth?.logout?.();
      };
    }
    const persona = select?.closest('.persona');
    if (persona) persona.classList.add('fc-auth-identity-locked');
    if (!identityObserverInstalled && persona) {
      identityObserverInstalled = true;
      const observer = new MutationObserver(() => {
        const u = user();
        if (u) enforceIdentity();
      });
      observer.observe(persona, { childList:true, subtree:true });
    }
  }

  function ensurePasswordUi() {
    if (document.getElementById('fc-password-root')) return;
    addStyle();
    const root = document.createElement('div');
    root.id = 'fc-password-root';
    root.innerHTML = `
      <div class="fc-password-card">
        <h2>Defina sua senha</h2>
        <p>Por segurança, o primeiro acesso exige a definição de uma senha pessoal com pelo menos 10 caracteres.</p>
        <form id="fc-password-form">
          <label for="fc-new-password">Nova senha</label>
          <input id="fc-new-password" type="password" minlength="10" autocomplete="new-password" required>
          <label for="fc-new-password-2">Confirmar nova senha</label>
          <input id="fc-new-password-2" type="password" minlength="10" autocomplete="new-password" required>
          <button type="submit">Salvar senha e continuar</button>
          <div id="fc-password-error" class="fc-password-error" role="alert"></div>
        </form>
      </div>`;
    document.body.appendChild(root);
    root.querySelector('#fc-password-form').addEventListener('submit', async event => {
      event.preventDefault();
      const a = root.querySelector('#fc-new-password').value;
      const b = root.querySelector('#fc-new-password-2').value;
      const error = root.querySelector('#fc-password-error');
      error.textContent = '';
      if (a.length < 10) { error.textContent = 'A senha deve ter pelo menos 10 caracteres.'; return; }
      if (a !== b) { error.textContent = 'As senhas não coincidem.'; return; }
      const button = root.querySelector('button');
      button.disabled = true;
      button.textContent = 'Salvando…';
      try {
        const response = await fetch('/api/change-password', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify({password:a}) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a senha.');
        const current = user();
        if (current) current.mustChangePassword = false;
        root.classList.remove('show');
        document.body.classList.remove('fc-auth-locked');
      } catch (err) {
        error.textContent = err.message;
      } finally {
        button.disabled = false;
        button.textContent = 'Salvar senha e continuar';
      }
    });
  }

  function enforcePasswordChange() {
    const current = user();
    if (!current || !current.mustChangePassword || passwordPromptShown) return;
    passwordPromptShown = true;
    ensurePasswordUi();
    document.getElementById('fc-password-root').classList.add('show');
    document.body.classList.add('fc-auth-locked');
  }

  function installGoGuard() {
    if (goGuardInstalled || typeof window.go !== 'function') return;
    const original = window.go;
    window.go = function(page, ...args) {
      const current = user();
      const allowed = new Set(current?.pages || []);
      if (current?.privilegio === 'Desenvolvedor') return original.call(this, page, ...args);
      if (!allowed.has(page)) return false;
      return original.call(this, page, ...args);
    };
    goGuardInstalled = true;
  }

  function sync() {
    installGoGuard();
    enforcePasswordChange();
    enforceIdentity();
    const current = user();
    if (current && window.FC_ACCESS) {
      window.FC_ACCESS.currentUser = current;
      window.FC_ACCESS.realSession = true;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    let attempts = 0;
    const timer = setInterval(() => {
      sync();
      if (++attempts > 120 || (user() && goGuardInstalled && !user().mustChangePassword)) clearInterval(timer);
    }, 250);
  });
})();
