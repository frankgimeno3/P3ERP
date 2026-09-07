"use client";
import { useEffect, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import PrevisionIngresosPage from "../prevision-ingresos/page";
import PrevisionCargosPage from "../../bancos/prevision-cargos/page";

export default function PrevisionLiquidezPage() {
  const now = new Date();
  const [view, setView] = useState<"ingresos" | "cargos">("ingresos");
  const [date, setDate] = useState({ d: String(now.getDate()), m: String(now.getMonth() + 1), y: String(now.getFullYear()) });
  const [values, setValues] = useState({ Sabadell: 0, Santander: 0 });
  const [error, setError] = useState("");
  const fecha = `${date.d.padStart(2, "0")}/${date.m.padStart(2, "0")}/${date.y}`;
  useEffect(() => { if (new URLSearchParams(window.location.search).get("vista") === "cargos") setView("cargos"); }, []);
  useEffect(() => {
    if (!date.d || !date.m || date.y.length !== 4) return;
    fetch(`/api/v1/direccion/prevision-liquidez?fecha=${encodeURIComponent(fecha)}`)
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setValues)
      .catch(() => setError("No se pudo calcular la previsión."));
  }, [date.d, date.m, date.y, fecha]);
  const money = (value: number) => Number(value || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  return <div className="min-h-screen bg-gray-100 text-slate-900">
    <MiddleNav tituloprincipal="Previsión liquidez" />
    <main className="p-6 lg:p-12">
      <section className="rounded-xl bg-white p-6 text-slate-900 shadow">
        <h1 className="text-xl font-semibold text-blue-950">Previsión liquidez en fecha</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div><p className="mb-2 text-sm font-medium">Fecha</p><div className="flex gap-1">{[["d", "dd", 2], ["m", "mm", 2], ["y", "yyyy", 4]].map(([key, placeholder, length]) => <input key={key} aria-label={String(placeholder)} maxLength={Number(length)} value={(date as any)[key]} onChange={(event) => setDate({ ...date, [key]: event.target.value.replace(/\D/g, "") })} className="min-w-0 flex-1 rounded border border-slate-300 bg-white p-2 text-slate-900" placeholder={String(placeholder)} />)}</div></div>
          {[["Banco Sabadell", values.Sabadell], ["Banco Santander", values.Santander], ["Total", values.Sabadell + values.Santander]].map(([label, value]) => <div key={String(label)} className="rounded border border-blue-100 bg-blue-50 p-4 text-slate-900"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-xl font-semibold text-blue-950">{money(Number(value))}</p></div>)}
        </div>
        {error && <p className="mt-4 text-red-700">{error}</p>}
      </section>
      <div className="mt-6 flex border-b border-slate-300 bg-white px-4 pt-2 text-slate-900 shadow-sm">
        <button type="button" onClick={() => setView("ingresos")} className={`cursor-pointer border-b-2 px-6 py-3 font-semibold transition hover:bg-blue-50 ${view === "ingresos" ? "border-blue-950 text-blue-950" : "border-transparent text-slate-600"}`}>Previsión de ingresos</button>
        <button type="button" onClick={() => setView("cargos")} className={`cursor-pointer border-b-2 px-6 py-3 font-semibold transition hover:bg-blue-50 ${view === "cargos" ? "border-blue-950 text-blue-950" : "border-transparent text-slate-600"}`}>Previsión de cargos</button>
      </div>
      <div className="embedded-forecast text-slate-900">{view === "ingresos" ? <PrevisionIngresosPage /> : <PrevisionCargosPage />}</div>
    </main>
  </div>;
}
