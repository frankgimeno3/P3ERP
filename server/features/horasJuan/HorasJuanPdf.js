import { jsPDF } from 'jspdf';
import { juanReportBlocks, validateJuanReport } from '../../../app/lib/horasJuanReport.js';
export function createHorasJuanPdf(report) {
  const missing=validateJuanReport(report);
  if(missing.length) throw new Error(`No se puede guardar el PDF. Faltan datos o no son válidos: ${missing.join(', ')}.`);
  const doc=new jsPDF({unit:'pt',format:'a4'}), margin=50, width=doc.internal.pageSize.getWidth()-margin*2, bottom=doc.internal.pageSize.getHeight()-margin;
  let y=70;
  const newPage=()=>{doc.addPage();y=70;};
  for(const [index,block] of juanReportBlocks(report).entries()) {
    const size=index===0?17:12, leading=size*1.65;
    doc.setFont('helvetica',block.bold?'bold':'normal'); doc.setFontSize(size);
    if(block.gap) y+=22;
    const lines=doc.splitTextToSize(block.text,width);
    if(block.text==='RECIBÍ:' && y+150>bottom) newPage();
    for(const line of lines) {if(y+leading>bottom)newPage();doc.text(line,margin,y);y+=leading;}
  }
  if(report.tipo!=='informativa') {if(y+90>bottom)newPage();doc.setDrawColor(180);doc.line(margin,y+80,margin+width,y+80);}
  return Buffer.from(doc.output('arraybuffer'));
}
