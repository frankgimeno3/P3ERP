"use client";
import SortableTable from '@/app/components/SortableTable';

import {request} from '@/app/lib/request';

import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import './juan.css';
import JuanRowDetails,{type JuanAssociation,type JuanCharge} from '../../JuanRowDetails';
import JuanAddRow from '../../JuanAddRow';
import InvoicePaymentsModal from '../../InvoicePaymentsModal';
import UnassignedInvoicePayments,{type UnassignedPayment} from '../../UnassignedInvoicePayments';

type Row={id:string;label:string;day:number|null;opening:boolean;values:(number|null)[];cardPart?:string;invoicePaymentId?:string;recurring?:{total_iva:number;cada:number;unidad:string;inicio_dia:number;inicio_mes:number;inicio_anio:number}};
type Sheet={name:string;bank:string;iban:string;year:number;columns:{month:number;kind:string}[];income:Row[];payments:Row[];checks:(number|null)[];closedMonths?:number[]};
type Totals={income:number[];payments:number[];net:number[];balances:number[];differences:(number|null)[]};
type Workbook={unassignedPayments:UnassignedPayment[];version:number;source_name:string;sheets:Sheet[];totals:Totals[];associations:JuanAssociation[];balances:{bank:string;month:number;saldo:string;date:string}[];planned:{key:string;bank:string;section:string;label:string;month:number;amount:number;applied:number;pending:number;date:string;estimatedDate:boolean}[];applications:{cell_key:string;id_linea_banco:string;importe:string;date:string;concepto:string;estado_revision:boolean;duplicado_descartado:boolean}[];orders:{id_orden:string;banco_cobro:string;cobro_total:string;fecha_teorica_cobro:string;forma_cobro:string}[];charges:{id_cargo_recurrente:string;nombre_proveedor:string;nombre_agente:string;tipo_cargo:string;banco_pago:string;programacion:{total_iva:number}[]}[]};
const months=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
const money=(cents:number|null)=>cents===null?'':(cents/100).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const sum=(values:(number|null)[])=>values.reduce<number>((total,value)=>total+(value??0),0);

function AmountCell({value,label,forecast,disabled,onSave}:{value:number|null;label:string;forecast?:boolean;disabled:boolean;onSave:(value:number|null)=>Promise<void>}) {
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),[error,setError]=useState('');
  useEffect(()=>{if(!editing)setDraft(value===null?'':(value/100).toFixed(2).replace('.',','));},[value,editing]);
  const save=async()=>{
    const text=draft.trim().replace(/€/g,'').replace(/\s/g,'');
    const normalized=text.includes(',')?text.replace(/\./g,'').replace(',','.'):text;
    if(text&&!/^-?\d+(\.\d{1,2})?$/.test(normalized)){setError('Usa un importe con hasta dos decimales.');return;}
    const next=text?Math.round(Number(normalized)*100):null;
    if(next===value){setEditing(false);return;}
    await onSave(next);setEditing(false);
  };
  return <td className={`${forecast?'forecast ':''}${(value??0)<0?'negative ':''}${error?'invalid':''}`}>
    <input aria-label={label} title={error||label} inputMode="decimal" disabled={disabled} value={editing?draft:money(value)}
      onFocus={()=>{setEditing(true);setDraft(value===null?'':(value/100).toFixed(2).replace('.',','));setError('');}}
      onChange={event=>{setDraft(event.target.value);setError('');}}
      onBlur={()=>{void save().catch(()=>setEditing(false));}} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();if(event.key==='Escape'){setDraft(value===null?'':(value/100).toFixed(2).replace('.',','));setEditing(false);setError('');}}} />
  </td>;
}

