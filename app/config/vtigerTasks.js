// CSV exports may contain quoted commas, escaped quotes and multiline descriptions.
export function parseTaskCsv(text) {
  const records = []; let row = [], value = '', quoted = false, closed = false;
  text = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else value += char;
    } else if (char === '"' && !value && !closed) quoted = true;
    else if (char === ',' || char === '\n' || char === '\r') {
      row.push(value); value = ''; closed = false;
      if (char !== ',') { if (row.some(cell => cell !== '')) records.push(row); row = []; if (char === '\r' && text[i + 1] === '\n') i++; }
    } else { if (closed || char === '"') throw new Error('CSV mal formado: comillas fuera de campo.'); value += char; }
  }
  if (quoted) throw new Error('CSV incompleto: falta cerrar un campo entre comillas.');
  row.push(value); if (row.some(cell => cell !== '')) records.push(row);
  const headers = records.shift() || [];
  if (new Set(headers).size !== headers.length || !['Asunto','Asignado a','Fecha y Hora Inicio','Fecha y Hora Fin','En relación con','Estado','Descripción'].every(key => headers.includes(key))) throw new Error('No es un CSV de tareas de vtiger con el encabezado esperado.');
  if (!records.length || records.length > 5000) throw new Error('El CSV debe contener entre 1 y 5.000 tareas.');
  return records.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`Registro ${index + 1}: número de columnas incorrecto.`);
    return Object.fromEntries(headers.map((key, column) => [key, cells[column]]));
  });
}
export const vtigerStates = {Planned:'pendiente', 'Not Started':'pendiente', Held:'completada', 'Not Held':'cancelada', 'In Progress':'en_curso', Completed:'completada', Deferred:'pendiente'};
export function vtigerDate(value, fallbackTime = '') {
  if (!value) return null;
  const text = /^\d{2}-\d{2}-\d{4}$/.test(String(value)) ? `${value} ${fallbackTime || '00:00:00'}` : String(value);
  const m = text.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) throw new Error(`Fecha de vtiger no válida: ${value}`);
  const [,d,mo,y,h,mi,s] = m, iso = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
  const date = new Date(`${iso}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,19) !== iso || +y < 1900 || +y > 2200) throw new Error(`Fecha de vtiger no válida: ${value}`);
  return iso;
}
