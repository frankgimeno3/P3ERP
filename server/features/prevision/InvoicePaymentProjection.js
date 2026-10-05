// A documented invoice obligation replaces its explicitly linked estimate.
// Unlinked obligations are independent; never match solely by amount or supplier.
export function projectInvoicePayments(sheets, payments, charges, links) {
  const unassigned = [];
  for (const payment of payments) {
    const sheet = sheets.find(s => s.bank === payment.cuenta_pago);
    if (!sheet) {
      const month=Number(payment.date.slice(5,7)),year=Number(payment.date.slice(0,4));
      if(sheets.some(s=>(!s.year||s.year===year)&&s.columns.some(c=>c.kind==='forecast'&&c.month===month)&&!s.closedMonths?.includes(month)))unassigned.push(payment);
      continue;
    }
    const month = Number(payment.date.slice(5, 7)), column = sheet.columns.findIndex(c => c.kind === 'forecast' && c.month === month);
    if (payment.id_vencimiento) {
      const charge = charges.find(c => c.vencimientos?.some(v => String(v.id) === String(payment.id_vencimiento)));
      const due = charge?.vencimientos?.find(v => String(v.id) === String(payment.id_vencimiento));
      const dueMonth=Number(due?.fecha.slice(5,7));
      const dueColumn=sheet.columns.findIndex(c=>c.kind==='forecast'&&c.month===dueMonth);
      const link = charge && links.find(l => String(l.target_id) === String(charge.id_cargo_recurrente) && l.cell_key.endsWith(`:${dueMonth}`) && l.cell_key.startsWith(`${sheet.bank}:`));
      const row = link && sheet.payments.find(r => link.cell_key === `${sheet.bank}:${r.id}:${dueMonth}`);
      if (row && due && dueColumn>=0 && !sheet.closedMonths?.includes(dueMonth)) row.values[dueColumn] = Math.max(0, (row.values[dueColumn] || 0) - Math.round(Number(due.importe) * 100));
    }
    if (column < 0 || sheet.closedMonths?.includes(month) || sheet.year && Number(payment.date.slice(0,4))!==sheet.year) continue;
    const id = `payments:invoice:${payment.id_pago}`;
    let row = sheet.payments.find(r => r.id === id);
    if (!row) { row = { id, label: payment.nombre_planificacion || `Factura ${payment.id_factura_proveedor}`, day: Number(payment.date.slice(8)), opening: false, values: sheet.columns.map(() => null), invoicePaymentId: payment.id_pago }; sheet.payments.push(row); }
    row.values[column] = Math.round(Number(payment.total_pago) * 100);
  }
  return unassigned;
}
