/* Fiscal Control — autorização centralizada por sessão.
   A identidade vem exclusivamente do usuário autenticado no backend.
   NÃO usar nome de usuário como mecanismo de permissão e NÃO trocar a identidade
   autenticada para simular outro gestor.
*/
(function(){
'use strict';
const INACTIVE=['Férias','Licença médica','Demissão','Pediu demissão'];
function auth(){try{return window.FCAuth?.getUser?.()||window.FC_AUTH?.user||null}catch(e){return null}}
function resolve(){
 const u=auth();
 if(!u)return {nome:'',perfil:'',privilegio:null,situacao:''};
 return {nome:String(u.nome||u.display_name||''),perfil:String(u.perfil||u.profile||'Analista'),privilegio:u.privilegio||u.privilege||null,situacao:String(u.situacao||u.status||'Ativo')};
}
function isDeveloper(){return resolve().privilegio==='Desenvolvedor'}
function isManager(){const p=resolve().perfil;return isDeveloper()||p==='Gerente'||p==='Coordenador'||p==='Gestão'}
function isAnalyst(){return resolve().perfil==='Analista'&&!isManager()}
function activeAnalyst(m){return m&&String(m.funcao||'').trim().toLowerCase()==='analista'&&String(m.situacao||'Ativo').trim()==='Ativo'}
function canSeePage(page){
 if(isManager())return ['dashboard','apuracoes','carteiras','prazos','historico','equipe'].includes(page);
 if(isAnalyst())return ['dashboard','apuracoes'].includes(page);
 return false;
}
function expose(){window.FC_ACCESS={resolve,isDeveloper,isManager,isAnalyst,canSeePage,activeAnalyst,INACTIVE}}
expose();
function syncManagementAccess(){
 const allowed=isManager();
 document.querySelectorAll('.nav button[data-page]').forEach(btn=>{
   const page=btn.dataset.page;
   btn.style.display=canSeePage(page)?'':'none';
 });
 const actions=document.getElementById('fcg-actions');
 if(actions)actions.style.display=allowed?'flex':'none';
}
function init(){syncManagementAccess();new MutationObserver(()=>syncManagementAccess()).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
