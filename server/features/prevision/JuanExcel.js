import XLSX from 'xlsx';

export const JUAN_SOURCE = '260930 PREVISION DE BSAB Y BSANT P3 2026.xls';
export const toCents = value => Math.round(Number(value) * 100);
export const MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

// Read only the two 2026 schedules. Formula totals are independent controls,
// never transactions; January's opening balance is likewise not income.
export function parseJuanExcel(buffer) {
  const workbook = XLSX.read(buffer, {type:'buffer'});
  return ['BSAB 2026','BSANT 2026'].map(name => {
    const sourceName=workbook.SheetNames.find(value=>value.replace(/\s/g,'')===name.replace(/\s/g,''));
    const sheet = workbook.Sheets[sourceName];
    if (!sheet) throw Error(`Falta la hoja ${name}`);
    const grid = XLSX.utils.sheet_to_json(sheet,{header:1,defval:null});
    const at = label => grid.findIndex(row => String(row[0] || '').trim() === label);
    const incomeStart = at('INGRESOS'), incomeEnd = at('TOTAL INGRESOS');
    const paymentStart = at('PAGOS'), paymentEnd = at('TOTAL PAGOS');
    const check = grid[at('COMPROBACION: SALDO A ULTIMO DIA MES')];
    if ([incomeStart,incomeEnd,paymentStart,paymentEnd].some(i=>i<0) || !check) throw Error(`Diseño no reconocido: ${name}`);
    const columns = Array.from({length:15},(_,i)=>({month:i<9?i+1:10+Math.floor((i-9)/2),kind:i<9 || (i-9)%2===0?'actual':'forecast'}));
    const rows = (start,end,section) => grid.slice(start+1,end).map((row,index)=>({
      id:`${section}:${start+index+2}`, label:String(row[0] || '').trim(), day:Number.isInteger(row[1])?row[1]:null,
      opening:/^SALDO\s+01-01-2026/.test(String(row[0])),
      values:columns.map((_,i)=>typeof row[i+2]==='number'?toCents(row[i+2]):null),
      sourceRow:start+index+2,
    }));
    const result={name,bank:name==='BSAB 2026'?'Sabadell':'Santander',iban:String(grid[1].find(v=>typeof v==='string'&&v.startsWith('ES')) || ''),year:2026,columns,
      income:rows(incomeStart,incomeEnd,'income'),payments:rows(paymentStart,paymentEnd,'payments'),
      checks:columns.map((_,i)=>typeof check[i+2]==='number'?toCents(check[i+2]):null),
      controls:{income:columns.map((_,i)=>toCents(grid[incomeEnd][i+2] || 0)),payments:columns.map((_,i)=>toCents(grid[paymentEnd][i+2] || 0))}};
    for(const section of ['income','payments']) for(let i=0;i<15;i++) {
      if(result[section].reduce((sum,row)=>sum+(row.values[i]??0),0)!==result.controls[section][i]) throw Error(`No cuadra ${name}, ${section}, columna ${i+3}`);
    }
    return result;
  });
}

export function juanTotals(sheet) {
  const income=sheet.columns.map((_,i)=>sheet.income.reduce((sum,row)=>sum+(row.values[i]??0),0));
  const payments=sheet.columns.map((_,i)=>sheet.payments.reduce((sum,row)=>sum+(row.values[i]??0),0));
  const net=income.map((value,i)=>value-payments[i]);
  const balances=net.map((_,i)=> {
    const {month,kind}=sheet.columns[i];
    // Each actual/forecast pair uses the same prior month, not an extra month.
    return net.reduce((sum,value,j)=>sum+(sheet.columns[j].month<=month && (kind==='forecast'||sheet.columns[j].kind==='actual')?value:0),0);
  });
  return {income,payments,net,balances,differences:balances.map((value,i)=>sheet.checks[i]===null?null:value-sheet.checks[i])};
}

export function plannedJuanCells(sheets) {
  return sheets.flatMap(sheet=>['income','payments'].flatMap(section=>sheet[section].filter(row=>!row.opening).flatMap(row=>sheet.columns.flatMap((column,i)=> {
    const amount=sheet.closedMonths?.includes(column.month)?row.closingBudget?.[column.month]??row.values[i]:row.values[i];
    if(column.kind!=='forecast'||!amount)return [];
    const day=Math.min(row.day || new Date(Date.UTC(sheet.year,column.month,0)).getUTCDate(),new Date(Date.UTC(sheet.year,column.month,0)).getUTCDate());
    return [{key:`${sheet.bank}:${row.id}:${column.month}`,bank:sheet.bank,section,rowId:row.id,label:row.label,month:column.month,amount,
      date:`${String(day).padStart(2,'0')}/${String(column.month).padStart(2,'0')}/${sheet.year}`,estimatedDate:!row.day}];
  }))));
}
