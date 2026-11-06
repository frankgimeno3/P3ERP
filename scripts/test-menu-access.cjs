const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const mod={exports:{}};cache.set(file,mod.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',code)(id=>{
  if(id==='next/navigation')return {};
  if(id==='next/link')return ()=>null;
  if(id.includes('currentUser'))return {};
  if(id.startsWith('.')||id.startsWith('@/')){const base=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(file),id);return load([base,base+'.js',base+'.ts',base+'.tsx'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile()));}
  return require(id);
 },mod,mod.exports);cache.set(file,mod.exports);return mod.exports;
}
const {dashboardMenu}=load('app/config/dashboardMenu.ts');
const {visibleEntries}=load('app/general_components/componentes_recurrentes/loggedLeftMenu.tsx');
const {appRoles,canAccessDashboardPath,canViewModule}=load('app/config/moduleAccess.js');
const {canAccessApiPath}=load('app/config/roleAccess.ts');
const production=dashboardMenu.find(module=>module.id==='produccion');
const management=production.children.find(entry=>entry.id==='gestion-contenidos');
assert(management);assert.deepEqual(management.children.map(entry=>entry.label),['Contenido revista','Otro contenido']);
assert(production.children.some(entry=>entry.href==='/dashboard/produccion/repositorio'));
for(const role of appRoles){
 const allowed=['direccion','superadmin'].includes(role);
 assert.equal(canAccessDashboardPath(role,'/dashboard/mediateca'),allowed);
 assert.equal(canAccessDashboardPath(role,'/dashboard/direccion/mediateca'),allowed);
 for(const method of ['GET','POST','PATCH','DELETE'])for(const resource of ['media','media/id/content','media/presign','folders','papelera','access'])assert.equal(canAccessApiPath(role,'/api/v1/mediateca/'+resource,method),allowed,`${role} ${resource} ${method}`);
}
const flatten=entries=>entries.flatMap(entry=>entry.type==='page'?[entry.href]:flatten(entry.children));
const operations=dashboardMenu.find(module=>module.id==='operaciones');
const tables=operations.children.find(entry=>entry.id==='tablas');
const database=operations.children.find(entry=>entry.id==='bbdd');
assert.deepEqual(tables.children.map(entry=>entry.label),['Ferias','Artículos','Revistas','Documentación','Servicios']);
assert.deepEqual(database.children.map(entry=>entry.label),['Import-export','Eliminación cuentas']);
assert(operations.children.some(entry=>entry.type==='page'&&entry.href==='/dashboard/operaciones/tareas'));
assert.equal(new Set(flatten(operations.children)).size,flatten(operations.children).length);
for(const role of appRoles){
 const visible=dashboardMenu.filter(module=>canViewModule(role,module.id)).flatMap(module=>flatten(visibleEntries(module.children,role)));
 for(const href of visible)assert(canAccessDashboardPath(role,href),`${role} must never see blocked link ${href}`);
 for(const area of dashboardMenu)if(!canViewModule(role,area.id))for(const href of flatten(area.children))assert(!visible.includes(href));
}
const direction=dashboardMenu.find(module=>module.id==='direccion');
assert(!flatten(visibleEntries(direction.children,'direccion')).includes('/dashboard/operaciones/agentes'));
assert(flatten(visibleEntries(direction.children,'superadmin')).includes('/dashboard/operaciones/agentes'));
const accounting=dashboardMenu.filter(area=>canViewModule('contabilidad',area.id)).flatMap(area=>flatten(visibleEntries(area.children,'contabilidad')));
assert(accounting.includes('/dashboard/contabilidad/extractos'));
assert(accounting.includes('/dashboard/administracion/pendiente-cobro'));
assert(!accounting.some(href=>/^\/dashboard\/(operaciones|produccion|direccion)(?:\/|$)/.test(href)));
console.log('PASS: menú recursivo coherente con rutas para todos los roles; grupos vacíos y enlaces restringidos no aparecen.');

assert(dashboardMenu.findIndex(area=>area.id==='operaciones')<dashboardMenu.findIndex(area=>area.id==='contabilidad'));
assert(dashboardMenu.findIndex(area=>area.id==='contabilidad')<dashboardMenu.findIndex(area=>area.id==='direccion'));
