"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { CuentaService } from "@/app/service/CuentaService";
import { SuscripcionService } from "@/app/service/SuscripcionService";

const tabs = [
  { key: "pendiente_renovar", label: "Pendiente renovar" },
  { key: "en_curso", label: "En curso" },
  { key: "anteriores", label: "Anteriores" },
];

function SuscripcionCard({ suscripcion }: { suscripcion: any }) {
  const [open, setOpen] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);

  useEffect(() => {
    if (!renewalModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRenewalModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [renewalModalOpen]);

  return (
    <div className="border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
      >
        <div>
          <p className="font-semibold text-blue-950">{suscripcion.nombre_empresa || suscripcion.id_cuenta || "Cuenta sin nombre"}</p>
          <p className="text-xs text-gray-500">
            {suscripcion.id_suscripcion} · números {suscripcion.num_inicial || "-"} a {suscripcion.num_final || "-"}
          </p>
        </div>
        <span className="text-sm text-gray-500">{open ? "Cerrar" : "Abrir"}</span>
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 p-5 lg:grid-cols-2">
          <section className="rounded border border-gray-200 p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">Carta</h3>
            <p className="whitespace-pre-line text-sm text-gray-700">{suscripcion.carta}</p>
          </section>

          <section className="rounded border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Factura y contrato o propuesta</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Último número publicado:</span> {suscripcion.ultimo_numero_publicado || "-"}
              </p>
              <p>
                <span className="font-medium">Cuenta:</span>{" "}
                {suscripcion.id_cuenta ? (
                  <Link className="text-blue-950 underline" href={`/dashboard/comercial/cuentas/${suscripcion.id_cuenta}`}>
                    {suscripcion.nombre_empresa || suscripcion.id_cuenta}
                  </Link>
                ) : "-"}
              </p>
              <p>
                <span className="font-medium">Propuesta:</span>{" "}
                {suscripcion.id_propuesta ? (
                  <Link className="text-blue-950 underline" href={`/dashboard/comercial/propuestas/${suscripcion.id_propuesta}`}>
                    {suscripcion.nombre_propuesta || suscripcion.id_propuesta}
                  </Link>
                ) : "Pendiente de crear"}
              </p>
              <p>
                <span className="font-medium">Contrato:</span>{" "}
                {suscripcion.id_contrato ? (
                  <Link className="text-blue-950 underline" href={`/dashboard/comercial/contratos/${suscripcion.id_contrato}`}>
                    {suscripcion.id_contrato}
                  </Link>
                ) : "Sin contrato renovado"}
              </p>
              <p>
                <span className="font-medium">Factura:</span> {suscripcion.id_factura || "Pendiente"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRenewalModalOpen(true)}
              className="mt-4 cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900"
            >
              Generar renovación automática
            </button>
          </section>
        </div>
      )}

      {renewalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Generar renovación automática">
          <div className="min-h-64 w-full max-w-2xl rounded bg-white p-6 shadow-xl">
            <div className="flex justify-end">
              <button
                type="button"
                aria-label="Cerrar modal"
                onClick={() => setRenewalModalOpen(false)}
                className="cursor-pointer rounded px-2 py-1 text-2xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuscripcionesAdministracionPage() {
  const [activeTab, setActiveTab] = useState("pendiente_renovar");
  const [suscripciones, setSuscripciones] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cuentaQuery, setCuentaQuery] = useState("");
  const [selectedCuenta, setSelectedCuenta] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!showCreateModal) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCreateModal(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showCreateModal]);

  useEffect(() => {
    setLoading(true);
    setError("");
    SuscripcionService.getSuscripciones({ estado: activeTab })
      .then((data) => setSuscripciones(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("Error fetching suscripciones:", error);
        setError(error?.message || "No se han podido cargar las suscripciones.");
        setSuscripciones([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (!showCreateModal) return;
    CuentaService.getCuentas({ clienteFiltro: cuentaQuery })
      .then((data) => setCuentas(Array.isArray(data) ? data : []))
      .catch(() => setCuentas([]));
  }, [cuentaQuery, showCreateModal]);

  const createSuscripcion = async () => {
    if (!selectedCuenta?.id_cuenta) return;
    const created = await SuscripcionService.createSuscripcion({ id_cuenta: selectedCuenta.id_cuenta });
    setSuscripciones((current) => [created, ...current]);
    setShowCreateModal(false);
    setSelectedCuenta(null);
    setCuentaQuery("");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Suscripciones" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-8 text-gray-600">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-row">
            {tabs.map((tab, index) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-52 cursor-pointer rounded-tr-lg p-3 text-center text-sm transition-all duration-300 ${
                  activeTab === tab.key ? "z-30 rounded-tl-lg bg-blue-950 text-white" : "z-10 bg-white text-gray-700 hover:bg-gray-200"
                }`}
                style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowCreateModal(true)} className="w-fit cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900">
            Agregar suscriptor
          </button>
        </div>

        <div className="space-y-3">
          {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {loading && <div className="bg-white p-6 text-sm text-gray-500">Cargando suscripciones...</div>}
          {!loading && suscripciones.length === 0 && (
            <div className="bg-white p-6 text-sm text-gray-500">No hay suscripciones en esta pestaña.</div>
          )}
          {!loading && suscripciones.map((suscripcion) => (
            <SuscripcionCard key={suscripcion.id_suscripcion} suscripcion={suscripcion} />
          ))}
        </div>
      </div>
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-3xl rounded bg-white p-6 text-gray-700 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-blue-950">Agregar suscriptor</p>
              <button type="button" aria-label="Cerrar modal" onClick={() => setShowCreateModal(false)} className="cursor-pointer rounded px-2 py-1 text-2xl leading-none transition hover:bg-gray-100">×</button>
            </div>
            <input value={cuentaQuery} onChange={(event) => setCuentaQuery(event.target.value)} placeholder="Buscar cuenta..." className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-sm">
                <tbody>
                  {cuentas.map((cuenta) => (
                    <tr key={cuenta.id_cuenta} onClick={() => setSelectedCuenta(cuenta)} className={`cursor-pointer border-b hover:bg-gray-50 ${selectedCuenta?.id_cuenta === cuenta.id_cuenta ? "bg-blue-50" : ""}`}>
                      <td className="p-2 font-medium text-blue-950">{cuenta.nombre_empresa || cuenta.id_cuenta}</td>
                      <td className="p-2">{cuenta.pais_cuenta || "-"}</td>
                      <td className="p-2">{cuenta.id_cuenta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button type="button" onClick={createSuscripcion} disabled={!selectedCuenta} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:bg-gray-400">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
