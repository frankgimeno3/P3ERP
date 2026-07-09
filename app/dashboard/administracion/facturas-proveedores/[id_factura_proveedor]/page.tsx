"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { FacturaService } from "@/app/service/FacturaService";
import { ProveedorService } from "@/app/service/ProveedorService";

const formasPago = ["Transferencia", "Recibo", "Tarjeta", "Efectivo", "Confirming"];
const estados = ["Pendiente", "Pagada", "Revisada", "Contabilizada", "Cancelada"];

function splitDate(value = "") {
  const [dd = "", mm = "", yyyy = ""] = String(value).split(/[/-]/);
  return { dd, mm, yyyy };
}

function joinDate(parts: any) {
  return [parts.dd, parts.mm, parts.yyyy].join("/");
}

export default function FacturaProveedorDetallePage() {
  const router = useRouter();
  const params = useParams<{ id_factura_proveedor: string }>();
  const [factura, setFactura] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [dateParts, setDateParts] = useState<any>({});
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [providerQuery, setProviderQuery] = useState("");
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [pendingProveedor, setPendingProveedor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id_factura_proveedor) return;
    Promise.all([
      FacturaService.getFacturaProveedorById(params.id_factura_proveedor),
      ProveedorService.getProveedores(),
    ])
      .then(([facturaData, proveedoresData]) => {
        setFactura(facturaData);
        setForm(facturaData);
        setDateParts(splitDate(facturaData.fecha_factura));
        setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);
      })
      .catch((error) => setError(error?.message || "No se ha podido cargar la factura."))
      .finally(() => setLoading(false));
  }, [params.id_factura_proveedor]);

  const filteredProviders = useMemo(() => {
    const query = providerQuery.trim().toLowerCase();
    return proveedores.filter((proveedor) => !query || Object.values(proveedor).join(" ").toLowerCase().includes(query));
  }, [providerQuery, proveedores]);

  const updateField = (field: string, value: any) => {
    setForm((current: any) => ({ ...current, [field]: value }));
  };

  const updateDate = (field: string, value: string) => {
    const next = { ...dateParts, [field]: value.replace(/\D/g, "") };
    setDateParts(next);
    updateField("fecha_factura", joinDate(next));
  };

  const save = async () => {
    if (Number(form.base_imponible || 0) > Number(form.importe_total || 0)) {
      setError("Base imponible no puede ser mayor al total.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await FacturaService.updateFacturaProveedor(factura.id_factura_proveedor, form);
      setFactura(updated);
      setForm(updated);
      setDateParts(splitDate(updated.fecha_factura));
    } catch (error: any) {
      setError(error?.message || "No se ha podido guardar la factura.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Borrar factura ${factura.id_factura_proveedor}?`)) return;
    await FacturaService.deleteFacturaProveedor(factura.id_factura_proveedor);
    router.push("/dashboard/administracion/facturas-proveedores");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-700">
      <MiddleNav tituloprincipal="Factura proveedor" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10">
        <button type="button" onClick={() => router.push("/dashboard/administracion/facturas-proveedores")} className="mb-5 rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm hover:bg-gray-50">
          Volver
        </button>
        {loading && <div className="bg-white p-6 text-sm text-gray-500">Cargando factura...</div>}
        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {!loading && factura && (
          <section className="bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">ID factura</p>
                <h1 className="text-xl font-semibold text-blue-950">{factura.id_factura_proveedor}</h1>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={remove} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Borrar</button>
                <button type="button" onClick={save} disabled={saving} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:bg-gray-400">Guardar</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {["orden_compra_p3", "numero_contabilidad", "codigo_factura", "base_imponible", "importe_total", "comentarios"].map((field) => (
                <label key={field} className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{field}</span>
                  <input value={form[field] || ""} onChange={(event) => updateField(field, event.target.value)} className="w-full rounded border px-3 py-2" />
                </label>
              ))}
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Forma de pago</span>
                <select value={form.forma_pago || ""} onChange={(event) => updateField("forma_pago", event.target.value)} className="w-full rounded border px-3 py-2">
                  <option value="">Seleccionar</option>
                  {formasPago.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Estado</span>
                <select value={form.estado || ""} onChange={(event) => updateField("estado", event.target.value)} className="w-full rounded border px-3 py-2">
                  <option value="">Seleccionar</option>
                  {estados.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Fecha factura</p>
                <div className="flex gap-2">
                  <input value={dateParts.dd || ""} onChange={(event) => updateDate("dd", event.target.value.slice(0, 2))} placeholder="dd" className="w-16 rounded border px-2 py-2" />
                  <input value={dateParts.mm || ""} onChange={(event) => updateDate("mm", event.target.value.slice(0, 2))} placeholder="mm" className="w-16 rounded border px-2 py-2" />
                  <input value={dateParts.yyyy || ""} onChange={(event) => updateDate("yyyy", event.target.value.slice(0, 4))} placeholder="yyyy" className="w-24 rounded border px-2 py-2" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Proveedor</p>
                <button type="button" onClick={() => setShowProviderModal(true)} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
                  {form.id_proveedor ? `Editar proveedor: ${form.proveedor || form.id_proveedor}` : "Seleccionar proveedor"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-3xl rounded bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-blue-950">Seleccionar proveedor</p>
              <button type="button" onClick={() => setShowProviderModal(false)} className="text-xl">x</button>
            </div>
            <input value={providerQuery} onChange={(event) => setProviderQuery(event.target.value)} placeholder="Filtrar proveedores..." className="mb-3 w-full rounded border px-3 py-2 text-sm" />
            <div className="max-h-80 overflow-auto">
              <table className="min-w-full text-sm">
                <tbody>
                  {filteredProviders.map((proveedor) => (
                    <tr key={proveedor.id_proveedor} onClick={() => setPendingProveedor(proveedor)} className={`cursor-pointer border-b hover:bg-gray-50 ${pendingProveedor?.id_proveedor === proveedor.id_proveedor ? "bg-blue-50" : ""}`}>
                      <td className="p-2 font-medium text-blue-950">{proveedor.nombre_proveedor || proveedor.id_proveedor}</td>
                      <td className="p-2">{proveedor.pais_proveedor || "-"}</td>
                      <td className="p-2">{proveedor.vat_code || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowProviderModal(false)} className="rounded border px-4 py-2 text-sm">Cancelar</button>
              <button
                type="button"
                disabled={!pendingProveedor}
                onClick={() => {
                  setForm({ ...form, id_proveedor: pendingProveedor.id_proveedor, proveedor: pendingProveedor.nombre_proveedor });
                  setShowProviderModal(false);
                  setPendingProveedor(null);
                }}
                className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-400"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
