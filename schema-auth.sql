PRAGMA foreign_keys = ON;

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

-- Usuários iniciais. As credenciais são definidas somente pelo endpoint protegido
-- /api/bootstrap usando o segredo BOOTSTRAP_TOKEN; nenhuma senha fica no repositório.
INSERT OR IGNORE INTO users(username, display_name, profile, privilege, status)
VALUES
  ('wemerson', 'Wemerson', 'Analista', 'Desenvolvedor', 'Ativo'),
  ('daniela', 'Daniela', 'Gerente', NULL, 'Ativo'),
  ('leonardo', 'Leonardo', 'Coordenador', NULL, 'Ativo');
