"use client";

import { useEffect, useMemo, useState } from "react";
import { CuentaService } from "@/app/service/CuentaService";
import { PrevisionIngresosService } from "@/app/service/PrevisionIngresosService";

type FormState = {
  id_cuenta: string; cliente_manual: string; tipo_ingreso: string; asociado_factura: boolean;
  numero_factura: string; day: string; month: string; year: string; forma_cobro: string; banco: string; base_imponible: string;
};

const initialForm: FormState = { id_cuenta: "", cliente_manual: "", tipo_ingreso: "recibo", asociado_factura: false, numero_factura: "", day: "", month: "", year: "", forma_cobro: "recibo", banco: "Sabadell", base_imponible: "" };

export default function AdditionalIncomeWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [withClient, setWithClient] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountFilter, setAccountFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { CuentaService.getCuentas().then((data) => setAccounts(Array.isArray(data) ? data : [])).catch(() => setError("No se han podido cargar las cuentas.")); }, []);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose, saving]);

  const shownAccounts = useMemo(() => {
    const query = accountFilter.trim().toLowerCase();
    return accounts.filter((account) => !query || [account.id_cuenta, account.nombre_empresa, account.nombre_fiscal, account.cif, account.correo_principal].join(" ").toLowerCase().includes(query)).slice(0, 12);
  }, [accountFilter, accounts]);
  const theoreticalDate = `${form.day}/${form.month}/${form.year}`;
  const canContinue = step === 1 ? Boolean((withClient ? form.id_cuenta : form.cliente_manual.trim()) && form.tipo_ingreso)
    : step === 2 ? Boolean(!form.asociado_factura || form.numero_factura.trim())
      : step === 3 ? /^\d{2}\/\d{2}\/\d{4}$/.test(theoreticalDate)
        : step === 4 ? Boolean(form.forma_cobro) : step === 5 ? Boolean(form.banco) : Number(form.base_imponible) > 0;

  const save = async () => {
    try {
      setSaving(true); setError("");
      await PrevisionIngresosService.createIngresoAdicional({
        id_cuenta: withClient ? form.id_cuenta : "", cliente_manual: withClient ? "" : form.cliente_manual.trim(),
        tipo_ingreso: form.tipo_ingreso, asociado_factura: form.asociado_factura, numero_factura: form.numero_factura.trim(),
        fecha_teorica: theoreticalDate, forma_cobro: form.forma_cobro, banco: form.banco, base_imponible: Number(form.base_imponible),
      });
      onCreated();
    } catch (requestError: any) { setError(requestError?.response?.data?.message || "No se ha podido crear el ingreso."); setSaving(false); }
  };

  const titles = ["", "Cliente y tipo de ingreso", "Asociación con factura", "Fecha teórica", "Forma de cobro", "Banco de cobro", "Base imponible"];
  return <div role="dialog" aria-modal="true" aria-labelledby="income-wizard-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b px-6 py-4"><div><h2 id="income-wizard-title" className="text-xl font-semibold text-blue-950">Agregar ingreso adicional sin contrato</h2><p className="mt-1 text-sm text-gray-500">{titles[step]}</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border text-2xl transition hover:bg-gray-100 disabled:cursor-not-allowed">×</button></header>
      <div className="space-y-5 p-6">
        {step === 1 && <>
          <div className="flex items-center justify-between rounded border bg-gray-50 p-4"><div><p className="font-semibold text-gray-800">{withClient ? "Cobro asociado a cliente" : "Sin cliente asociado"}</p><p className="text-sm text-gray-500">Elige si el ingreso pertenece a una cuenta registrada.</p></div><button type="button" role="switch" aria-checked={withClient} onClick={() => { setWithClient((current) => !current); setForm((current) => ({ ...current, id_cuenta: "", cliente_manual: "" })); }} className={`relative h-7 w-14 cursor-pointer rounded-full transition ${withClient ? "bg-blue-950" : "bg-gray-400"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${withClient ? "left-8" : "left-1"}`} /></button></div>
          {withClient ? <div><input type="search" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} placeholder="Filtrar por código, empresa, CIF o email..." className="mb-3 w-full rounded border px-3 py-2"/><div className="max-h-64 overflow-y-auto border"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-blue-950 text-white"><tr><th className="p-2 text-left">Seleccionar</th><th className="p-2 text-left">Código</th><th className="p-2 text-left">Cliente</th><th className="p-2 text-left">CIF</th></tr></thead><tbody>{shownAccounts.map((account) => <tr key={account.id_cuenta} onClick={() => setForm((current) => ({ ...current, id_cuenta: account.id_cuenta }))} className={`cursor-pointer border-b transition hover:bg-blue-50 ${form.id_cuenta === account.id_cuenta ? "bg-blue-100" : ""}`}><td className="p-2"><input type="radio" readOnly checked={form.id_cuenta === account.id_cuenta}/></td><td className="p-2">{account.id_cuenta}</td><td className="p-2">{account.nombre_empresa || account.nombre_fiscal}</td><td className="p-2">{account.cif || "-"}</td></tr>)}</tbody></table></div></div> : <label className="block text-sm font-medium">Cliente o concepto manual<input autoFocus value={form.cliente_manual} onChange={(event) => setForm({ ...form, cliente_manual: event.target.value })} className="mt-1 w-full rounded border px-3 py-2"/></label>}
          <label className="block text-sm font-medium">Tipo de ingreso<select value={form.tipo_ingreso} onChange={(event) => setForm({ ...form, tipo_ingreso: event.target.value })} className="mt-1 w-full cursor-pointer rounded border bg-white px-3 py-2"><option value="recibo">Recibo</option><option value="transferencia">Transferencia</option></select></label>
        </>}
        {step === 2 && <div className="flex items-center justify-between rounded border bg-gray-50 p-4"><div><p className="font-semibold">¿Asociado a una factura?</p><p className="text-sm text-gray-500">{form.asociado_factura ? "Sí" : "No"}</p></div><button type="button" role="switch" aria-checked={form.asociado_factura} onClick={() => setForm({ ...form, asociado_factura: !form.asociado_factura, numero_factura: "" })} className={`relative h-7 w-14 cursor-pointer rounded-full transition ${form.asociado_factura ? "bg-blue-950" : "bg-gray-400"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${form.asociado_factura ? "left-8" : "left-1"}`}/></button>{form.asociado_factura && <input autoFocus value={form.numero_factura} onChange={(event) => setForm({ ...form, numero_factura: event.target.value })} placeholder="Nº de factura" className="ml-4 flex-1 rounded border px-3 py-2"/>}</div>}
        {step === 3 && <fieldset><legend className="mb-2 text-sm font-medium">Fecha teórica</legend><div className="flex gap-2"><input aria-label="Día" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="dd" className="w-20 rounded border px-3 py-2"/><input aria-label="Mes" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="mm" className="w-20 rounded border px-3 py-2"/><input aria-label="Año" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="yyyy" className="w-28 rounded border px-3 py-2"/></div></fieldset>}
        {step === 4 && <label className="block text-sm font-medium">Forma de cobro<select value={form.forma_cobro} onChange={(e) => setForm({ ...form, forma_cobro: e.target.value })} className="mt-1 w-full cursor-pointer rounded border bg-white px-3 py-2"><option value="recibo">Recibo</option><option value="transferencia">Transferencia</option><option value="pagaré">Pagaré</option><option value="tarjeta">Tarjeta</option><option value="efectivo">Efectivo</option></select></label>}
        {step === 5 && <label className="block text-sm font-medium">Banco<select value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} className="mt-1 w-full cursor-pointer rounded border bg-white px-3 py-2"><option>Sabadell</option><option>Santander</option></select></label>}
        {step === 6 && <label className="block text-sm font-medium">Base imponible (€)<input type="number" min="0.01" step="0.01" value={form.base_imponible} onChange={(e) => setForm({ ...form, base_imponible: e.target.value })} className="mt-1 w-full rounded border px-3 py-2"/></label>}
        {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <footer className="flex justify-between border-t pt-5"><button type="button" disabled={step === 1 || saving} onClick={() => setStep((current) => current - 1)} className="cursor-pointer rounded border px-4 py-2 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Volver</button><button type="button" disabled={!canContinue || saving} onClick={() => step === 6 ? void save() : setStep((current) => current + 1)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-300">{saving ? "Guardando…" : step === 6 ? "Confirmar ingreso" : "Continuar"}</button></footer>
      </div>
    </section>
  </div>;
}
