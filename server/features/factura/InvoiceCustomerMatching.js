import {supplierCountries} from '../../../app/data/supplierCountries.js';

const text=value=>String(value??'').trim();
const key=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const unique=values=>[...new Set(values.filter(Boolean))];
const eu=new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI SE'.split(' '));
export function invoiceRegionalTotals(invoice,account={}) {
  const fields=['total_nac_iva','total_ue','total_resto'];
  if(fields.every(field=>invoice[field]!=null)||fields.some(field=>Number(invoice[field])!==0&&invoice[field]!=null))return Object.fromEntries(fields.map(field=>[field,invoice[field]==null?0:Number(invoice[field])]));
  const original=invoice.datos_importacion?.registro_facturas?.original;
  if(original&&original.slice(4,7).some(value=>value!=null&&value!==''))return Object.fromEntries(fields.map((field,index)=>[field,Number(original[index+4]||0)]));
  if(invoice.moneda&&invoice.moneda!=='EUR')return {};
  if(invoice.importe_total!=null&&Number(invoice.importe_total)===0)return Object.fromEntries(fields.map(field=>[field,0]));
  const country=text(invoice.datos_fiscales?.pais||account.pais_facturacion||account.pais_cuenta);
  const aliases={HOLANDA:'NL',PAISESBAJOS:'NL',ESPANA:'ES',CHINARP:'CN'};
  const code=aliases[key(country)]||supplierCountries.find(item=>item.code===country.toUpperCase()||key(item.name)===key(country))?.code;
  if(!code||invoice.importe_total==null)return {};
  const target=code==='ES'?'total_nac_iva':eu.has(code)?'total_ue':'total_resto';
  return Object.fromEntries(fields.map(field=>[field,field===target?Number(invoice.importe_total):0]));
}

export function matchInvoiceCustomers(invoices,accounts,orders,contracts=[]) {
  const byId=new Map(accounts.map(account=>[account.id_cuenta,account]));
  const byContract=new Map(contracts.map(contract=>[contract.id_contrato,contract.id_cuenta_contrato]));
  const byName=new Map();
  for(const account of accounts)for(const name of unique([key(account.nombre_empresa),key(account.nombre_fiscal)]))byName.set(name,[...(byName.get(name)||[]),account]);
  const patches=[],unresolved=new Map(),resolved=[];
  for(const invoice of invoices){
    const aliases=unique([invoice.id_factura_cliente,invoice.numero_factura]);
    const linked=orders.filter(order=>aliases.includes(order.id_factura)||order.id_orden===invoice.id_orden_origen||(!order.id_factura&&invoice.id_contrato&&order.id_contrato===invoice.id_contrato));
    const orderAccounts=unique(linked.map(order=>byId.has(order.id_cuenta)?order.id_cuenta:byContract.get(order.id_contrato)).filter(id=>byId.has(id)));
    const fiscal=text(invoice.datos_fiscales?.nombre_fiscal||invoice.datos_importacion?.registro_facturas?.cliente);
    const candidates=byName.get(key(fiscal))||[];
    let account=orderAccounts.length===1?byId.get(orderAccounts[0]):null;
    const existing=byId.get(invoice.id_cuenta);
    if(!orderAccounts.length)account=candidates.length===1?candidates[0]:existing&&(!fiscal||[existing.nombre_empresa,existing.nombre_fiscal].some(name=>key(name)===key(fiscal)))?existing:null;
    const label=fiscal||text(existing?.nombre_fiscal||existing?.nombre_empresa)||'Sin nombre fiscal';
    if(!account){const group=unresolved.get(label)||{nombre_fiscal:label,facturas:[],candidatos:[]};group.facturas.push(invoice.id_factura_cliente);group.candidatos=unique([...group.candidatos,...orderAccounts,...candidates.map(item=>item.id_cuenta)]);unresolved.set(label,group);}
    const forms=unique(linked.map(order=>text(order.forma_cobro)).filter(Boolean));
    const patch={};
    if(account&&account.id_cuenta!==invoice.id_cuenta)patch.id_cuenta=account.id_cuenta;
    if(!text(invoice.forma_cobro)&&forms.length)patch.forma_cobro=forms.join(', ');
    for(const [field,value] of Object.entries(invoiceRegionalTotals(invoice,account||existing)))if(invoice[field]==null&&Number.isFinite(value))patch[field]=value;
    // Fiscal snapshots and issued documents remain intact; list fallbacks can still display their known data.
    if(Object.keys(patch).length&&!invoice.ya_contabilizada&&!invoice.verifactu_generated_at)patches.push({id:invoice.id_factura_cliente,patch});
    resolved.push({id:invoice.id_factura_cliente,account:account?.id_cuenta,cliente:account?.nombre_empresa||account?.nombre_fiscal||fiscal,orders:linked.length});
  }
  return {patches,unresolved:[...unresolved.values()],resolved};
}
