INSERT OR IGNORE INTO users(id,username,password_hash,name,profile,active) VALUES
('u-dev','desenvolvedor','pbkdf2:120000:WXyg/P//tTVme115lV7Bkw==:73s4gxn+qFt3+WSMlgGfgoCic233K0862KAlCri6sHc=','Wemerson','Desenvolvedor',1),
('u-ger','gerente','pbkdf2:120000:DOOyS4BJ8Xw8U6IDK0SOjg==:VQprFzu8OAVYWYUdJces0ZGuEu41wWClaUFSM9jPbEw=','Daniela','Gerente',1),
('u-coord','coordenador','pbkdf2:120000:+jPaVG+xuIVDxcmAY04AbQ==:LeHPnTOHJnIozk/eq1fq5XMIo+DqjOf1mEc+8DAf6ZE=','Leonardo','Coordenador',1),
('u-analista','analista','pbkdf2:120000:IjmBL4I22X3Pnkugyt56HA==:fou9jGvAqg3DJEbqe4E4m4kvHFUfmFronqkpMFEupJU=','Analista','Analista',1);
INSERT OR IGNORE INTO analysts(id,name,level,status) VALUES
('a-juliane','Juliane','Sênior','Ativo'),('a-luanna','Luanna','Júnior','Ativo'),('a-dennys','Dennys','Sênior','Ativo'),('a-julia','Julia','Pleno','Ativo'),('a-taciana','Taciana','Pleno','Ativo'),('a-livia','Lívia','Sênior','Ativo'),('a-augustus','Augustus','Pleno','Ativo'),('a-gustavo','Gustavo','Pleno','Ativo'),('a-angela','Angela','Pleno','Ativo');
