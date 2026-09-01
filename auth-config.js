/* Fiscal Control — integração da autenticação.
   A identidade e as permissões reais vêm exclusivamente do Worker/D1.
*/
window.FC_AUTH_CONFIG={
  version:2,
  mode:'backend-required',
  loginPath:'/api/login',
  sessionKey:'fc_session',
  profiles:['Analista','Coordenador','Gerente','Gestão'],
  privileges:['Desenvolvedor']
};
