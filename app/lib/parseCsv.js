// Strict CSV parser shared by CRM imports: quoted commas, escaped quotes and multiline fields.
export function parseCsvRecords(text) {
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
  return records;
}
