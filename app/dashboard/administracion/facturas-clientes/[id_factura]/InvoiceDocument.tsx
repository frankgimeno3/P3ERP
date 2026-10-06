
import SortableTable from '@/app/components/SortableTable';
import styles from './InvoiceDocument.module.css';

const money=(value:unknown)=>Number(value||0).toLocaleString('es-ES',{useGrouping:true,minimumFractionDigits:2,maximumFractionDigits:2});
const date=(value:unknown)=>{
  const text=String(value||'');
  const iso=/^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return iso?`${iso[3]}/${iso[2]}/${iso[1]}`:text||'—';
};

export default function InvoiceDocument({invoice}:{invoice:any}) {
  const emitted=invoice.verifactu_estado_envio==='factura emitida';
  const fiscal=invoice.datos_fiscales||{};
  const account=emitted?{}:invoice.cuenta_documento||{};
  const fiscalValue=(key:string)=>fiscal[key]||account[key]||'';
  const lines=invoice.lineas||[];
  const orders=(invoice.ordenes||[]).filter((order:any)=>!order.cancelada);
  const currency=invoice.moneda||'EUR';
  const banks=Array.from(new Set(orders.map((order:any)=>order.banco_cobro).filter(Boolean))) as string[];
  const rates=Array.from(new Set(lines.map((line:any)=>Number(line.iva_porcentaje??invoice.iva_porcentaje??0))));
  const code=String(invoice.codigo_cliente||'');
  const payment=String(invoice.forma_cobro||orders[0]?.forma_cobro||'');
  const surcharge=lines.reduce((sum:number,line:any)=>sum+Number(line.base_imponible||0)*Number(line.recargo_equivalencia_porcentaje||0)/100,0);
  const withholding=lines.reduce((sum:number,line:any)=>sum+Number(line.base_imponible||0)*Number(line.retencion_porcentaje||0)/100,0);
  const vatAmount=Number(invoice.importe_total||0)-Number(invoice.base_imponible||0)-surcharge+withholding;
  return <div className={styles.viewport}>
    <article className={styles.paper} aria-label="Documento de factura">
      <header className={styles.header}>
        {/* The letterhead is the original image embedded in the supplied reference PDF. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.logo} src="/invoices/proporcion3-letterhead.png" alt="Proporción 3, S.A. · Bruc, 48 · Barcelona"/>
        <div className={styles.customer}>
          <div className={styles.customerAddress}>
            <strong>{fiscalValue('nombre_fiscal')||invoice.nombre_empresa||'Cliente sin nombre'}</strong>
            {[fiscalValue('direccion_facturacion'),[fiscalValue('cp_facturacion'),fiscalValue('poblacion_facturacion')].filter(Boolean).join(' '),fiscalValue('pais_facturacion')].filter(Boolean).map((value,index)=><div key={index}>{value}</div>)}
          </div>
          <p className={styles.customerCode}>Código cliente: {code&&code!=='0'?code:'—'}</p>
        </div>
        <SortableTable className={styles.metadata}><thead><tr><th>{invoice.factura_tipo==='abono'?'FACTURA ABONO':emitted?'FACTURA':'FACTURA PREVIA'}</th><th>FECHA</th><th>NIF/CIF</th></tr></thead><tbody><tr><td>{invoice.numero_factura||'Sin número'}</td><td>{date(invoice.fecha_factura)}</td><td>{fiscalValue('vat_code')||'—'}</td></tr></tbody></SortableTable>
      </header>
      <section className={styles.detail} aria-label="Conceptos y totales">
        <p className={styles.legal}>CIF. A-46449005 Reg. Merc. Barcelona: Tomo 11470, Libro 10243, Sec. 2º, Folio 218, Hoja 131.154 Insc. 2ª</p>
        <SortableTable className={styles.items}>
          <colgroup><col style={{width:'70%'}}/><col style={{width:'8%'}}/><col style={{width:'11%'}}/><col style={{width:'11%'}}/></colgroup>
          <thead><tr><th>Concepto</th><th>Cantidad</th><th>Precio</th><th>Importe</th></tr></thead>
          <tbody>{lines.map((line:any,index:number)=><tr key={line.id_linea_factura||index}>
            <td><div>{line.concepto||'—'}</div>{line.descripcion&&<div className={styles.description}>{line.descripcion}</div>}{line.precio_no_desglosado&&!/sin desglose/i.test(line.descripcion||'')&&<div className={styles.description}>Importe global sin desglose de precios unitarios.</div>}</td>
            <td>{line.precio_no_desglosado?'—':Number(line.cantidad??1).toLocaleString('es-ES')}</td>
            <td>{line.precio_no_desglosado?'—':money(line.precio_unitario)}</td>
            <td>{money(line.base_imponible)}</td>
          </tr>)}{!lines.length&&<tr><td colSpan={4}>Sin conceptos registrados.</td></tr>}
          <tr className={styles.filler} aria-hidden="true"><td/><td/><td/><td/></tr></tbody>
        </SortableTable>
        {(surcharge!==0||withholding!==0)&&<div className={styles.adjustments}>{surcharge!==0&&<p>Recargo de equivalencia: {money(surcharge)} {currency}</p>}{withholding!==0&&<p>Retención: −{money(withholding)} {currency}</p>}</div>}
        <SortableTable className={styles.totals}><thead><tr><th>Base imponible</th><th>I.V.A.</th><th>Importe I.V.A.</th><th>TOTAL {currency==='EUR'?'EUROS':currency}</th></tr></thead><tbody><tr><td>{money(invoice.base_imponible)}</td><td>{(rates.length?rates:[Number(invoice.iva_porcentaje||0)]).map(rate=>`${Number(rate).toLocaleString('es-ES')} %`).join(' / ')}</td><td>{money(vatAmount)}</td><td>{money(invoice.importe_total)}</td></tr></tbody></SortableTable>
      </section>
      <footer className={styles.payment}>
        <h2>FORMA DE PAGO:</h2>
        <div>{payment?payment.toLocaleUpperCase('es'):'Sin especificar'}{banks.length>0&&<span> · {banks.join(' / ').toLocaleUpperCase('es')}</span>}</div>
        {invoice.factura_snapshot?.iban&&<div>IBAN {invoice.factura_snapshot.iban}{invoice.factura_snapshot.swift?` · SWIFT ${invoice.factura_snapshot.swift}`:''}</div>}
        <div className={styles.dueDates}>{orders.length?orders.map((order:any,index:number)=><p key={order.id_orden}>{index+1} · VENCIMIENTO: {date(order.fecha_teorica_cobro)} <span>{money(order.cobro_total)} {currency}</span></p>):<p>VENCIMIENTO: {date(invoice.fecha_vencimiento)}</p>}</div>
      </footer>
    </article>
  </div>;
}
