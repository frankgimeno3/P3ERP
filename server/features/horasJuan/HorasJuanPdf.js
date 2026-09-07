function latin(value) { return String(value).replace(/[^\x20-\x7E\xA0-\xFF]/g, ''); }
function escapePdf(value) { return latin(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)'); }
function money(value) { return `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))} EUR`; }
function date(value) { const [year, month, day] = String(value).slice(0, 10).split('-'); return `${day}.${month}.${year}`; }
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export function createHorasJuanPdf(report) {
  const lines = [`Remuneración J correspondiente mes de ${MONTHS[report.mes - 1]}${report.tipo === 'anticipo' ? ' (anticipada)' : report.tipo === 'informativa' ? ' (informativa)' : ''}`, ''];
  if (report.tipo !== 'anticipo') lines.push(`Horas totales realizadas: ${report.horas_enteras} horas, ${report.minutos} min (${Number(report.horas).toFixed(2)} horas)`, `Precio / hora: ${money(report.precio_hora)} / 1 hora`, `Remuneración total: ${money(report.importe_generado)}`);
  if (report.tipo === 'normal' && Number(report.importe_ajuste) !== 0) lines.push('', 'Importes anteriores a compensar:', `${Number(report.importe_ajuste) > 0 ? 'Adeudado a Juan' : 'Adeudado por Juan'} - ${report.motivo_ajuste || 'Compensación de informes anteriores'}: ${money(Math.abs(report.importe_ajuste))}`);
  if (report.tipo === 'normal') lines.push('', `Total entregado a ${date(report.fecha)}: ${money(report.importe_pagar)}`);
  if (report.tipo === 'anticipo') lines.push(`Remuneración total: ${money(report.importe_anticipo)}`, `Total entregado a ${date(report.fecha)}: ${money(report.importe_pagar)}`, '', 'La diferencia con las horas reales será ajustada en el próximo cierre.');
  if (report.tipo === 'informativa') lines.push('', `Importe anticipado: ${money(report.importe_anticipo)}`, `${Number(report.importe_ajuste) >= 0 ? 'Adeudado a Juan' : 'Adeudado por Juan'}: ${money(Math.abs(report.importe_ajuste))}`, '', 'Este es un documento informativo, no hay Recibí.');
  if (report.tipo !== 'informativa') lines.push('', '', 'RECIBÍ:', `(A fecha ${date(report.fecha)})`);
  const commands = ['BT', '/F1 14 Tf', '60 780 Td']; lines.forEach((line, index) => { if (index) commands.push('0 -24 Td'); commands.push(`(${escapePdf(line)}) Tj`); }); commands.push('ET');
  const stream = commands.join('\n'); const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  let pdf = '%PDF-1.4\n', offset = Buffer.byteLength(pdf, 'latin1'); const offsets = [0]; objects.forEach((object, index) => { offsets.push(offset); const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`; pdf += chunk; offset += Buffer.byteLength(chunk, 'latin1'); }); const xref = offset; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(item => `${String(item).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}
