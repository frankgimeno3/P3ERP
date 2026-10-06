export function isDateFilterField(field: string) {
  return !/periodicidad/i.test(field) && /fecha|deadline|date|(?:created|updated|generated|sent|accepted)_at|^(?:desde|hasta)$/i.test(field);
}

export function matchesTableFilter(value: unknown, filter: string) {
  const text = String(value ?? '').trim();
  const query = String(filter ?? '').trim();
  if (!query) return true;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T|\s|$)/);
  const local = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s|$)/);
  if ((iso || local) && /^\d{0,2}\/\d{0,2}\/\d{0,4}$/.test(query)) {
    const parts = iso ? [iso[3], iso[2], iso[1]] : [local![1], local![2], local![3]];
    return query.split('/').every((part, index) => !part || Number(part) === Number(parts[index]));
  }
  if (/^\/*$/.test(query)) return true;
  return text.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'));
}
