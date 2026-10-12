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
const flatten=entries=>entries.flatMap(entry=>entry.type==='page'?[entry.href]:flatten(entry.children));
for(const role of appRoles){
 const visible=dashboardMenu.filter(module=>canViewModule(role,module.id)).flatMap(module=>flatten(visibleEntries(module.children,role)));
 for(const href of visible)assert(canAccessDashboardPath(role,href),`${role} must never see blocked link ${href}`);
 for(const area of dashboardMenu)if(!canViewModule(role,area.id))for(const href of flatten(area.children))assert(!visible.includes(href));
}
const direction=dashboardMenu.find(module=>module.id==='direccion');
assert(!flatten(visibleEntries(direction.children,'direccion')).includes('/dashboard/operaciones/agentes'));
assert(flatten(visibleEntries(direction.children,'superadmin')).includes('/dashboard/operaciones/agentes'));
console.log('PASS: menú recursivo coherente con rutas para los seis roles; grupos vacíos y enlaces restringidos no aparecen.');
