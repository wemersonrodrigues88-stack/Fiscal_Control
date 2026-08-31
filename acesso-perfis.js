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
})();
