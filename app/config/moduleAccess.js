export const appRoles = ['base', 'comercial', 'direccion', 'administracion', 'contabilidad', 'operaciones', 'superadmin'];
export const roleRank = {base:0, comercial:0.5, direccion:0, administracion:1, contabilidad:1, operaciones:2, superadmin:3};
export function normalizeRole(role) {
  const value=String(role||'').trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  return appRoles.includes(value)?value:'base';
}
export function canViewModule(role,moduleId) {
  const normalized=normalizeRole(role);
  if(normalized==='contabilidad')return !['operaciones','produccion'].includes(moduleId);
  if(moduleId==='direccion')return ['superadmin','direccion'].includes(normalized);
  if(moduleId==='operaciones')return roleRank[normalized]>=roleRank.operaciones;
  if(moduleId==='administracion')return roleRank[normalized]>=roleRank.administracion;
  return true;
}
const within=(path,root)=>path===root||path.startsWith(root+'/');
export function canAccessDashboardPath(role,pathname) {
  if(within(pathname,'/dashboard/comercial/contratos/crear'))return roleRank[normalizeRole(role)]>=roleRank.administracion;
  for(const area of ['direccion','operaciones','administracion','produccion'])if(within(pathname,'/dashboard/'+area))return canViewModule(role,area);
  return true;
}
export const mediatecaRootPaths={
  documentos_administracion:'/dashboard/administracion',
  documentos_direccion:'/dashboard/direccion',
  documentos_produccion:'/dashboard/produccion',
  contratos_firmados:'/dashboard/comercial/contratos',
};
export function validFolderAccessPath(path) {
  return /^\/dashboard\/(comercial|produccion|administracion|operaciones|direccion)(?:\/[a-zA-Z0-9_-]+)*$/.test(path);
}
