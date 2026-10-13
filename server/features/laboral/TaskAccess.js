export const managesTasks = role => ['operaciones','superadmin','direccion','dirección'].includes(String(role || '').toLowerCase());
export const taskIdentity = request => ({id:request.headers.get('x-p3-actor-id') || '',role:request.headers.get('x-p3-actor-role') || ''});
export function requireTaskIdentity(actor,management=false) {
  if(!actor.id) throw Object.assign(new Error('No autenticado.'),{status:401});
  if(management&&!managesTasks(actor.role)) throw Object.assign(new Error('No tienes permisos para gestionar tareas.'),{status:403});
}
