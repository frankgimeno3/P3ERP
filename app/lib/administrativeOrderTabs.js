export function administrativeOrderTab(order, year = new Date().getFullYear()) {
  const prefix = `C${String(year).slice(-2).padStart(2, '0')}`;
  if (!String(order.id_orden ?? '').trim().startsWith(prefix)) return 'anteriores';
  return order.cancelada ? 'canceladas' : 'vigentes';
}
