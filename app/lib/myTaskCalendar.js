export function taskCalendarDay(task) {
  const raw = String(task.fecha_inicio || task.fecha_limite || task.fecha_fin || '');
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/) || raw.replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const [, y, m, d] = match, date = new Date(Number(y), Number(m) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return '';
  return `${y}-${m}-${d}`;
}
export function taskCalendarMonth(year, month) {
  const first = (new Date(year, month, 1).getDay() + 6) % 7, last = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  for (let start = 1 - first; start <= last; start += 7) {
    weeks.push(Array.from({ length: 6 }, (_, column) => { const day = start + column; return day > 0 && day <= last ? day : null; }));
  }
  return weeks.filter(week => week.some(Boolean));
}
