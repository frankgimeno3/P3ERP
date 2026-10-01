import XLSX from 'xlsx';
import { bulkImportTypes } from '../../../app/config/bulkImportFields.js';
import { parseImportDate, parseImportAmount } from '../prevision/ReceiptExcel.js';
import { paymentMethods } from '../contrato/DirectContract.js';

export function readBulkExcel(buffer,type) {
  if(!Object.hasOwn(bulkImportTypes,type))throw new Error('Tipo de importación no válido.');
  const schema=bulkImportTypes[type];
  const book=XLSX.read(buffer,{type:'buffer',cellDates:false,sheetRows:5002});
  const sheet=book.Sheets[book.SheetNames[0]];
  if(!sheet)throw new Error('El archivo no contiene una hoja.');
  if(XLSX.utils.decode_range(sheet['!ref'] || 'A1').e.c>100)throw new Error('El archivo tiene demasiadas columnas.');
  const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,blankrows:true});
  const headers=(matrix.shift() || []).map(value=>String(value).trim());
  if(!headers.length || new Set(headers).size!==headers.length)throw new Error('Las cabeceras están vacías o repetidas.');
  if(!headers.includes(schema.id))throw new Error(`La columna ${schema.id} es obligatoria.`);
  const fields=new Map(schema.fields.map(field=>[field.key,field]));
  if(headers.some(header=>!fields.has(header)))throw new Error('Columnas no admitidas: '+headers.filter(header=>!fields.has(header)).join(', ')+'. Usa la plantilla exacta.');
  if(matrix.length>5000)throw new Error('El límite es de 5.000 filas.');
  const seen=new Set();
  return matrix.map((values,index)=>{
    if(values.every(value=>String(value).trim()===''))return null;
    const data={},errors=[];
    headers.forEach((header,column)=>{
      let value=values[column];if(value==null || String(value).trim()==='' || String(value).trim()==='-')return;
      try {
        const field=fields.get(header);
        if(field.type==='date')value=parseImportDate(value,book.Workbook?.WBProps?.date1904);
        else if(field.type==='amount'){value=parseImportAmount(value);if(value<0)throw new Error('debe ser positivo o cero');}
        else if(field.type==='integer'){value=Number(value);if(!Number.isSafeInteger(value)||value<=0)throw new Error('debe ser un entero positivo');}
        else if(field.type==='boolean'){const raw=String(value).trim().toLowerCase();if(!['sí','si','no','true','false','1','0'].includes(raw))throw new Error('usa sí/no');value=['sí','si','true','1'].includes(raw);}
        else {value=String(value).trim();const cell=sheet[XLSX.utils.encode_cell({r:index+1,c:column})];if(field.type==='text'&&typeof values[column]==='number'&&/^0\d+$/.test(cell?.w || ''))value=cell.w;}
        if(field.type==='payment'&&!paymentMethods.includes(value.toLowerCase()))throw new Error('usa transferencia, recibo, tarjeta, efectivo o pagaré');
        if(field.type==='payment')value=value.toLowerCase();
        if(field.type==='bank'&&!['Sabadell','Santander'].includes(value))throw new Error('usa Sabadell o Santander');
        if(typeof value==='string'&&value.length>4000)throw new Error('máximo 4.000 caracteres');
        data[header]=value;
      }catch(error){errors.push(header+': '+error.message);}
    });
    if(!data[schema.id])errors.push('Falta '+schema.id);
    else if(seen.has(data[schema.id]))errors.push('Identificador repetido en el archivo.');
    seen.add(data[schema.id]);
    return {row:index+2,data,errors};
  }).filter(Boolean);
}