export default function JuanPage(){
  const [year,setYear]=useState(new Date().getFullYear()),[archive,setArchive]=useState(false),[years,setYears]=useState<number[]>([]),[currentYear,setCurrentYear]=useState(new Date().getFullYear()),[closeMonth,setCloseMonth]=useState(10);
  const [data,setData]=useState<Workbook|null>(null),[selected,setSelected]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(''),[review,setReview]=useState(false);
  const [detail,setDetail]=useState<{row:Row;section:'income'|'payments'}|null>(null),[adding,setAdding]=useState<'income'|'payments'|null>(null);
  const closeInvoice=useCallback(()=>setDetail(null),[]);
  const load=useCallback(async(signal?:AbortSignal)=>{setError('');try{const response=await request(`/api/v1/direccion/prevision-liquidez/vista-juan?year=${year}`,{cache:'no-store',signal});const body=await response.json();if(!response.ok)throw Error(body.message);if(signal?.aborted)return;setData(body);setYears(body.years||[]);setCurrentYear(body.currentYear);}catch(e){if(e instanceof Error&&e.name==='AbortError')return;setError(e instanceof Error?e.message:'No se pudo cargar la hoja.');}},[year]);
  useEffect(()=>{const controller=new AbortController();setDetail(null);setAdding(null);setData(null);void load(controller.signal);return()=>controller.abort();},[load]);
  const save=async(section:string,rowId:string,column:number,value:number|null)=>{
    if(!data||busy)return;
    setBusy(true);setError('');setSaved('');
    try{const response=await request('/api/v1/direccion/prevision-liquidez/vista-juan',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({year,version:data.version,bank:data.sheets[selected].bank,section,rowId,column,value})});const body=await response.json();if(!response.ok)throw Error(body.message);setData(body);setSaved('Guardado');window.dispatchEvent(new Event('p3:forecast-changed'));}
    catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');throw e;}
    finally{setBusy(false);}
  };
  const sheet=data?.sheets[selected],totals=data?.totals[selected];
  const header=(section:string)=><thead><tr><th className="concept"/><th>DÍA</th>{months.map((month,index)=><th key={month} colSpan={sheet?.columns.filter(c=>c.month===index+1).length||1}>{month}</th>)}<th className="spacer"/><th>TOTALES</th></tr><tr><th className="section">{section==='income'?'INGRESOS':'PAGOS'}</th><th/>{sheet?.columns.map((column,i)=><th key={i}>{section==='income'?(column.kind==='actual'?'COBROS RECIBIDOS':'COBROS PREVISTOS'):(column.kind==='actual'?'PAGOS REALIZADOS':'PAGOS PREVISTOS')}</th>)}<th className="spacer"/><th>{section==='income'?'INGRESOS':'PAGOS'}</th></tr></thead>;
  const close=async(action:string)=>{if(!data||!sheet)return;setBusy(true);setError('');try{const r=await request('/api/v1/direccion/prevision-liquidez/vista-juan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,year,bank:sheet.bank,month:closeMonth,version:data.version})});const body=await r.json();if(!r.ok)throw Error(body.message);setData(body);setSaved(action==='close-month'?'Mes cerrado: realizado y pendiente unificados':'Mes reabierto');}catch(e){setError(e instanceof Error?e.message:'No se pudo cerrar');}finally{setBusy(false);}};
  const totalRow=(label:string,values:(number|null)[],className='total',annual=true)=><tr className={className}><th colSpan={2}>{label}</th>{values.map((value,i)=><td key={i} className={(value??0)<0?'negative':''}>{money(value)}</td>)}<td className="spacer"/><td>{annual?money(sum(values)):''}</td></tr>;
  return <main className="juan-page">
    <div className="juan-toolbar">
      <Link href="/dashboard/direccion/tesoreria/prevision-liquidez">← Previsión liquidez</Link>
      <strong>Vista Juan</strong>
      <button onClick={()=>setReview(!review)}>{review?'Ocultar revisión':'Revisar importación y diferencias'}</button>
      <span role="status">{busy?'Guardando…':saved}</span>
    </div>
    {error&&<p className="juan-error" role="alert">{error}</p>}
    {data&&<UnassignedInvoicePayments payments={data.unassignedPayments||[]} onSaved={()=>{void load();window.dispatchEvent(new Event('p3:forecast-changed'));}}/>}
    {!data&&!error&&<p>Cargando previsión…</p>}
    {sheet&&totals&&<>
      <div className="juan-tabs" role="tablist" aria-label="Bancos y años">{years.filter(y=>y>=currentYear).flatMap(y=>['BSAB','BSAN'].map((bank,index)=><button key={`${y}:${bank}`} role="tab" aria-selected={!archive&&year===y&&selected===index} disabled={busy} onClick={()=>{setArchive(false);setSelected(index);setYear(y);}} className={!archive&&year===y&&selected===index?'active':''}>{bank} {y}</button>))}<button role="tab" aria-selected={archive} className={archive?'active':''} onClick={()=>setArchive(!archive)}>Anteriores</button></div>
      {archive&&<div className="juan-tabs" role="tablist" aria-label="Años anteriores">{years.filter(y=>y<currentYear).length?years.filter(y=>y<currentYear).map(y=><button key={y} role="tab" aria-selected={year===y} onClick={()=>setYear(y)}>{y}</button>):<p className="juan-hint">Todavía no hay años anteriores importados.</p>}{year<currentYear&&['BSAB','BSAN'].map((bank,index)=><button key={bank} onClick={()=>setSelected(index)}>{bank} {year}</button>)}</div>}
      {(!archive||year<currentYear)&&<>
      <p className="juan-hint">Edita un importe y pulsa Enter o sal de la celda para guardar. Rojo: previsto. Vacío: sin dato. Los totales se calculan automáticamente.</p>
      <p className="juan-hint">Pulsa el concepto de una fila para ver su proveedor o empleado, el cargo asociado y el desglose del grupo. Los conflictos se conservan hasta decidir qué dato es correcto.</p>
      <p className="juan-hint">El + antes de cada total añade una previsión recurrente. Cambiar o borrar un importe previsto ajusta ese mes también en el cargo vinculado del ERP. Las suscripciones se calculan desde las tarjetas.</p>
      {sheet.income.some(r=>r.opening&&r.values.every(v=>v===null))&&<p className="juan-hint">Base revisable del año anterior y programación vigente. No se duplican cargos del ERP. Saldo inicial pendiente del cierre de diciembre; el acumulado muestra una variación provisional.</p>}
      <details className="juan-month-review"><summary>Revisión de fin de mes</summary><p>Si se habían previsto 200 € y se han pagado 150 €, el cierre deja 150 € realizados y 50 € pendientes. No da por pagado lo pendiente. Solo se cierra después de revisar el extracto completo del mes y sus asociaciones.</p><div className="juan-toolbar"><label>Banco: {sheet.bank} · Mes <select aria-label="Mes que revisar" value={closeMonth} onChange={e=>setCloseMonth(Number(e.target.value))}>{months.map((name,i)=><option key={name} value={i+1}>{name} {year}</option>)}</select></label><button disabled={busy||!sheet.columns.some(c=>c.month===closeMonth&&c.kind==='forecast')||new Date(year,closeMonth,1)>new Date()} onClick={()=>{void close(sheet.closedMonths?.includes(closeMonth)?'reopen-month':'close-month');}}>{sheet.closedMonths?.includes(closeMonth)?'Reabrir mes':'Consolidar realizado y pendiente'}</button></div><p>El histórico importado de enero a septiembre de 2026 ya está separado de las previsiones. Los meses futuros no se pueden cerrar.</p></details>
      {review&&<section className="juan-review">
        <h2>Revisión con el ERP</h2>
        <p>Los realizados del Excel son una referencia del contable, no movimientos conciliados. El saldo del ERP muestra el último extracto disponible en cada mes; su fecha debe ser el cierre para comparar. Los cobros sin día se estiman a fin de mes.</p>
        <p>Las previsiones agregadas del Excel pueden incluir órdenes, nóminas, tarjetas y cargos recurrentes existentes. Revisa los solapamientos antes de sumarlas.</p>
        <p>Ingresos desde <Link href="/dashboard/administracion/control-administrativo">Control administrativo → Órdenes</Link>. Mantén banco, forma e importe pendiente en la orden. El presupuesto de Juan se contrasta con estas órdenes; la parte sin orden sigue pendiente de identificar.</p>
        <p>Órdenes sin banco asignado: {data.orders.filter(order=>!order.banco_cobro).length}. No se reparten automáticamente entre bancos.</p>
        <SortableTable className="juan-imports"><thead><tr><th>Mes</th><th>Presupuesto de ingresos</th><th>Pendiente Juan</th><th>Órdenes pendientes con banco</th><th>Diferencia por explicar</th></tr></thead><tbody>{[...new Set(sheet.columns.filter(c=>c.kind==='forecast').map(c=>c.month))].map(month=>{const cells=data.planned.filter(c=>c.bank===sheet.bank&&c.month===month&&c.section==='income');const budget=cells.reduce((n,c)=>n+c.amount,0),pending=cells.reduce((n,c)=>n+c.pending,0);const ordered=data.orders.filter(o=>o.banco_cobro===sheet.bank&&Number(o.fecha_teorica_cobro.includes('/')?o.fecha_teorica_cobro.split('/')[1]:o.fecha_teorica_cobro.slice(5,7))===month).reduce((n,o)=>n+Math.round(Number((o as typeof o&{pending_amount?:string}).pending_amount||0)*100),0);return <tr key={month}><td>{months[month-1]}</td><td>{money(budget)}</td><td>{money(pending)}</td><td>{money(ordered)}</td><td>{money(pending-ordered)}</td></tr>;})}</tbody></SortableTable>
        <details><summary>Ingresos y gastos previstos importados de Juan ({data.planned.filter(cell=>cell.bank===sheet.bank).length})</summary>
          <SortableTable className="juan-imports"><thead><tr>{['Tipo','Concepto','Fecha prevista','Previsto','Aplicado','Pendiente'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{data.planned.filter(cell=>cell.bank===sheet.bank).map(cell=><tr key={cell.key}><td>{cell.section==='income'?'Ingreso':'Gasto'}</td><td>{cell.label}</td><td>{cell.date}{cell.estimatedDate?' (fin de mes estimado)':''}</td><td>{money(cell.amount)}</td><td>{money(cell.applied)}</td><td>{money(cell.pending)}</td></tr>)}</tbody></SortableTable>
        </details>
        {data.applications.length>0&&<details><summary>Movimientos bancarios asociados</summary><ul>{data.applications.map(application=><li key={`${application.cell_key}:${application.id_linea_banco}`}><span>{application.date} · {application.concepto} · {money(Math.round(Number(application.importe)*100))}</span>{!application.estado_revision||application.duplicado_descartado?' · No computa: movimiento reabierto o descartado':''}</li>)}</ul></details>}
        <details><summary>Cargos existentes que conviene contrastar</summary><ul>{data.charges.map(charge=><li key={charge.id_cargo_recurrente}><Link href={`/dashboard/direccion/tesoreria/prevision-liquidez/${charge.id_cargo_recurrente}`}>{charge.nombre_proveedor||charge.nombre_agente||'Otro'}: {charge.programacion.map(rule=>money(Math.round(rule.total_iva*100))).join(', ')} · {charge.banco_pago||'Sin banco'}</Link></li>)}</ul></details>
      </section>}
      <div className="juan-sheet" style={{fontSize:'10px',minWidth:sheet.columns.length>15?'2300px':'1400px'}}>
        <h1>{sheet.bank==='Sabadell'?'BANC SABADELL':'SANTANDER'} {sheet.year} <span>{sheet.iban}</span></h1>
        {(['income','payments'] as const).map(section=><SortableTable key={section} className="juan-grid">
          {header(section)}
          <tbody>{sheet[section].map(row=><tr key={row.id}><th><button className="juan-row-detail" type="button" disabled={busy} onClick={()=>setDetail({row,section})} title="Ver cargos recurrentes y proveedor">{row.label}</button></th><td className="day">{row.day}</td>{row.values.map((value,i)=><AmountCell key={`${sheet.bank}:${row.id}:${i}`} value={value} label={`${row.label}, ${months[sheet.columns[i].month-1]}, ${sheet.columns[i].kind==='actual'?'realizado':'previsto'}`} forecast={sheet.columns[i].kind==='forecast'} disabled={busy||Boolean(sheet.closedMonths?.includes(sheet.columns[i].month))||Boolean(row.invoicePaymentId)||(row.cardPart==='subscriptions'&&sheet.columns[i].kind==='forecast')} onSave={value=>save(section,row.id,i,value)} />)}<td className="spacer"/><td>{money(sum(row.values))}</td></tr>)}
            <tr className="juan-add-row"><th><button type="button" disabled={busy} aria-label={`Añadir ${section==='income'?'ingreso':'gasto'} recurrente`} onClick={()=>setAdding(section)}>+</button></th><td colSpan={sheet.columns.length+1}/><td className="spacer"/><td/></tr>
            {totalRow(section==='income'?'TOTAL INGRESOS':'TOTAL PAGOS',totals[section])}
          </tbody>
        </SortableTable>)}
        <SortableTable className="juan-grid juan-balances"><tbody>
          {totalRow('TOTAL INGRESOS − PAGOS DEL MES',totals.net,'total')}
          {totalRow(sheet.income.some(r=>r.opening&&r.values.some(v=>v!==null))?'SALDO BANCARIO ACUMULADO PREVISTO':'VARIACIÓN ACUMULADA · SALDO INICIAL PENDIENTE',totals.balances,'total',false)}
          <tr className="check"><th colSpan={2}>COMPROBACIÓN: SALDO A ÚLTIMO DÍA DEL MES</th>{sheet.checks.map((value,i)=><AmountCell key={`${sheet.bank}:check:${i}`} value={value} label={`Comprobación ${months[sheet.columns[i].month-1]} ${sheet.columns[i].kind}`} disabled={busy||Boolean(sheet.closedMonths?.includes(sheet.columns[i].month))} onSave={value=>save('checks','',i,value)}/>)}<td className="spacer"/><td/></tr>
          {totalRow('DIFERENCIA CON COMPROBACIÓN',totals.differences,'check',false)}
          {totalRow('PREVISIONES PENDIENTES DE COBRO',sheet.columns.map(column=>column.kind==='forecast'?data.planned.filter(cell=>cell.bank===sheet.bank&&cell.month===column.month&&cell.section==='income').reduce((total,cell)=>total+cell.pending,0):null),'erp',false)}
          {totalRow('PREVISIONES PENDIENTES DE PAGO',sheet.columns.map(column=>column.kind==='forecast'?data.planned.filter(cell=>cell.bank===sheet.bank&&cell.month===column.month&&cell.section==='payments').reduce((total,cell)=>total+cell.pending,0):null),'erp',false)}
          {totalRow('SALDO ÚLTIMO EXTRACTO ERP',sheet.columns.map(column=>{const row=data.balances.find(value=>value.bank===sheet.bank&&value.month===column.month);return row?Math.round(Number(row.saldo)*100):null;}),'erp',false)}
          <tr className="erp"><th colSpan={2}>FECHA DEL EXTRACTO ERP</th>{sheet.columns.map((column,i)=><td key={i}>{data.balances.find(value=>value.bank===sheet.bank&&value.month===column.month)?.date||''}</td>)}<td className="spacer"/><td/></tr>
          {totalRow('DIFERENCIA EXCEL − EXTRACTO ERP',sheet.columns.map((column,i)=>{const row=data.balances.find(value=>value.bank===sheet.bank&&value.month===column.month);return row?totals.balances[i]-Math.round(Number(row.saldo)*100):null;}),'erp',false)}
        </tbody></SortableTable>
      </div>
      {detail?.row.invoicePaymentId&&<InvoicePaymentsModal id={detail.row.invoicePaymentId} onClose={closeInvoice} onSaved={()=>{setDetail(null);void load();window.dispatchEvent(new Event('p3:forecast-changed'));}}/>}
      {detail&&!detail.row.invoicePaymentId&&<JuanRowDetails year={year} bank={sheet.bank} rowId={detail.row.id} label={detail.row.label} section={detail.section} day={detail.row.day} recurring={detail.row.recurring} version={data.version} budgets={months.map((_,i)=>(sheet[detail.section].find(r=>r.id===detail.row.id)||detail.row).values[sheet.columns.findIndex(c=>c.month===i+1&&c.kind==='forecast')]??null)} associations={data.associations} charges={data.charges as JuanCharge[]} orders={data.orders} onSaved={async()=>{await load();window.dispatchEvent(new Event('p3:forecast-changed'));}} onClose={()=>setDetail(null)}/>}
      {adding&&<JuanAddRow year={year} bank={sheet.bank} section={adding} version={data.version} charges={data.charges as JuanCharge[]} onSaved={async()=>{await load();window.dispatchEvent(new Event('p3:forecast-changed'));}} onClose={()=>setAdding(null)}/>}
      </>}
    </>}
  </main>;
}
