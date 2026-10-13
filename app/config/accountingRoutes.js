export const accountingRoles=['contabilidad','direccion','superadmin'];
export const financialApiFolders=['bancos','cargos-recurrentes','ordenes-cobro','pagos-previstos','prevision-gastos','prevision-ingresos','prevision-liquidez'];
export function canonicalAccountingPath(path){
 for(const root of ['/dashboard/direccion/tesoreria','/dashboard/produccion/tesoreria'])if(path===root||path.startsWith(root+'/'))return '/dashboard/contabilidad'+path.slice(root.length);
 if(path==='/dashboard/direccion/bancos'||path.startsWith('/dashboard/direccion/bancos/'))return '/dashboard/contabilidad'+path.slice('/dashboard/direccion/bancos'.length);
 if(path.startsWith('/dashboard/direccion/previsiones/'))return '/dashboard/contabilidad/'+path.slice('/dashboard/direccion/previsiones/'.length).replace(/^prevision-gastos(?=\/|$)/,'prevision-cargos');
 for(const name of financialApiFolders){const old='/api/v1/direccion/'+name;if(path===old||path.startsWith(old+'/'))return '/api/v1/contabilidad/'+name+path.slice(old.length);}
 return path;
}
