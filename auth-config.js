/* Fiscal Control — ponto de integração da autenticação.
   IMPORTANTE: não contém senhas nem segredos.
   A autenticação real deverá ser ligada ao backend/provedor de identidade.
*/
window.FC_AUTH_CONFIG={
  version:1,
  mode:'backend-required',
  loginPath:'/login',
  sessionKey:'fc_session',
  roles:{
    Wemerson:{perfil:'Analista',privilegio:'Desenvolvedor'},
    Daniela:{perfil:'Gerente',privilegio:null},
    Leonardo:{perfil:'Coordenador',privilegio:null}
  }
};
