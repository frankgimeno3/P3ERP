export const productionStates = ['No pedido', 'No publicado', 'Pendiente Publicar', 'Publicado', 'Publicado GRATIS', 'ANULADO', 'NO SALE', 'NO SE PUBLICA', 'A ESCOGER'];

export function normalizeProductionDeadline(value) {
  const text = String(value ?? '').trim();
  if (!text || /^\/*$/.test(text)) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(text);
  const parts = iso ? [iso[3], iso[2], iso[1]] : text.split('/');
  if (parts.length !== 3 || !/^\d{1,2}$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1]) || !/^\d{4}$/.test(parts[2])) throw new Error('Completa la fecha límite con día, mes y año.');
  const [day, month, year] = parts.map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('La fecha límite no es válida.');
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
}
