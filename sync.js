/* Sync v2: per-account cache, compare-and-swap, explicit legacy import. */
(()=>{'use strict';
const $=id=>document.getElementById(id), main=document.querySelector('main');
let client,user,revision=0,dirty=false,generation=0,busy=false,blocked=false,remote=null,ready=false,epoch=0;
let revisionTime='';
const empty=()=>({temas:[{id:'t1',nombre:'Ánimo y desánimo',padre:''},{id:'t2',nombre:'Jóvenes',padre:''},{id:'t3',nombre:'Familia',padre:''},{id:'t4',nombre:'Visitas de pastoreo',padre:''}],refs:[]});
const valid=d=>d&&Array.isArray(d.temas)&&Array.isArray(d.refs)&&d.temas.every(t=>t&&typeof t.id==='string'&&typeof t.nombre==='string')&&d.refs.every(r=>r&&typeof r.id==='string'&&typeof r.titulo==='string');
const status=s=>{$('syncStatus').textContent=s};
const cacheKey=()=>`mep_v2:${new URL(window.MEP_CONFIG.supabaseUrl).hostname}:${user.id}`;
function remember(){try{localStorage.setItem(cacheKey(),JSON.stringify({data:MEP.get(),revision,dirty,revisionTime}));return true}catch{status('No se pudo guardar la copia local. Mantén abierta la aplicación y exporta un respaldo.');return false}}
function lock(value){main.hidden=value;$('accountActions').hidden=!user;$('loginForm').hidden=!!user}
function download(data){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='mi-estudio-copia-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function errorMessage(error){if(!navigator.onLine)return 'Sin conexión. Los cambios pendientes permanecen en este navegador.';if(error?.status===401||/jwt|expired|refresh_token/i.test(error?.message||''))return 'La sesión necesita renovarse. Exporta los cambios pendientes antes de volver a iniciar sesión.';return 'No se pudo sincronizar. Revisa la conexión y la configuración de Supabase. Tus cambios no se han confirmado en la nube.'}
async function readCloud(){const {data,error}=await client.from('mep_libraries').select('data,revision,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;if(data&&!valid(data.data))throw Error('Invalid remote library');return data}
function conflict(row){blocked=true;remote=row;$('conflict').hidden=false;status('Conflicto: hay otra versión en la nube. Tu copia pendiente se conserva aquí.')}
async function sync(){
 if(!ready||!user||busy||blocked)return;
 if(!navigator.onLine){status('Sin conexión. Los cambios pendientes permanecen en este navegador.');return}
 busy=true;const token=epoch;
 try{
   if(dirty){
     status('Guardando en tu cuenta…');const sent=MEP.get(), sentGeneration=generation;
     const {data,error}=await client.rpc('mep_save',{p_data:sent,p_expected:revision});
     if(token!==epoch)return;if(error)throw error;
     if(data.conflict){const row=await readCloud();if(token===epoch)conflict(row);return}
     revision=data.revision;revisionTime=data.updated_at;dirty=generation!==sentGeneration;remember();
     status(dirty?'Hay cambios pendientes…':'Sincronizado · '+new Date(revisionTime).toLocaleString('es'));
   }else{
     const row=await readCloud();if(token!==epoch)return;
     // A local edit may occur during the request. Never replace it.
     if(dirty)return;
     if(row&&row.revision!==revision){
       if(MEP.busy()){status('Hay cambios de otro dispositivo. Abre Biblioteca para recibirlos.');return}
       MEP.set(row.data);revision=row.revision;revisionTime=row.updated_at;remember();
     }
     revisionTime=row?.updated_at||revisionTime;status(revisionTime?'Último guardado en la nube · '+new Date(revisionTime).toLocaleString('es'):'Sin cambios guardados en la nube todavía.');
   }
 }catch(e){if(token===epoch)status(errorMessage(e))}
 finally{busy=false;if(token===epoch&&dirty&&!blocked&&navigator.onLine)setTimeout(()=>sync(),5000)}
}
window.MEPSync={save(data){if(!ready||!user)throw Error('Inicia sesión primero');if(!valid(data))throw Error('Biblioteca inválida');dirty=true;generation++;remember();status('Cambios guardados aquí; pendientes de sincronizar.');void sync()}};
async function activate(session){
 const next=session?.user;if(next&&user?.id===next.id&&ready){void sync();return}
 epoch++;const token=epoch;user=next||null;ready=false;blocked=false;remote=null;dirty=false;revision=0;revisionTime='';$('conflict').hidden=true;lock(true);MEP.set({temas:[],refs:[]});
 if(!user){status('Inicia sesión para abrir tu biblioteca privada.');return}
 $('accountEmail').textContent=user.email||'';status('Abriendo tu biblioteca…');
 let cache;try{cache=JSON.parse(localStorage.getItem(cacheKey()))}catch{}
 try{
   const row=await readCloud();if(token!==epoch)return;
   if(cache?.dirty&&valid(cache.data)){
     MEP.set(cache.data);revision=cache.revision;revisionTime=cache.revisionTime||'';dirty=true;
     if((row?.revision||0)!==revision)conflict(row);
   }else{MEP.set(row?.data||empty());revision=row?.revision||0;revisionTime=row?.updated_at||''}
   ready=true;lock(false);remember();
   let legacy;try{legacy=JSON.parse(localStorage.getItem('mep_v1'))}catch{}
   $('migrate').hidden=!valid(legacy);
   if(!blocked)void sync();
 }catch(e){
   if(token!==epoch)return;
   // Do not unlock stale data without validating the session/server first.
   status(errorMessage(e)+' Pulsa Sincronizar ahora para reintentar.');
 }
}
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!client)return;$('entrar').disabled=true;status('Iniciando sesión…');
 try{const {data,error}=await client.auth.signInWithPassword({email:$('correo').value.trim(),password:$('clave').value});$('clave').value='';if(error){status('No se pudo iniciar sesión. Comprueba tu correo y contraseña.');return}await activate(data.session)}catch{status('No se pudo conectar. Inténtalo de nuevo.')}finally{$('entrar').disabled=false}
});
$('syncNow').onclick=async()=>{if(ready)void sync();else{const {data}=await client.auth.getSession();await activate(data.session)}};
$('logout').onclick=async()=>{
 if(busy){status('Espera a que termine la sincronización antes de cerrar sesión.');return}
 if(dirty&&!confirm('Hay cambios sin sincronizar. Exporta un respaldo antes de salir. ¿Cerrar sesión y quitar esta copia local de todos modos?'))return;
 const key=user&&cacheKey();const {error}=await client.auth.signOut({scope:'local'});if(error){status('No se pudo cerrar sesión. Inténtalo de nuevo.');return}if(key)localStorage.removeItem(key);await activate(null);
};
$('exportPending').onclick=()=>download(MEP.get());
$('loadCloud').onclick=()=>{
 if(!confirm('¿Descargaste tu copia pendiente? Se reemplazará en este dispositivo por la versión de la nube.'))return;
 MEP.set(remote?.data||empty());revision=remote?.revision||0;dirty=false;blocked=false;remote=null;$('conflict').hidden=true;remember();void sync();
};
$('migrate').onclick=()=>{
 let legacy;try{legacy=JSON.parse(localStorage.getItem('mep_v1'))}catch{}
 if(!valid(legacy)){status('No se encontró una biblioteca anterior válida.');return}
 if(!confirm('Se añadirá una copia de los temas y referencias anteriores a esta cuenta. ¿Continuar?'))return;
 const data=MEP.get(), ids=new Map(legacy.temas.map(t=>[t.id,crypto.randomUUID()]));
 data.temas.push(...legacy.temas.map(t=>({...t,id:ids.get(t.id),padre:ids.get(t.padre)||''})));
 data.refs.push(...legacy.refs.map(r=>({...r,id:crypto.randomUUID(),tema:ids.get(r.tema)||''})));
 MEP.set(data);MEPSync.save(data);$('migrate').hidden=true;
 // The original remains untouched until the user deliberately removes it.
 status('Biblioteca anterior copiada. Comprueba que aparezca Sincronizado antes de cambiar de dispositivo.');
};
window.addEventListener('offline',()=>status('Sin conexión. Los cambios pendientes permanecen en este navegador.'));window.addEventListener('online',()=>sync());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync()});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
async function init(){
 const cfg=window.MEP_CONFIG||{};
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl||'')||!cfg.supabasePublishableKey){status('Falta activar la sincronización. Sigue CONFIGURAR.md y completa config.js. La biblioteca anterior sigue guardada en este navegador.');$('entrar').disabled=true;return}
 if(!window.supabase){status('No se pudo cargar el acceso seguro. Conéctate a internet y recarga la página.');$('entrar').disabled=true;return}
 client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')setTimeout(()=>activate(null),0);else if(event==='TOKEN_REFRESHED')setTimeout(()=>sync(),0)});
 const {data,error}=await client.auth.getSession();if(error){status('No se pudo recuperar la sesión. Inicia sesión nuevamente.');return}await activate(data.session);
 setInterval(()=>{if(!document.hidden)void sync()},15000);
}
if(window.MEP)void init();else window.addEventListener('mep-ready',()=>init(),{once:true});
})();
