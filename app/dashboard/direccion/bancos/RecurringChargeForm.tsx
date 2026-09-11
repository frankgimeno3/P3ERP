'use client';
export const reviewButton = 'rounded border px-4 py-2 enabled:cursor-pointer enabled:hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50';
export const newCharge = () => ({ tipo_programacion: 'periodicidad', programacion: [{ cada: 1, unidad: 'meses', dia: '', mes: '', anio: String(new Date().getFullYear()), total_iva: '', descripcion: '' }] });
export function VatToggle({ value, onChange }: {value:boolean;onChange:(v:boolean)=>void}) {
  return <button type="button" role="switch" aria-checked={value} aria-label="Con IVA" onClick={()=>onChange(!value)} className="inline-flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-blue-50"><span aria-hidden="true" className={`relative h-6 w-11 rounded-full ${value?'bg-blue-950':'bg-slate-400'}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${value?'translate-x-5':''}`} /></span><span>{value?'Con IVA':'Sin IVA'}</span></button>;
}
export default function RecurringChargeForm({ value, onChange, payroll = false, vat = true, onVatChange }: { value: any; onChange: (v: any) => void; payroll?: boolean; vat?: boolean; onVatChange: (v: boolean) => void }) {
  const change = (i: number, field: string, v: any) => onChange({ ...value, programacion: value.programacion.map((r: any, j: number) => i === j ? { ...r, [field]: v } : r) });
  return <div className="space-y-3">
    {!payroll && <VatToggle value={vat} onChange={onVatChange} />}
    <label className="block">Programación<select className="ml-3 cursor-pointer rounded border p-2 hover:bg-blue-50" value={value.tipo_programacion} onChange={e => onChange({ ...value, tipo_programacion: e.target.value })}><option value="fechas">Fechas</option><option value="periodicidad">Periodicidad</option></select></label>
    {value.programacion.map((r: any, i: number) => <div key={i} className="grid gap-3 rounded border p-3 sm:grid-cols-3">
      {value.tipo_programacion === 'fechas' ? <fieldset><legend>Fecha</legend><div className="flex gap-1">{[['dia','dd',2],['mes','mm',2],['anio','yyyy',4]].map(([key, label, max]) => <input key={key} aria-label={String(label)} placeholder={String(label)} maxLength={Number(max)} className="w-1/3 rounded border p-2" value={r[key] ?? ''} onChange={e => change(i, String(key), e.target.value.replace(/\D/g, ''))} />)}</div></fieldset> : <><label>Cada<input aria-label="Cada" type="number" min="1" className="w-full rounded border p-2" value={r.cada} onChange={e => change(i, 'cada', e.target.value)} /></label><label>Unidad<select className="w-full cursor-pointer rounded border p-2 hover:bg-blue-50" value={r.unidad} onChange={e => change(i, 'unidad', e.target.value)}>{['días','semanas','meses'].map(v => <option key={v}>{v}</option>)}</select></label></>}
      <label>{payroll ? 'Neto previsto' : 'Total IVA'}<input type="number" min="0.01" step="0.01" className="w-full rounded border p-2" value={r.total_iva} onChange={e => change(i, 'total_iva', e.target.value)} /></label>
      {!payroll && <label>Base imponible<input readOnly className="w-full rounded border bg-gray-50 p-2" value={(Number(r.total_iva || 0) / (vat ? 1.21 : 1)).toFixed(2)} /></label>}
      <label>Descripción<input className="w-full rounded border p-2" value={r.descripcion} onChange={e => change(i, 'descripcion', e.target.value)} /></label>
      <button type="button" disabled={value.programacion.length === 1} className={reviewButton} onClick={() => onChange({ ...value, programacion: value.programacion.filter((_: any, j: number) => j !== i) })}>Eliminar fila</button>
    </div>)}
    <button type="button" className={reviewButton} onClick={() => onChange({ ...value, programacion: [...value.programacion, newCharge().programacion[0]] })}>Añadir fila</button>
  </div>;
}
