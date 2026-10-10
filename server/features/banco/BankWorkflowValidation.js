import { RecurringChargeError } from '../prevision/RecurringChargeRepository.js';

export const fail = message => { throw new RecurringChargeError(message, 409); };
export const cents = value => Math.round(Number(value) * 100);

export function validateWorkflowSelection(body) {
  if (!body || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 500 || body.ids.some(id => typeof id !== 'string' || !id.trim())) fail('Selecciona entre 1 y 500 movimientos.');
  return [...new Set(body.ids)];
}

export function assertMovementVersion(line, item) {
  if (!item || !Number.isFinite(new Date(item.version).getTime()) || new Date(item.version).getTime() !== new Date(line.updated_at).getTime()) fail(`El registro ${line.id_linea_banco} ha cambiado. Recarga la revisión.`);
}
