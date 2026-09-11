'use client';
import SearchableSelect from "@/app/components/SearchableSelect";

import Link from 'next/link';
import { EmployeePayrollList } from './EmployeePayroll';
import RecurringChargeModal from '../../bancos/RecurringChargeModal';
import { EmployeeList } from './Employees';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Documents, Field, Form, Header, Modal, Notice, PeriodFields, money, periodLabel, request, root, useResource } from './ui';

type Employee = { id_agente: string; nombre: string };
type Transfer = { id_linea_banco: string; banco: string; fecha_valor: string; concepto: string; importe: string };
type Payment = { id: string; id_empleado: string; empleado: string; mes: number; anio: number; importe_neto: string; estado: string; comentarios: string; id_transferencia: string | null };
type PaymentDetail = Payment & { detalle_anticipos: Payment[]; transferencias: Transfer[]; total_anticipos_pagados: number; importe_transferencia_nomina: number };
type Kind = 'nominas' | 'anticipos';

export function PayrollList() {
  const [tab,setTab]=useState<Kind|'empleados'>('nominas'),[adding,setAdding]=useState(false),[version,setVersion]=useState(0),[filter,setFilter]=useState('');
  const advances=useResource<Payment[]>('anticipos'), employees=useResource<Employee[]>('empleados');
  const visible=(advances.data||[]).filter(r=>(r.empleado+' '+periodLabel(r.mes,r.anio)).toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
  return <><Header title="Nóminas">{tab!=='empleados'&&<button className="laboral-button" onClick={()=>setAdding(true)}>{tab==='nominas'?'Establecer nómina recurrente':'Agregar anticipo'}</button>}</Header>
    <div className="mb-4 flex gap-2" role="tablist">{(['nominas','anticipos','empleados'] as const).map(k=><button key={k} role="tab" aria-selected={tab===k} className={tab===k?'laboral-button':'laboral-secondary'} onClick={()=>{setAdding(false);setTab(k);}}>{k==='nominas'?'Nóminas':k==='anticipos'?'Anticipos':'Empleados'}</button>)}</div>
    {tab==='empleados'?<EmployeeList/>:tab==='nominas'?<EmployeePayrollList version={version}/>:<section className="laboral-card"><Field label="Buscar empleado o mes"><input value={filter} onChange={e=>setFilter(e.target.value)}/></Field><Notice error={advances.error}/><table><thead><tr><th>Empleado</th><th>Mes</th><th>Importe neto</th><th>Estado</th><th>Comentarios</th></tr></thead><tbody>{visible.map(r=><tr key={r.id}><td><Link className="cursor-pointer hover:underline" href={`${root}/anticipos/${r.id}`}>{r.empleado}</Link></td><td>{periodLabel(r.mes,r.anio)}</td><td>{money(r.importe_neto)}</td><td>{r.estado}</td><td>{r.comentarios}</td></tr>)}</tbody></table>{advances.loading?<p>Cargando...</p>:!visible.length&&!advances.error&&<p>No hay anticipos para mostrar.</p>}</section>}
    {adding&&tab==='nominas'&&<RecurringChargeModal initialKind="nomina" providers={[]} employees={employees.data||[]} close={()=>setAdding(false)} done={()=>{setAdding(false);setVersion(v=>v+1);}}/>}
    {adding&&tab==='anticipos'&&<Modal title="Agregar anticipo" onClose={()=>setAdding(false)}><PaymentForm kind="anticipos" onSaved={()=>{setAdding(false);advances.reload();}}/></Modal>}
  </>;
}

function PaymentForm({ kind, initial, onSaved }: { kind: Kind; initial?: Payment; onSaved: (id: string) => void }) {
  const [form, setForm] = useState({ id_empleado: initial?.id_empleado || '', mes: initial?.mes || new Date().getMonth() + 1, anio: initial?.anio || new Date().getFullYear(), importe_neto: initial?.importe_neto || '', estado: initial?.estado || 'pendiente', comentarios: initial?.comentarios || '', id_transferencia: initial?.id_transferencia || '' });
  const [transferQuery, setTransferQuery] = useState('');
  const employees = useResource<Employee[]>('empleados'), transfers = useResource<Transfer[]>(`transferencias?empleado=${encodeURIComponent(form.id_empleado)}`);
  const update = (key: string, value: string | number) => setForm(current => ({ ...current, [key]: value }));
  return <Form label={initial ? 'Guardar cambios' : kind === 'nominas' ? 'Crear nómina' : 'Agregar anticipo'} onSave={async () => {
    const result = await request<{ id: string }>(`${kind}${initial ? `/${initial.id}` : ''}`, initial ? 'PUT' : 'POST', { ...form, importe_neto: Number(form.importe_neto) });
    onSaved(result.id);
  }}><Notice error={employees.error || transfers.error} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Empleado"><select required disabled={!!initial || employees.loading} value={form.id_empleado} onChange={e => { update('id_empleado',e.target.value); update('id_transferencia',''); }}><option value="">Selecciona un empleado</option>{initial && !employees.data?.some(e => e.id_agente === initial.id_empleado) && <option value={initial.id_empleado}>{initial.empleado}</option>}{employees.data?.map(e => <option key={e.id_agente} value={e.id_agente}>{e.nombre}</option>)}</select></Field><PeriodFields disabled={!!initial} mes={form.mes} anio={form.anio} onChange={(mes,anio) => setForm(current => ({ ...current,mes,anio }))} /><Field label={kind === 'nominas' ? 'Importe neto total (antes de anticipos)' : 'Importe neto'}><input type="number" min={kind === 'nominas' ? '0' : '0.01'} step="0.01" required value={form.importe_neto} onChange={e => update('importe_neto',e.target.value)} /></Field><Field label="Estado"><select value={form.estado} onChange={e => update('estado',e.target.value)}><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option></select></Field></div><Field label="Comentarios"><textarea value={form.comentarios} onChange={e => update('comentarios',e.target.value)} /></Field><details className="rounded border border-slate-200 p-3" open={!!initial}><summary className="cursor-pointer rounded p-1 font-medium text-blue-950 hover:bg-blue-50">{kind === 'nominas' ? 'Transferencia del pago de la nómina' : 'Transferencia del anticipo'}</summary><div className="mt-3 space-y-3"><Field label="Vincular transferencia (opcional)"><SearchableSelect label="Transferencia" value={form.id_transferencia} onChange={value=>update('id_transferencia',value)} options={[{value:'',label:'Sin transferencia vinculada'},...(form.id_transferencia&&!transfers.data?.some(t=>t.id_linea_banco===form.id_transferencia)?[{value:form.id_transferencia,label:form.id_transferencia}]:[]),...(transfers.data||[]).map(t=>({value:t.id_linea_banco,label:[t.banco,t.fecha_valor,money(t.importe),t.concepto].join(' · ')}))]} /></Field></div></details></Form>;
}

export function PayrollDetail({ id, kind }: { id: string; kind: Kind }) {
  const { data, loading, error, reload } = useResource<PaymentDetail>(`${kind}/${id}`);
  if (loading) return <p>Cargando ficha…</p>;
  if (error || !data) return <><Header title="Ficha de pago" back={`${root}/nominas`} /><Notice error={error || 'Registro no encontrado.'} /></>;
  const transfer = (transferId: string | null) => {
    const row = data.transferencias.find(t => t.id_linea_banco === transferId);
    return row ? <Link className="rounded text-blue-900 hover:underline" href={`/dashboard/direccion/bancos/extractos/${row.id_linea_banco}`}>{row.banco} · {row.fecha_valor} · {money(row.importe)} · {row.concepto}</Link> : 'Sin transferencia vinculada';
  };
  return <><Header title={`${kind === 'nominas' ? 'Nómina' : 'Anticipo'} · ${data.empleado} · ${periodLabel(data.mes,data.anio)}`} back={`${root}/nominas`} /><div className="space-y-5"><section className="laboral-card"><PaymentForm kind={kind} initial={data} onSaved={reload} /></section>{kind === 'nominas' && <section className="laboral-card"><h2 className="mb-4 text-lg font-semibold text-blue-950">Desglose del pago</h2><div className="mb-4 grid gap-3 sm:grid-cols-3"><p className="rounded bg-slate-50 p-3">Neto total<br /><strong>{money(data.importe_neto)}</strong></p><p className="rounded bg-slate-50 p-3">Anticipos pagados<br /><strong>{money(data.total_anticipos_pagados)}</strong></p><p className="rounded bg-blue-50 p-3">Transferencia de nómina<br /><strong>{money(data.importe_transferencia_nomina)}</strong></p></div><p className="mb-4">Pago de nómina: {transfer(data.id_transferencia)}</p><div className="overflow-x-auto"><table><thead><tr><th>Anticipo</th><th>Importe</th><th>Estado</th><th>Transferencia del anticipo</th></tr></thead><tbody>{data.detalle_anticipos.map(a => <tr key={a.id}><td><Link className="rounded text-blue-900 hover:underline" href={`${root}/anticipos/${a.id}`}>{periodLabel(a.mes,a.anio)}</Link></td><td>{money(a.importe_neto)}</td><td>{a.estado}</td><td>{transfer(a.id_transferencia)}</td></tr>)}</tbody></table></div>{!data.detalle_anticipos.length && <p className="mt-3 text-slate-500">Esta nómina no tiene anticipos.</p>}<p className="mt-3 text-xs text-slate-500">Los anticipos pendientes aparecen en el desglose y se descuentan del pago de nómina cuando pasan a pagados.</p></section>}{kind === 'anticipos' && <section className="laboral-card"><h2 className="mb-3 text-lg font-semibold">Transferencia del anticipo</h2><p>{transfer(data.id_transferencia)}</p></section>}<Documents kind={kind} id={id} /></div></>;
}
