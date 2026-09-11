export function weekdayRanges(inicio, fin) {
  const ranges = [];
  let start = null, last = null;
  const cursor = new Date(`${inicio}T00:00:00Z`), end = new Date(`${fin}T00:00:00Z`);
  for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    if (cursor.getUTCDay() > 0 && cursor.getUTCDay() < 6) {
      start ||= date; last = date;
    } else if (start) { ranges.push([start, last]); start = null; }
  }
  if (start) ranges.push([start, last]);
  return ranges;
}
