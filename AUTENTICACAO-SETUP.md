# Ativação da autenticação — Fiscal Control

## 1. Publicação
O projeto agora usa Workers Static Assets + Worker, mantendo o `index.html` existente como asset e adicionando a camada de autenticação no Worker.

## 2. D1
`wrangler.jsonc` declara a base `fiscal-control-auth` com binding `DB`. O Wrangler/Workers Builds pode provisionar a D1 automaticamente quando o deploy usa `npx wrangler deploy`.

## 3. Segredo de bootstrap
No Cloudflare: Workers & Pages > `fiscal-control` > Settings > Variables and Secrets > Add > Secret.

Nome:
`BOOTSTRAP_TOKEN`

Valor: criar uma senha/segredo forte, exclusivo para a ativação inicial. Não colocar esse valor no GitHub e não enviá-lo pelo chat.

## 4. Criar as credenciais
Após o deploy e a configuração do segredo, usar `POST /api/bootstrap` com o header `X-Bootstrap-Token` e um JSON contendo `users`.

Exemplo de estrutura (não usar senhas reais neste arquivo):
```json
{
  "users": [
    {"username":"wemerson","nome":"Wemerson","perfil":"Analista","privilegio":"Desenvolvedor","password":"SENHA_FORTE"},
    {"username":"daniela","nome":"Daniela","perfil":"Gerente","password":"SENHA_FORTE"},
    {"username":"leonardo","nome":"Leonardo","perfil":"Coordenador","password":"SENHA_FORTE"}
  ]
}
```

As senhas são transformadas em hash PBKDF2 com salt aleatório antes de serem armazenadas. O repositório nunca contém senhas.

## 5. Operação
Depois do bootstrap, o login usa cookie de sessão `HttpOnly`, `Secure`, `SameSite=Lax` com validade de 12 horas.

`GET /api/me` retorna a identidade e as páginas permitidas.
`POST /api/logout` encerra a sessão.
`POST /api/change-password` permite que o usuário altere a própria senha.
`GET /api/users` e `POST /api/users` são gerenciais.
`PATCH /api/users/:username` altera perfil/situação/senha; privilégio Desenvolvedor só pode ser alterado por um usuário Desenvolvedor.

## 6. Matriz
- Wemerson: Analista + Desenvolvedor, acesso técnico total.
- Daniela: Gerente, visão gerencial.
- Leonardo: Coordenador, visão gerencial.
- Analista ativo: dashboard/apurações e carteira própria.
- Férias/licença/demissão/pediu demissão: não recebe novas operações.

## 7. Importante
A interface atual ainda mantém seus dados operacionais no frontend/localStorage. A autenticação e autorização do Worker já são reais para a identidade e APIs. A etapa seguinte para segurança completa dos dados de lojas/apurações é mover essas entidades para D1 e fazer as leituras/escritas exclusivamente pelo Worker, evitando que um usuário consiga inspecionar dados de outra carteira no navegador.
