# Fiscal Control — Autenticação e controle de acesso

## Objetivo
Preparar a migração do seletor de usuário atual para autenticação individual real, preservando a interface e as regras já validadas.

## Identidades
- Wemerson: perfil operacional Analista + privilégio Desenvolvedor.
- Daniela: Gerente.
- Leonardo: Coordenador.
- Analistas ativos: acesso somente à própria carteira.
- Inativos: sem novas atribuições e fora do acompanhamento operacional.

## Segurança
Senhas não devem ser armazenadas no JavaScript, HTML ou localStorage. A autenticação real deve ocorrer em serviço de backend, com senha armazenada por hash, sessão/token seguro e autorização no servidor.

## Critérios de aceite
1. Cada usuário possui credencial própria.
2. Login identifica automaticamente o usuário.
3. Logout encerra a sessão.
4. Analista não acessa dados fora da carteira.
5. Gerente/coordenador possuem visão gerencial.
6. Wemerson mantém perfil Analista e privilégio Desenvolvedor.
7. Alterações de equipe/carteira refletem nas permissões.
8. Credenciais não ficam expostas no frontend.
9. O sistema atual continua funcionando durante a migração.
10. Testes devem ser realizados em ambiente publicado antes da liberação para o fechamento.
