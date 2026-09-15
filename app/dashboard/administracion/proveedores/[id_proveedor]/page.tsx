"use client";
import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import SupplierBankCharges from '../SupplierBankCharges';
import SupplierActions from "../SupplierActions";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

type TabType = "movimientos" | "cargos-pendientes" | "tickets" | "facturas" | "precios" | "datos";

interface Proveedor {
  id_proveedor: string;
  nombre_proveedor: string;
  nombre_fiscal_proveedor: string;
  vat_code: string;
  pais_proveedor: string;
  moneda_proveedor: string;
  Comentarios_proveedor?: string;
}

interface CargoPendiente {
  id_cargo_pendiente: string;
  concepto: string;
  importe_cargo: number;
  estado: string;
  fecha_cargo: string;
}

export default function ProveedorPage({
  params,
}: {
  params: Promise<{ id_proveedor: string }>;
}) {
  const { id_proveedor } = use(params);
  const router = useRouter();
  
  const [showDelete,setShowDelete]=useState(false),[deleting,setDeleting]=useState(false);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setShowDelete(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
  const [tab, setTab] = useState<TabType>("datos");
  const [filter, setFilter] = useState("");
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [bankCharges,setBankCharges]=useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [cargos, setCargos] = useState<CargoPendiente[]>([]);
  const [precios, setPrecios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingProveedor,setSavingProveedor]=useState(false);
  const [saveMessage,setSaveMessage]=useState('');
  const [editingProveedor, setEditingProveedor] = useState(false);
  const [formData, setFormData] = useState<Proveedor | null>(null);

  // Load data
  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/admin/proveedores/${encodeURIComponent(id_proveedor)}`)
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Error al cargar el proveedor'); return data; })
      .then(({ proveedor, tickets, facturas, cargos, precios, cargosBancarios }) => {
        setProveedor(proveedor);setBankCharges(cargosBancarios||[]);
        setFormData(proveedor);
        setTickets(tickets || []);
        setInvoices(facturas || []);
        setCargos((cargos || []).map((row: any) => ({ ...row, id_cargo_pendiente: row.id_pago, concepto: row.nombre_planificacion || row.factura || row.id_pago, importe_cargo: row.pendiente, estado: 'pendiente', fecha_cargo: row.fecha_pago })));
        setPrecios(precios || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Error al cargar datos");
        setLoading(false);
      });
  }, [id_proveedor]);

  // Filter data based on current tab and filter input
  const filteredData = useMemo(() => {
    let data: any[] = [];
    
    if (tab === "tickets") data = tickets;
    else if (tab === "facturas") data = invoices;
    else if (tab === "cargos-pendientes") data = cargos;
    else if (tab === "precios") data = precios;

    if (!filter.trim()) return data;
    
    return data.filter((row) =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(filter.toLowerCase())
    );
  }, [tab, filter, tickets, invoices, cargos, precios]);

  // Save proveedor changes
  const handleSaveProveedor = async () => {
    if (!formData || savingProveedor) return;
    setSavingProveedor(true);setSaveMessage('');
    
    try {
      const res = await fetch(
        `/api/v1/admin/proveedores/${encodeURIComponent(id_proveedor)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre_proveedor: formData.nombre_proveedor, nombre_fiscal_proveedor: formData.nombre_fiscal_proveedor || '', vat_code: formData.vat_code || '', pais_proveedor: formData.pais_proveedor || '', moneda_proveedor: formData.moneda_proveedor || '', Comentarios_proveedor: formData.Comentarios_proveedor || '' }),
        }
      );
      
      const saved=await res.json();
      if (!res.ok) throw new Error(saved.message || "Error al actualizar el proveedor");
      setProveedor(saved);setFormData(saved);setSaveMessage('Cambios guardados.');
      setEditingProveedor(false);
      setError("");
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {setSavingProveedor(false);}
  };

  // Delete proveedor
  const handleDeleteProveedor = async () => {
    if(deleting)return;setDeleting(true);
    
    try {
      const res = await fetch(
        `/api/v1/admin/proveedores/${encodeURIComponent(id_proveedor)}`,
        { method: "DELETE" }
      );
      
      if (!res.ok) {const data=await res.json();throw new Error(data.message || "Error al eliminar el proveedor");}
      router.push("/dashboard/administracion/proveedores");
    } catch (err: any) {
      setError(err.message || "Error al eliminar");
    } finally {setDeleting(false);}
  };

  if (loading) return <div className="min-h-screen bg-gray-100"><MiddleNav tituloprincipal="Cargando..." /></div>;

  const tabs = [
    { id: "datos", label: "Datos" },
    {id:"movimientos",label:"Cargos bancarios"},
    { id: "cargos-pendientes", label: "Cargos Pendientes" },
    { id: "tickets", label: "Tickets" },
    { id: "facturas", label: "Facturas" },
    { id: "precios", label: "Precios" },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-700">
      <MiddleNav tituloprincipal={`Proveedor ${id_proveedor}`} />
      <main className="px-6 py-10 lg:px-12">
        {error && (
          <div className="mb-6 rounded bg-red-50 p-4 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id as TabType);
                setFilter("");
              }}
              className={`cursor-pointer rounded-t px-4 py-2 transition ${
                tab === t.id
                  ? "bg-blue-950 text-white hover:bg-blue-900"
                  : "bg-white text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {saveMessage&&<p role="status" className="mb-4 rounded bg-green-50 p-3 text-green-800">{saveMessage}</p>}
        <SupplierActions supplier={proveedor} tab={tab} />
        {/* Content */}
        {tab === 'datos' && <label className="mb-4 block rounded bg-white p-4 font-medium">Comentarios del proveedor<textarea rows={5} readOnly={!editingProveedor} value={formData?.Comentarios_proveedor || ''} onChange={e=>setFormData({...formData!,Comentarios_proveedor:e.target.value})} className="mt-2 block w-full rounded border p-3 font-normal read-only:bg-gray-50"/></label>}
        {tab === "movimientos" ? <SupplierBankCharges rows={bankCharges}/> : tab !== "datos" ? (
          <>
            {/* Filter input */}
            <div className="mb-4">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filtrar por campo...`}
                className="w-full rounded border px-3 py-2 sm:w-96 text-gray-700"
              />
            </div>

            {/* Data table */}
            <div className="overflow-x-auto bg-white rounded shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-950 text-white">
                  <tr>
                    {tab === "tickets" && (
                      <>
                        <th className="p-3 text-left">ID</th>
                        <th className="p-3 text-left">Fecha</th>
                        <th className="p-3 text-left">Total</th>
                        <th className="p-3 text-left">Forma de pago</th>
                      </>
                    )}
                    {tab === "facturas" && (
                      <>
                        <th className="p-3 text-left">Factura</th>
                        <th className="p-3 text-left">Fecha</th>
                        <th className="p-3 text-left">Total</th>
                        <th className="p-3 text-left">Estado</th>
                      </>
                    )}
                    {tab === "cargos-pendientes" && (
                      <>
                        <th className="p-3 text-left">Concepto</th>
                        <th className="p-3 text-left">Importe</th>
                        <th className="p-3 text-left">Estado</th>
                        <th className="p-3 text-left">Fecha</th>
                      </>
                    )}
                    {tab === "precios" && (
                      <>
                        <th className="p-3 text-left">Concepto</th>
                        <th className="p-3 text-left">Importe</th>
                        <th className="p-3 text-left">Moneda</th>
                        <th className="p-3 text-left">Fecha</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row) => (
                    <tr
                      key={
                        row.id_ticket ||
                        row.id_factura_proveedor ||
                        row.id_cargo_pendiente ||
                        row.id_precio
                      }
                      onClick={() => {
                        if (tab === "facturas") {
                          router.push(
                            `/dashboard/administracion/facturas-proveedores/${encodeURIComponent(
                              row.id_factura_proveedor
                            )}`
                          );
                        }
                      }}
                      className={`border-b transition hover:bg-blue-50 ${
                        tab === "facturas" ? "cursor-pointer" : ""
                      }`}
                    >
                      {tab === "tickets" && (
                        <>
                          <td className="p-3">
                            <a
                              href={row.documento_src}
                              target="_blank"
                              className="text-blue-700 underline hover:text-blue-950 cursor-pointer"
                            >
                              {row.id_ticket}
                            </a>
                          </td>
                          <td className="p-3">{row.fecha_ticket}</td>
                          <td className="p-3">
                            {Number(row.importe_total || 0).toFixed(2)} €
                          </td>
                          <td className="p-3">{row.forma_pago}</td>
                        </>
                      )}
                      {tab === "facturas" && (
                        <>
                          <td className="p-3">{row.codigo_factura}</td>
                          <td className="p-3">{row.fecha_factura}</td>
                          <td className="p-3">
                            {Number(row.importe_total || 0).toFixed(2)} €
                          </td>
                          <td className="p-3">{row.estado}</td>
                        </>
                      )}
                      {tab === "cargos-pendientes" && (
                        <>
                          <td className="p-3">{row.concepto}</td>
                          <td className="p-3">
                            {Number(row.importe_cargo || 0).toFixed(2)} €
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                row.estado === "pendiente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : row.estado === "pagado"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {row.estado}
                            </span>
                          </td>
                          <td className="p-3">{row.fecha_cargo}</td>
                        </>
                      )}
                      {tab === "precios" && (
                        <>
                          <td className="p-3">{row.concepto}</td>
                          <td className="p-3">
                            {Number(row.importe || 0).toFixed(2)}
                          </td>
                          <td className="p-3">{row.moneda}</td>
                          <td className="p-3">{row.fecha}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {!filteredData.length && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-gray-500"
                      >
                        No hay elementos en esta sección.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Datos tab */
          <div className="bg-white rounded shadow p-6 max-w-2xl">
            {!editingProveedor ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      ID Proveedor
                    </label>
                    <p className="mt-1 text-gray-700">{proveedor?.id_proveedor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Nombre
                    </label>
                    <p className="mt-1 text-gray-700">{proveedor?.nombre_proveedor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Nombre Fiscal
                    </label>
                    <p className="mt-1 text-gray-700">
                      {proveedor?.nombre_fiscal_proveedor}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      CIF/VAT
                    </label>
                    <p className="mt-1 text-gray-700">{proveedor?.vat_code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      País
                    </label>
                    <p className="mt-1 text-gray-700">{proveedor?.pais_proveedor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Moneda
                    </label>
                    <p className="mt-1 text-gray-700">{proveedor?.moneda_proveedor}</p>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setEditingProveedor(true)}
                    className="px-4 py-2 bg-blue-950 text-white rounded cursor-pointer hover:bg-blue-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={()=>setShowDelete(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded cursor-pointer hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={formData?.nombre_proveedor || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData!,
                          nombre_proveedor: e.target.value,
                        })
                      }
                      className="w-full border rounded px-3 py-2 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Nombre Fiscal
                    </label>
                    <input
                      type="text"
                      value={formData?.nombre_fiscal_proveedor || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData!,
                          nombre_fiscal_proveedor: e.target.value,
                        })
                      }
                      className="w-full border rounded px-3 py-2 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      CIF/VAT
                    </label>
                    <input
                      type="text"
                      value={formData?.vat_code || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData!,
                          vat_code: e.target.value,
                        })
                      }
                      className="w-full border rounded px-3 py-2 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      País
                    </label>
                    <input
                      type="text"
                      value={formData?.pais_proveedor || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData!,
                          pais_proveedor: e.target.value,
                        })
                      }
                      className="w-full border rounded px-3 py-2 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Moneda
                    </label>
                    <input
                      type="text"
                      value={formData?.moneda_proveedor || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData!,
                          moneda_proveedor: e.target.value,
                        })
                      }
                      className="w-full border rounded px-3 py-2 text-gray-700"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    disabled={savingProveedor}
                    onClick={handleSaveProveedor}
                    className="px-4 py-2 bg-green-600 text-white rounded enabled:cursor-pointer enabled:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setEditingProveedor(false);
                      setFormData(proveedor);
                    }}
                    className="px-4 py-2 bg-gray-400 text-white rounded cursor-pointer hover:bg-gray-500"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {showDelete&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-label="Eliminar proveedor" className="max-w-xl space-y-4 rounded bg-white p-6"><header className="flex justify-between"><h2 className="text-xl font-semibold">Eliminar proveedor</h2><button aria-label="Cerrar" className="cursor-pointer rounded px-3 text-2xl hover:bg-blue-50" onClick={()=>setShowDelete(false)}>×</button></header><p>¿Confirmas eliminar {proveedor?.nombre_proveedor}?</p><p>Se conservarán sus facturas, tickets, pagos, cargos recurrentes y movimientos, que quedarán desvinculados. Se eliminarán sus precios y productos/servicios propios.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}<button disabled={deleting} className="rounded bg-red-700 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-red-800 disabled:opacity-50" onClick={handleDeleteProveedor}>{deleting?'Eliminando…':'Confirmar eliminación'}</button></section></div>}
      </main>
    </div>
  );
}
