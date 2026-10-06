const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const empty = value => !String(value ?? '').trim() || /^[-–—]$/.test(String(value).trim());
function number(value) {
  if (typeof value==='number') return Number.isFinite(value)?value:null;
  const original=String(value).trim();
  let raw = original.replace(/\b(?:EUR|USD|GBP|JPY|CHF)\b|\s|\u00a0|[€$£¥%]/g, '');
  const negative = /^\(.*\)$/.test(raw);
  if (negative) raw = raw.slice(1, -1);
  if (!/^[+-]?[\d.,]+$/.test(raw)) return null;
  if (raw.includes(',') && raw.includes('.')) raw=raw.lastIndexOf(',')>raw.lastIndexOf('.')?raw.replaceAll('.','').replace(',','.'):raw.replaceAll(',','');
  else if (raw.includes(',')) raw=/[$£]|\b(?:USD|GBP)\b/.test(original)&&/^[+-]?\d{1,3}(,\d{3})+$/.test(raw)?raw.replaceAll(',',''):raw.replace(',','.');
  else if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replaceAll('.', '');
  const result = Number(raw);
  return Number.isFinite(result) ? (negative ? -result : result) : null;
}
function date(value) {
  const raw = String(value).trim().replace(/\s*([/-])\s*/g,'$1');
  const local = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s|,|$)/);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s|$)/);
  if (!local && !iso) return null;
  const [year, month, day] = local ? [local[3],local[2],local[1]] : iso.slice(1,4);
  const valueDate = Date.UTC(Number(year),Number(month)-1,Number(day));
  const parsed = new Date(valueDate);
  if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth()+1 !== Number(month) || parsed.getUTCDate() !== Number(day)) return null;
  const time = raw.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return valueDate + (time ? (Number(time[1])*3600+Number(time[2])*60+Number(time[3]||0))*1000 : 0);
}
export function compareTableValues(a, b, direction = 'asc') {
  if (empty(a) || empty(b)) return empty(a) === empty(b) ? 0 : empty(a) ? 1 : -1;
  const dates = [date(a),date(b)], numbers = [number(a),number(b)];
  const result = dates.every(v => v !== null) ? dates[0]-dates[1] : numbers.every(v => v !== null) ? numbers[0]-numbers[1] : collator.compare(String(a).trim(),String(b).trim());
  return direction === 'desc' ? -result : result;
}
