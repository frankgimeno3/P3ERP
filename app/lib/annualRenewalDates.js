export function normalizeAnnualDayMonth(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]), month = Number(match[2]);
  const lastDay = new Date(Date.UTC(2000, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > lastDay) return null;
  return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}`;
}

export function normalizeAnnualRange(range) {
  const entre = normalizeAnnualDayMonth(range?.entre);
  const hasta = normalizeAnnualDayMonth(range?.hasta);
  return entre && hasta ? { entre, hasta } : null;
}

function latestAnnualSignature(signatures) {
  let latest = '';
  for (const value of signatures) {
    const raw = String(value ?? '').trim();
    const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    const iso = local
      ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`
      : raw;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(Date.parse(iso))) continue;
    if (new Date(iso).toISOString().slice(0, 10) === iso && iso > latest) latest = iso;
  }
  return latest;
}

export function defaultAnnualRange(signatures) {
  const latest = latestAnnualSignature(signatures);
  const month = latest ? String((Number(latest.slice(5, 7)) + 5) % 12 + 1).padStart(2, '0') : '09';
  return { entre: `01/${month}`, hasta: `15/${month}` };
}

export function defaultRenewalMonth(signatures, now = new Date()) {
  const latest = latestAnnualSignature(signatures);
  const [year, month] = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).format(now).split('-').map(Number);
  if (!latest) return `${year + Number(month > 9)}-09`;
  const due = new Date(Date.UTC(Number(latest.slice(0,4)), Number(latest.slice(5,7)) + 5, 1));
  return due.toISOString().slice(0, 7);
}
