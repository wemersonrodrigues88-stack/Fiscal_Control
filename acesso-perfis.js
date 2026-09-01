/* Fiscal Control — matriz de acesso
   Perfil operacional separado do privilégio técnico.
   Wemerson permanece Analista, mas possui privilégio Desenvolvedor. */
(function(){
'use strict';
const USERS={
  'Wemerson':{perfil:'Analista',privilegio:'Desenvolvedor'},
  'Daniela':{perfil:'Gerente',privilegio:null},
  'Leonardo':{perfil:'Coordenador',privilegio:null}
};
const INACTIVE=['Férias','Licença médica','Demissão','Pediu demissão'];
function equipe(){try{return JSON.parse(localStorage.getItem('fc_equipe')||'[]')}catch(e){return[]}}
function currentName(){const el=document.getElementById('usuario');return el?String(el.value||''):''}
function resolve(){
 const name=currentName();
 const found=USERS[name];
 if(found)return {...found,nome:name};
 const m=equipe().find(x=>x.nome===name);
 return {nome:name,perfil:m?.funcao||'Analista',privilegio:null,situacao:m?.situacao||'Ativo'};
}
function isDeveloper(){return resolve().privilegio==='Desenvolvedor'}
function isManager(){const p=resolve().perfil;return p==='Gerente'||p==='Coordenador'||isDeveloper()}
function isAnalyst(){return resolve().perfil==='Analista'}
function activeAnalyst(m){return m&&String(m.funcao||'').toLowerCase()==='analista'&&String(m.situacao||'Ativo')==='Ativo'}
function canSeePage(page){
 if(isDeveloper()||isManager())return true;
 if(isAnalyst())return ['dashboard','apuracoes'].includes(page);
 return false;
}
function expose(){window.FC_ACCESS={resolve,isDeveloper,isManager,isAnalyst,canSeePage,activeAnalyst,INACTIVE}}
expose();

/* Prévia real da visão gerencial para o Desenvolvedor.
   Ao clicar em "Visão da gestão", a aplicação passa a renderizar como Gerente,
   liberando somente as telas que Gerente/Coordenador possuem e ocultando recursos técnicos. */
function setNavForManagement(on){
 const pages=['dashboard','apuracoes','carteiras','prazos','historico','equipe'];
 document.querySelectorAll('.nav button[data-page]').forEach(btn=>{
   btn.style.display=on ? (pages.includes(btn.dataset.page)?'':'none') : (['dashboard','apuracoes'].includes(btn.dataset.page)?'':'none');
 });
}
function managementPreview(){return window.FC_AUTH?.managementPreview===true}
function renderManagementPreview(){
 const on=managementPreview();
 setNavForManagement(on);
 const dev=document.getElementById('fc-admin-users-btn');
 if(dev) dev.style.display=on?'none':'';
 const title=document.getElementById('topTitle');
 if(title) title.textContent=on?'Visão geral da gestão':'Visão geral do setor';
 const btn=document.getElementById('fc-management-preview-btn');
 if(btn) btn.textContent=on?'Voltar à minha visão':'Visão da gestão';
}
function installPreviewGuard(){
 document.addEventListener('click',function(e){
   const btn=e.target.closest('#fc-management-preview-btn');
   if(!btn)return;
   /* O auth-client possui um onclick próprio que apenas troca o nome do usuário.
      Interceptamos antes dele e fazemos a troca completa de contexto visual. */
   e.preventDefault();
   e.stopImmediatePropagation();
   const on=!managementPreview();
   const select=document.getElementById('usuario');
   if(select){
     const target=on?'Daniela':(window.FCAuth?.getUser?.()?.nome||'Wemerson');
     let option=[...select.options].find(o=>o.value===target);
     if(!option){option=new Option(target,target);select.add(option)}
     select.value=target;
   }
   if(window.FC_AUTH){window.FC_AUTH.managementPreview=on;window.FC_AUTH.user=on?{...(window.FC_AUTH.user||{}),nome:'Daniela',perfil:'Gerente',privilegio:null}:{...(window.FC_AUTH.user||{}),nome:'Wemerson',perfil:'Analista',privilegio:'Desenvolvedor'};}
   renderManagementPreview();
   try{if(typeof window.render==='function')window.render()}catch(_){ }
   try{if(typeof window.go==='function')window.go('dashboard')}catch(_){ }
   setTimeout(renderManagementPreview,0);
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPreviewGuard);else installPreviewGuard();
})();
