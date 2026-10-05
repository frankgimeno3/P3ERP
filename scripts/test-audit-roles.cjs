const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync('app/config/roleAccess.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('exports','module',compiled)(mod.exports,mod);
const {canAccessApiPath:can,canAccessDashboardPath:dashboard}=mod.exports;
for(const role of ['direccion','superadmin']){
 assert(dashboard(role,'/dashboard/direccion/tesoreria/extractos/conciliacion'));
 for(const url of ['/api/v1/admin/proveedores','/api/v1/comercial/cuentas','/api/v1/direccion/laboral/empleados','/api/v1/direccion/cargos-recurrentes','/api/v1/direccion/laboral/nominas','/api/v1/direccion/laboral/anticipos','/api/v1/direccion/ordenes-cobro','/api/v1/direccion/prevision-gastos','/api/v1/direccion/prevision-ingresos'])assert(can(role,url,'GET'),`${role}: ${url}`);
 assert(can(role,'/api/v1/direccion/bancos/revision','PUT'));
}
for(const role of ['administracion','operaciones','direccion','superadmin']){
 assert(can(role,'/api/v1/admin/proveedores/provider/benchmark','GET'));
 assert(can(role,'/api/v1/admin/proveedores/provider/cargos-recurrentes','GET'));
 assert(can(role,'/api/v1/admin/proveedores/provider/cargos-recurrentes/123','PUT'));
}
assert(!can('base','/api/v1/admin/proveedores/provider/cargos-recurrentes','GET'));
assert(!can('base','/api/v1/admin/proveedores/provider/benchmark','PUT'));
assert(!can('administracion','/api/v1/direccion/bancos/revision','PUT'));
assert(!can('direccion','/api/v1/admin/user-wizard','POST'));
assert(!dashboard('base','/dashboard/direccion/tesoreria/extractos/conciliacion'));
console.log('PASS roles: all reconciliation resources available to Direction, supplier-scoped capabilities and privileged operations remain restricted.');
