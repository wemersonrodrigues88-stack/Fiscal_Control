/* Fiscal Control — matriz de acesso
   Perfil operacional separado do privilégio técnico.
   Wemerson permanece Analista, mas possui privilégio Desenvolvedor.
   Desenvolvedor também possui acesso à visão gerencial, sem trocar de identidade. */
(function(){
'use strict';
const USERS={
  'Wemerson':{perfil:'Analista',privilegio:'Desenvolvedor'},
  'Daniela':{perfil:'Gerente',privilegio:null},
  'Leonardo':{perfil:'Coordenador',privilegio:null}
};
const INACTIVE=['Férias','Licença médica','Demissão','Pediu demissão'];
function equipe(){try{const v=JSON.parse(localStorage.getItem('fc_equipe')||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function auth(){try{return window.FCAuth?.getUser?.()||window.FC_AUTH?.user||null}catch(e){return null}}
function currentName(){const u=auth();if(u?.nome)return String(u.nome);const el=document.getElementById('usuario');return el?String(el.value||''):''}
function resolve(){
 const u=auth();
 if(u?.nome){return {nome:u.nome,perfil:u.perfil||'Analista',privilegio:u.privilegio||null,situacao:u.situacao||'Ativo'}}
 const name=currentName();
 const found=USERS[name];
 if(found)return {...found,nome:name,situacao:'Ativo'};
 const m=equipe().find(x=>x.nome===name);
 return {nome:name,perfil:m?.funcao||'Analista',privilegio:null,situacao:m?.situacao||'Ativo'};
}
function isDeveloper(){return resolve().privilegio==='Desenvolvedor'}
function isManager(){const p=resolve().perfil;return p==='Gerente'||p==='Coordenador'||p==='Gestão'||isDeveloper()}
function isAnalyst(){return resolve().perfil==='Analista'}
function activeAnalyst(m){return m&&String(m.funcao||'').toLowerCase()==='analista'&&String(m.situacao||'Ativo')==='Ativo'}
function canSeePage(page){
 if(isDeveloper()||isManager())return true;
 if(isAnalyst())return ['dashboard','apuracoes'].includes(page);
 return false;
}
function expose(){window.FC_ACCESS={resolve,isDeveloper,isManager,isAnalyst,canSeePage,activeAnalyst,INACTIVE}}
expose();

/* O Desenvolvedor NÃO deve ser convertido em outro usuário para visualizar a gestão.
   A autorização gerencial é direta pelo privilégio e a identidade permanece Wemerson. */
function syncManagementAccess(){
 const developer=isDeveloper();
 const manager=isManager();
 const allowed=developer||manager;
 document.querySelectorAll('.nav button[data-page]').forEach(btn=>{
   const page=btn.dataset.page;
   btn.style.display=allowed||['dashboard','apuracoes'].includes(page)?'':'none';
 });
 const actions=document.getElementById('fcg-actions');
 if(actions)actions.style.display=allowed?'flex':'none';
}
function init(){syncManagementAccess();new MutationObserver(()=>syncManagementAccess()).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
