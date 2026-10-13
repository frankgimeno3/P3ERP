const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const mod={exports:{}};const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','exports','module',compiled)(id=>load(path.resolve(path.dirname(file),id)),mod.exports,mod);cache.set(file,mod.exports);return mod.exports;}
const mod={exports:load('app/config/roleAccess.ts')};
const {canAccessApiPath:can,canAccessDashboardPath:dashboard}=mod.exports;
for(const role of ['direccion','superadmin']){
 assert(dashboard(role,'/dashboard/contabilidad/extractos/conciliacion'));
 for(const url of ['/api/v1/admin/proveedores','/api/v1/comercial/cuentas','/api/v1/direccion/laboral/empleados','/api/v1/contabilidad/cargos-recurrentes','/api/v1/direccion/laboral/nominas','/api/v1/direccion/laboral/anticipos','/api/v1/contabilidad/ordenes-cobro','/api/v1/contabilidad/prevision-gastos','/api/v1/contabilidad/prevision-ingresos'])assert(can(role,url,'GET'),`${role}: ${url}`);
 assert(can(role,'/api/v1/contabilidad/bancos/revision','PUT'));
}
for(const role of ['administracion','operaciones','direccion','superadmin']){
 assert(can(role,'/api/v1/admin/proveedores/provider/benchmark','GET'));
 assert(can(role,'/api/v1/admin/proveedores/provider/cargos-recurrentes','GET'));
 assert(can(role,'/api/v1/admin/proveedores/provider/cargos-recurrentes/123','PUT'));
}
assert(!can('base','/api/v1/admin/proveedores/provider/cargos-recurrentes','GET'));
assert(!can('base','/api/v1/admin/proveedores/provider/benchmark','PUT'));
assert(!can('administracion','/api/v1/contabilidad/bancos/revision','PUT'));
assert(!can('direccion','/api/v1/admin/user-wizard','POST'));
assert(!dashboard('base','/dashboard/contabilidad/extractos/conciliacion'));
for(const area of ['comercial','administracion','contabilidad'])assert(dashboard('contabilidad','/dashboard/'+area));
for(const area of ['operaciones','produccion','direccion']){
 assert(!dashboard('contabilidad','/dashboard/'+area));
 for(const method of ['GET','POST','PUT','PATCH','DELETE'])assert(!can('contabilidad','/api/v1/'+area+'/servicios',method));
}
for(const url of ['/api/v1/contabilidad/bancos/revision','/api/v1/contabilidad/revision/nominas','/api/v1/contabilidad/ordenes-cobro'])for(const method of ['GET','POST','PUT'])assert(can('contabilidad',url,method));
assert(can('contabilidad','/api/v1/admin/facturas-clientes','POST'));
assert(!can('contabilidad','/api/v1/admin/user-wizard','POST'));
assert(can('contabilidad','/api/v1/comercial/catalogo/servicios','GET'));
assert(can('contabilidad','/api/v1/comercial/catalogo/revistas','GET'));
console.log('PASS roles: all reconciliation resources available to Direction, supplier-scoped capabilities and privileged operations remain restricted.');

for(const role of ['base','comercial','administracion','operaciones']){assert(!dashboard(role,'/dashboard/contabilidad'));assert(!can(role,'/api/v1/contabilidad/bancos','GET'));}
for(const role of ['direccion','contabilidad','superadmin'])assert(dashboard(role,'/dashboard/contabilidad'));
assert(!can('contabilidad','/api/v1/direccion/copias-seguridad','GET'));
assert(!can('contabilidad','/api/v1/direccion/laboral/nominas','GET'));
