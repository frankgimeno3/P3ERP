import XLSX from 'xlsx';
import { administrativeExcelFields } from '../../../app/config/administrativeExcelFields.js';
import { parseImportAmount, parseImportDate } from '../prevision/ReceiptExcel.js';

const key = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const empty = value => value == null || ['', '-'].includes(String(value).trim());
const aliases = {
  orden:'id_orden',numeroorden:'id_orden',numerodeorden:'id_orden',norden:'id_orden',
  factura:'id_factura',numerofactura:'id_factura',numerodefactura:'id_factura',nfactura:'id_factura',
  contrato:'id_contrato',cliente:'cliente',cuenta:'id_cuenta',agente:'agente',
  numerocobro:'numero_cobro',ncobro:'numero_cobro',recibo:'numero_cobro',
  fechateorica:'fecha_teorica_cobro',fechacobroteorica:'fecha_teorica_cobro',vencimiento:'fecha_teorica_cobro',
  fechareal:'fecha_real_cobro',fechacobro:'fecha_real_cobro',fechadecobro:'fecha_real_cobro',formacobro:'forma_cobro',
  banco:'banco_cobro',importerecibo:'cobro_total',total:'cobro_total',cobrototal:'cobro_total',importe:'cobro_total',
  estado:'cobrada',estadocobro:'cobrada',cobrado:'cobrada',
};
for (const [field,label] of administrativeExcelFields) { aliases[key(field)]=field; aliases[key(label)]=field; }

export function readAdministrativeExcel(buffer, mapping) {
  const wb=XLSX.read(buffer,{type:'buffer',sheetRows:5002,cellDates:false});
  const sheet=wb.Sheets[wb.SheetNames[0]];
  if(!sheet)throw new Error('El Excel no tiene hojas.');
  const range=XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
  if(range.e.r>5000 || range.e.c>100)throw new Error('Máximo 5.000 órdenes y 101 columnas.');
  const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',blankrows:true});
  const headers=(matrix[0] || []).map(value=>String(value).trim());
  if(!headers.length || headers.some(h=>!h) || new Set(headers).size!==headers.length)throw new Error('Los encabezados deben ser únicos y tener nombre.');
  const detected=Object.fromEntries(headers.map(h=>[h,aliases[key(h)] || 'extra']));
  if(!mapping)return {headers,mapping:detected,sample:matrix.slice(1,4)};
  if(Object.keys(mapping).some(h=>!headers.includes(h)))throw new Error('La correspondencia no pertenece a este archivo.');
  const targets=headers.map(h=>mapping[h] || 'extra');
  const mapped=targets.filter(t=>t!=='extra');
  if(mapped.some(t=>!administrativeExcelFields.some(([field])=>field===t)) || new Set(mapped).size!==mapped.length || !mapped.includes('id_orden'))throw new Error('Asocia una columna a Orden y no asocies dos columnas al mismo campo.');
  const rows=[],seen=new Set();
  matrix.slice(1).forEach((cells,index)=>{
    if(cells.every(empty))return;
    const row={datos_importacion:{}};
    try {
      headers.forEach((header,i)=>{
        const value=cells[i]; if(empty(value))return;
        const field=targets[i];
        if(field==='extra'){row.datos_importacion[header]=value;return;}
        let parsed=String(value).trim();
        const formatted=sheet[XLSX.utils.encode_cell({r:range.s.r+index+1,c:range.s.c+i})]?.w;
        if(field.startsWith('id_') && typeof value==='number' && /^\d+$/.test(formatted || '') && Number(formatted)===value)parsed=formatted;
        if(['base_imponible','cobro_total'].includes(field))parsed=parseImportAmount(value);
        if(field.startsWith('fecha_'))parsed=parseImportDate(value,wb.Workbook?.WBProps?.date1904);
        if(field==='numero_cobro'){parsed=Number(value);if(!Number.isInteger(parsed) || parsed<1 || parsed>2147483647)throw new Error('Número de cobro no válido.');}
        if(field==='cobrada'){
          if(['si','true','1','cobrada','cobrado','pagado'].includes(key(value)))parsed=true;
          else if(['no','false','0','pendiente','nocobrada','nocobrado'].includes(key(value)))parsed=false;
          else throw new Error('Cobrada debe indicar Sí/No, Cobrada/Pendiente o 1/0.');
        }
        if(field==='banco_cobro'){
          if(!['sabadell','santander'].includes(key(value)))throw new Error('Banco debe ser Sabadell o Santander.');
          parsed=key(value)==='sabadell'?'Sabadell':'Santander';
        }
        if(['cliente','agente'].includes(field))row.datos_importacion[field]=parsed;else row[field]=parsed;
      });
      if(!row.id_orden)throw new Error('Orden es obligatoria en todas las filas.');
      if(seen.has(row.id_orden))throw new Error('La orden '+row.id_orden+' está repetida en el archivo.');
      seen.add(row.id_orden);rows.push(row);
    }catch(error){throw new Error('Fila '+(index+2)+': '+error.message);}
  });
  if(!rows.length)throw new Error('El Excel no contiene órdenes.');
  return {rows,total:rows.length};
}
