export function addCalendarMonths(value, months, fallback = new Date()) {
  const match = String(value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) || String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const base = match
    ? (match[1].length === 4 ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
    : fallback;
  if (Number.isNaN(base.getTime())) return '';
  const day = base.getDate();
  const result = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const last = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, last));
  return `${String(result.getDate()).padStart(2, '0')}/${String(result.getMonth() + 1).padStart(2, '0')}/${result.getFullYear()}`;
}
