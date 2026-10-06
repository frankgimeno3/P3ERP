export const accountTaskTypes = {
  pedir_material_contratado: 'Pedir material contratado',
  pedir_material_campana: 'Pedir material de campaña',
  recordar_material: 'Recordatorio de material pedido',
  enviar_publicado_contratado: 'Enviar material publicado contratado',
  enviar_publicado_gratuito: 'Enviar material publicado gratuitamente',
  propuesta_renovacion: 'Enviar propuesta de renovación',
  propuesta_publicitaria: 'Enviar propuesta publicitaria',
  llamada: 'Llamada',
  email: 'Email',
  accion: 'Acción concreta',
};
export const canManageAccountTasks = role => ['comercial', 'administracion', 'operaciones', 'direccion', 'superadmin'].includes(String(role || '').trim().toLowerCase());
