"use client";
import { useEffect, useState } from "react";
import Link from 'next/link';
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import PrevisionIngresosPage from "../prevision-ingresos/page";
import PrevisionCargosPage from "../../tesoreria/prevision-cargos/page";

export default function PrevisionLiquidezPage() {
  const now = new Date();
  const [view, setView] = useState<"ingresos" | "cargos">("ingresos");
  const [date, setDate] = useState({ d: String(now.getDate()), m: String(now.getMonth() + 1), y: String(now.getFullYear()) });
  const [values, setValues] = useState({ Sabadell: 0, Santander: 0, 'Sin asignar':0, total:0, avisos:[] as string[] });
  const [revision,setRevision]=useState(0);
  useEffect(()=>{const refresh=()=>setRevision(n=>n+1);window.addEventListener('p3:forecast-changed',refresh);return()=>window.removeEventListener('p3:forecast-changed',refresh);},[]);
  const [error, setError] = useState("");
  const fecha = `${date.d.padStart(2, "0")}/${date.m.padStart(2, "0")}/${date.y}`;
  useEffect(() => { if (new URLSearchParams(window.location.search).get("vista") === "cargos") setView("cargos"); }, []);
  useEffect(() => {
    if (!date.d || !date.m || date.y.length !== 4) return;
    const controller=new AbortController();
    setError('');
    fetch(`/api/v1/direccion/prevision-liquidez?fecha=${encodeURIComponent(fecha)}`,{signal:controller.signal,cache:'no-store'})
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setValues)
      .catch(e => {if(e.name!=='AbortError')setError("No se pudo calcular la previsión.");});
    return()=>controller.abort();
  }, [date.d, date.m, date.y, fecha,revision]);
  const money = (value: number) => Number(value || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  return <div className="min-h-screen bg-gray-100 text-slate-900">
    <MiddleNav tituloprincipal="Previsión liquidez" />
    <main className="p-6 lg:p-12">
      <section className="rounded-xl bg-white p-6 text-slate-900 shadow">
        <h1 className="text-xl font-semibold text-blue-950">Previsión liquidez en fecha</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div><p className="mb-2 text-sm font-medium">Fecha</p><div className="flex gap-1">{[["d", "dd", 2], ["m", "mm", 2], ["y", "yyyy", 4]].map(([key, placeholder, length]) => <input key={key} aria-label={String(placeholder)} maxLength={Number(length)} value={(date as any)[key]} onChange={(event) => setDate({ ...date, [key]: event.target.value.replace(/\D/g, "") })} className="min-w-0 flex-1 rounded border border-slate-300 bg-white p-2 text-slate-900" placeholder={String(placeholder)} />)}</div></div>
          {[["Banco Sabadell", values.Sabadell], ["Banco Santander", values.Santander], ["Total", values.total]].map(([label, value]) => <div key={String(label)} className="rounded border border-blue-100 bg-blue-50 p-4 text-slate-900"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-xl font-semibold text-blue-950">{money(Number(value))}</p></div>)}
        </div>
        {error && <p className="mt-4 text-red-700">{error}</p>}
        {values.avisos?.map(message=><p key={message} className="mt-3 rounded bg-amber-50 p-3">{message}</p>)}
        <p className="mt-4 text-sm">Importe neto previsto sin banco asignado: {money(values['Sin asignar'])}. Está incluido en el total. Puedes asignar el banco al editar el cargo previsto.</p>
        <p className="mt-2 text-sm">Se descuentan los vencimientos planificados pendientes y las nóminas, restando sus anticipos pagados. Las nóminas sin fecha de pago se estiman al final de mes. Los cargos recurrentes se incluyen hasta su horizonte planificado; usa «Generar» para ampliarlo.</p>
        <p className="mt-2 text-sm">Los tickets y suscripciones de tarjetas se descuentan en su fecha de liquidación bancaria, sin duplicar los cargos directos. Consulta sus ciclos en <Link href="/dashboard/administracion/tarjetas" className="cursor-pointer text-blue-900 underline hover:text-blue-600">Administración · Tarjetas</Link>.</p>
        <button type="button" className="mt-3 cursor-pointer rounded border px-4 py-2 hover:bg-blue-50" onClick={()=>setRevision(n=>n+1)}>Actualizar previsión</button>
      </section>
      <div className="mt-6 flex border-b border-slate-300 bg-white px-4 pt-2 text-slate-900 shadow-sm">
        <button type="button" onClick={() => setView("ingresos")} className={`cursor-pointer border-b-2 px-6 py-3 font-semibold transition hover:bg-blue-50 ${view === "ingresos" ? "border-blue-950 text-blue-950" : "border-transparent text-slate-600"}`}>Previsión de ingresos</button>
        <button type="button" onClick={() => setView("cargos")} className={`cursor-pointer border-b-2 px-6 py-3 font-semibold transition hover:bg-blue-50 ${view === "cargos" ? "border-blue-950 text-blue-950" : "border-transparent text-slate-600"}`}>Previsión de cargos</button>
      </div>
      <div className="embedded-forecast text-slate-900">{view === "ingresos" ? <PrevisionIngresosPage /> : <PrevisionCargosPage />}</div>
    </main>
  </div>;
}
