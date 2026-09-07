import Joi from 'joi';

export class LaboralError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const text = () => Joi.string().trim().allow('').max(30000).default('');
const id = () => Joi.string().trim().max(200).required();
const year = () => Joi.number().integer().min(2000).max(2100).required();
const date = () => Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? helpers.error('any.invalid') : value;
}).required();
export const calendarTypes = ['vacaciones','festivo_nacional','festivo_autonomico','festivo_barcelona','festivo_convenio','deadline_revista','publicacion_revista','feria'];
export const candidateStates = ['pendiente llamada','rechazado en llamada','pendiente reunión presencial','rechazado en reunión presencial','elegido','reserva'];
const payment = {
  id_empleado: id(), mes: Joi.number().integer().min(1).max(12).required(), anio: year(),
  importe_neto: Joi.number().precision(2).min(0).max(9999999999.99).required(),
  estado: Joi.string().valid('pagado','pendiente').required(), comentarios: text(),
  id_transferencia: Joi.string().trim().max(200).allow('', null).default(null),
};
const schemas = {
  nominas: Joi.object(payment),
  anticipos: Joi.object({ ...payment, importe_neto: payment.importe_neto.greater(0) }),
  calendario: Joi.object({ anio: year() }),
  eventos: Joi.object({ anio: year(), tipo: Joi.string().valid(...calendarTypes).required(), titulo: Joi.string().trim().max(300).required(), inicio: date(), fin: date(), comentarios: text() }),
  libres: Joi.object({ anio: year(), fechas: Joi.array().items(Joi.object({ numero: Joi.number().integer().min(1).max(3).required(), fecha: date() })).max(3).unique('numero').unique('fecha').required() }),
  ausencias: Joi.object({ tipo: Joi.string().trim().max(200).required(), inicio: date(), fin: date(), comentarios: text() }),
  comentarios: Joi.object({ comentario: Joi.string().trim().max(30000).required() }),
  procesos: Joi.object({ nombre: Joi.string().trim().max(300).required(), oferta_condiciones: text(), mensaje_pre_llamada: text(), mensaje_post_llamada: text(), mensaje_rechazo: text() }),
  candidatos: Joi.object({ nombre: Joi.string().trim().max(300).required(), resumen_cv: text(), comentarios: text(), estado: Joi.string().valid(...candidateStates).required() }),
};
export function validate(kind, body) {
  const { value, error } = schemas[kind].validate(body, { abortEarly: true });
  if (error) throw new LaboralError(`Revisa los datos: ${error.details[0].path.join('.')} no es válido.`);
  if (value.inicio && value.fin < value.inicio) throw new LaboralError('La fecha final no puede ser anterior a la inicial.');
  if (kind === 'eventos' && [value.inicio, value.fin].some(d => Number(d.slice(0, 4)) !== value.anio)) throw new LaboralError('Las fechas deben pertenecer al año del calendario.');
  if (kind === 'libres' && value.fechas.some(d => Number(d.fecha.slice(0, 4)) !== value.anio)) throw new LaboralError('Los días de libre disposición deben pertenecer al año seleccionado.');
  return value;
}
