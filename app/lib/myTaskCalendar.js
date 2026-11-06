export function calendarToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
}
export function taskCalendarDay(task) {
  const raw = String(task.fecha_inicio || task.fecha_limite || task.fecha_fin || '');
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/) || raw.replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const [, y, m, d] = match, date = new Date(Number(y), Number(m) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return '';
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) && Number.isFinite(new Date(raw).getTime())) return calendarToday(new Date(raw));
  return `${y}-${m}-${d}`;
}
export function taskCalendarMonth(year, month) {
  const first = (new Date(year, month, 1).getDay() + 6) % 7, last = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  for (let start = 1 - first; start <= last; start += 7) {
    weeks.push(Array.from({ length: 7 }, (_, column) => { const day = start + column; return day > 0 && day <= last ? day : null; }));
  }
  return weeks.filter(week => week.some(Boolean));
}
