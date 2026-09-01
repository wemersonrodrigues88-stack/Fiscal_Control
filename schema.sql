CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, profile TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS analysts (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, level TEXT, status TEXT NOT NULL DEFAULT 'Ativo');
CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, number TEXT UNIQUE NOT NULL, name TEXT NOT NULL, uf TEXT NOT NULL, analyst_id TEXT, active INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (analyst_id) REFERENCES analysts(id));
CREATE TABLE IF NOT EXISTS executions (id TEXT PRIMARY KEY, store_id TEXT NOT NULL, obligation TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pendente', updated_at TEXT NOT NULL, updated_by TEXT, UNIQUE(store_id, obligation), FOREIGN KEY(store_id) REFERENCES stores(id));
CREATE TABLE IF NOT EXISTS deadlines (id TEXT PRIMARY KEY, obligation TEXT NOT NULL, uf TEXT NOT NULL, due_date TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, entity TEXT, entity_id TEXT, details TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_stores_analyst ON stores(analyst_id);
CREATE INDEX IF NOT EXISTS idx_exec_store ON executions(store_id);
CREATE INDEX IF NOT EXISTS idx_exec_status ON executions(status);
