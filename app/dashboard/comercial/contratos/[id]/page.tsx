"use client";
import React, { FC, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { ContratoService } from "@/app/service/ContratoService";
import { AgenteService } from "@/app/service/AgenteService";
import apiClient from '@/app/apiClient';
import ContractContactModal from './ContractContactModal';
import ContractOrdersModal from './ContractOrdersModal';
import ContractDocument from './ContractDocument';

const formatDate = (value?: string) => value || "-";
const formatMoney = (value?: number) => {
  const amount = Number(value ?? 0);
  return amount ? `${amount.toLocaleString("es-ES")} €` : "-";
};

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="border-b border-gray-200 px-4 py-3">
    <p className="text-xs uppercase text-gray-400">{label}</p>
    <p className="mt-1 text-sm text-gray-700">{value || "-"}</p>
  </div>
);

const ResumenContrato: FC = () => {
  const [tab,setTab]=useState<'datos'|'documento'>('datos');
  const params = useParams();
  const id = params?.id as string;
  const [contrato, setContrato] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [agentes, setAgentes] = useState<any[]>([]);
  const [signed, setSigned] = useState<{uploaded:boolean;name:string}|null>(null);
  const [signedFile, setSignedFile] = useState<File|null>(null);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [contactOpen,setContactOpen]=useState(false);
  const [ordersOpen,setOrdersOpen]=useState(false);

  useEffect(() => {
    const fetchContrato = async () => {
      try {
        setLoading(true);
        setError("");
        const [data, agentRows] = await Promise.all([
          ContratoService.getContratoById(id),
          AgenteService.getAgentes(),
        ]);
        setContrato(data);
        setAgentes(Array.isArray(agentRows) ? agentRows : []);
        const signedResponse = await apiClient.get(`/api/v1/comercial/contratos/${encodeURIComponent(id)}/firmado`);
        setSigned(signedResponse.data);
      } catch (err) {
        console.error("Error fetching contrato:", err);
        setError("No se ha podido cargar el contrato.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchContrato();
  }, [id]);

  const saveGeneralData = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await ContratoService.updateContrato(id, {
        id_agente_contrato: contrato.id_agente_contrato || "",
      });
      setContrato(updated);
      setMessage("Datos generales actualizados correctamente.");
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.detail ||
          requestError?.response?.data?.message ||
          "No se ha podido actualizar el contrato.",
      );
    } finally {
      setSaving(false);
    }
  };
  const chooseContact=async(contactId:string)=>{const updated=await ContratoService.updateContrato(id,{id_contacto_contrato:contactId});setContrato(updated);setMessage('Contacto del contrato actualizado.');};
  const refreshContract=async()=>{setContrato(await ContratoService.getContratoById(id));setMessage('Órdenes reemplazadas correctamente.');};

  const uploadSigned = async () => {
    if (!signedFile || uploadingSigned) return;
    setUploadingSigned(true);setError('');
    try {
      const contentType=signedFile.type;
      if (contentType!=='application/pdf' && !contentType.startsWith('image/')) throw new Error('Selecciona un PDF o una imagen.');
      const endpoint=`/api/v1/comercial/contratos/${encodeURIComponent(id)}/firmado`;
      const presigned=(await apiClient.post(endpoint,{contentType})).data;
      const uploaded=await fetch(presigned.uploadUrl,{method:'PUT',headers:{'Content-Type':contentType},body:signedFile});
      if (!uploaded.ok) throw new Error('No se pudo subir el contrato firmado.');
      setSigned((await apiClient.put(endpoint,{contentType,mediaId:presigned.mediaId,s3Key:presigned.s3Key,cdnUrl:presigned.cdnUrl})).data);
      setSignedFile(null);
    } catch (err:any) {setError(err.response?.data?.message||err.message);}
    finally {setUploadingSigned(false);}
  };
  const downloadSigned=async()=>{
    try {const response=await apiClient.get(`/api/v1/comercial/contratos/${encodeURIComponent(id)}/firmado?descarga=1`);window.location.assign(response.data.url);}
    catch(err:any){setError(err.response?.data?.message||err.message);}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 text-gray-600 p-12">
        <h2 className="text-xl font-semibold">Cargando contrato...</h2>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 text-gray-600 p-12">
        <h2 className="text-xl font-semibold text-red-600">{error || `No se encontró el contrato con ID: ${id}`}</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal={`Resumen del contrato nº ${contrato.id_contrato}`} />
      <div className="p-12 space-y-8"><div role="tablist" aria-label="Vista del contrato" className="flex gap-2">{(['datos','documento'] as const).map(value=><button key={value} role="tab" aria-selected={tab===value} type="button" onClick={()=>setTab(value)} className={`cursor-pointer rounded px-4 py-3 ${tab===value?'bg-blue-950 text-white hover:bg-blue-900':'bg-white hover:bg-blue-50'}`}>{value==='datos'?'Datos':'Vista de documento'}</button>)}</div><div hidden={tab!=='datos'} className="space-y-8">
        {error && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p className="border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</p>}
        <section className="bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="text-base font-semibold text-blue-950">Datos generales</h2>
            <button type="button" onClick={() => void saveGeneralData()} disabled={saving} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3">
            <Field label="Contrato" value={contrato.id_contrato} />
            <Field label="Nombre" value={contrato.nombre_contrato} />
            <Field label="Moneda" value={contrato.moneda || "EUR"} />
            <Field label="Comentarios" value={contrato.comentarios_adicionales} />
            <label className="border-b border-gray-200 px-4 py-3">
              <span className="text-xs uppercase text-gray-400">Agente</span>
              <select value={contrato.id_agente_contrato || ""} onChange={(event) => setContrato({ ...contrato, id_agente_contrato: event.target.value })} className="mt-1 w-full cursor-pointer rounded border bg-white px-3 py-2 text-sm transition hover:border-blue-950">
                <option value="">Sin agente</option>
                {agentes.map((agente) => <option key={agente.id_agente} value={agente.id_agente}>{agente.nombre_completo_agente || agente.nombre_agente || agente.id_agente}</option>)}
              </select>
            </label>
            <Field label="Propuesta de origen" value={contrato.id_propuesta ? <Link href={`/dashboard/comercial/propuestas/${encodeURIComponent(contrato.id_propuesta)}`} className="cursor-pointer font-medium text-blue-950 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-700">{contrato.id_propuesta}</Link> : "-"} />
            <Field label="Fecha de firma" value={formatDate(contrato.fecha_firma_contrato)} />
            <Field label="Fecha fin" value={formatDate(contrato.fecha_fin_contrato)} />
            <Field label="Fecha cobro prevista" value={formatDate(contrato.fecha_cobro_prevista_contrato)} />
            <Field label="Forma de cobro" value={contrato.forma_cobro_contrato} />
            <Field label="Descuento final" value={formatMoney(contrato.descuento_final_contrato)} />
            <Field label="Importe BI" value={contrato.datos_importacion?.importe_desconocido ? "Importe pendiente" : formatMoney(contrato.importe_total_bi_contrato)} />
            <Field label="IVA aplicable" value={contrato.datos_importacion?.importe_desconocido ? "Sin determinar" : contrato.iva_aplicable ? "Sí" : "No"} />
            <Field label={contrato.es_intercambio ? "Cobro monetario del intercambio" : "Importe con IVA"} value={contrato.datos_importacion?.importe_desconocido ? "Importe pendiente" : contrato.es_intercambio ? "0 EUR" : formatMoney(contrato.importe_contrato_con_iva)} />
            {contrato.es_intercambio && <><Field label="Valor ofrecido en intercambio" value={formatMoney(contrato.importe_intercambio)} /><Field label="Condiciones del intercambio" value={contrato.condiciones_intercambio} /></>}
          </div>
        </section>

        <section className="bg-white p-4">
          <h2 className="text-base font-semibold text-blue-950">Contrato firmado</h2>
          <div className="mt-3 rounded border p-4">
            <p className="text-sm">{signed?.uploaded ? 'Contrato firmado subido' : 'Contrato firmado pendiente de subir'}</p>
            {signed?.uploaded && <button type="button" onClick={()=>void downloadSigned()} className="mt-2 cursor-pointer text-sm text-blue-900 hover:underline">Ver {signed.name}</button>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input type="file" accept="application/pdf,image/*" aria-label="Archivo del contrato firmado" onChange={event=>setSignedFile(event.target.files?.[0]||null)} className="cursor-pointer rounded border p-2 text-sm hover:border-blue-900" />
              <button type="button" disabled={!signedFile||uploadingSigned} onClick={()=>void uploadSigned()} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm text-white hover:bg-blue-900 disabled:cursor-default disabled:opacity-50">{uploadingSigned?'Subiendo...':'Subir firmado'}</button>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="flex items-center justify-between px-4 py-3"><h2 className="text-base font-semibold text-blue-950">Datos de la empresa</h2><button type="button" onClick={()=>setContactOpen(true)} className="cursor-pointer rounded border px-3 py-1.5 text-sm text-blue-950 hover:bg-blue-50">Editar contacto</button></div>
          <div className="grid grid-cols-1 md:grid-cols-3">
            <Field label="Cuenta" value={contrato.nombre_empresa || contrato.id_cuenta_contrato} />
            <Field label="ID cuenta" value={contrato.id_cuenta_contrato} />
            <Field label="Contacto" value={contrato.nombre_contacto || contrato.id_contacto_contrato} />
            <Field label="ID contacto" value={contrato.id_contacto_contrato} />
            <Field label="Cargo contacto" value={contrato.cargo_contacto_contrato} />
          </div>
        </section>

        <section className="bg-white">
          <h2 className="px-4 py-3 text-base font-semibold text-blue-950">Contenido del contrato</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-2 text-left font-light">Línea</th>
                  <th className="p-2 text-left font-light">Medio</th>
                  <th className="p-2 text-left font-light">Publicación</th>
                  <th className="p-2 text-left font-light">Producto</th>
                  <th className="p-2 text-left font-light">Precio unitario</th><th className="p-2 text-left font-light">Unidades</th><th className="p-2 text-left font-light">Base</th><th className="p-2 text-left font-light">IVA</th><th className="p-2 text-left font-light">Descripción</th>
                  <th className="p-2 text-left font-light">Deadline</th>
                  <th className="p-2 text-left font-light">Fecha publicación</th>
                  <th className="p-2 text-left font-light">Estado material</th>
                </tr>
              </thead>
              <tbody>
                {contrato.lineas_contrato?.length ? contrato.lineas_contrato.map((linea: any) => (
                  <tr key={linea.id_linea_contrato}>
                    <td className="border-b border-gray-200 p-2">{linea.numero_linea_contrato || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.medio || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.publicacion || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.producto || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.precio_no_desglosado ? 'Sin desglose' : formatMoney(linea.precio_unitario || linea.precio_producto)}</td><td className="border-b p-2">{linea.unidades ?? 1}</td><td className="border-b p-2">{linea.linea_snapshot?.importe_desconocido ? 'Importe pendiente' : linea.precio_no_desglosado && !linea.linea_snapshot?.importe_global ? 'Incluido en el total' : formatMoney(linea.precio_total_personalizado ?? Number(linea.unidades || 1)*Number(linea.precio_unitario || linea.precio_producto || 0))}</td><td className="border-b p-2">{linea.precio_no_desglosado ? (contrato.datos_importacion?.importe_desconocido || contrato.datos_importacion?.iva_porcentaje == null ? 'Sin determinar' : `${contrato.datos_importacion.iva_porcentaje}%`) : `${linea.linea_snapshot?.iva_porcentaje ?? 21}%`}</td><td className="border-b p-2">{linea.descripcion_linea || '-'}</td>
                    <td className="border-b border-gray-200 p-2">{linea.deadline_publicacion || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.fecha_publicacion_publicacion || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{linea.estado_material_contrato || "-"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={12} className="p-6 text-center text-gray-500">Este contrato no tiene líneas asociadas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white">
          <div className="flex items-center justify-between px-4 py-3"><h2 className="text-base font-semibold text-blue-950">Órdenes asociadas</h2><button type="button" onClick={()=>setOrdersOpen(true)} className="cursor-pointer rounded border px-3 py-1.5 text-sm text-blue-950 hover:bg-blue-50">Modificar órdenes</button></div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-blue-950 text-white">
                <tr>
                  <th className="p-2 text-left font-light">Orden</th>
                  <th className="p-2 text-left font-light">Contrato</th>
                  <th className="p-2 text-left font-light">Forma cobro</th>
                  <th className="p-2 text-left font-light">Factura</th>
                  <th className="p-2 text-left font-light">Base</th>
                  <th className="p-2 text-left font-light">Total</th>
                  <th className="p-2 text-left font-light">Fecha prevista</th>
                  <th className="p-2 text-left font-light">Fecha real</th>
                  <th className="p-2 text-left font-light">Banco</th>
                  <th className="p-2 text-left font-light">Estado</th>
                </tr>
              </thead>
              <tbody>
                {contrato.ordenes?.length ? contrato.ordenes.map((orden: any) => (
                  <tr key={orden.id_orden}>
                    <td className="border-b border-gray-200 p-2 font-medium text-blue-950"><Link href={`/dashboard/administracion/control-administrativo/${encodeURIComponent(orden.id_orden)}`} className="cursor-pointer hover:underline">{orden.id_orden}</Link></td>
                    <td className="border-b border-gray-200 p-2">{orden.id_contrato || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{orden.forma_cobro || "-"}</td>
                    <td className="border-b border-gray-200 p-2">{orden.id_factura ? <Link href={`/dashboard/administracion/facturas-clientes/${encodeURIComponent(orden.id_factura)}`} className="cursor-pointer text-blue-900 hover:underline">{orden.id_factura}</Link> : "Sin factura"}</td>
                    <td className="border-b p-2">{formatMoney(orden.base_imponible)}</td><td className="border-b p-2">{formatMoney(orden.cobro_total)}</td><td className="border-b p-2">{formatDate(orden.fecha_teorica_cobro)}</td><td className="border-b p-2">{formatDate(orden.fecha_real_cobro)}</td><td className="border-b p-2">{orden.banco_cobro || "-"}</td><td className="border-b p-2">{orden.cobrada ? "Cobrada" : "Pendiente"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-gray-500">Este contrato no tiene órdenes asociadas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="bg-white p-4"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-blue-950">Facturas asociadas</h2><Link href={`/dashboard/administracion/facturas-clientes/crear?origen=contrato&id_contrato=${encodeURIComponent(id)}`} className="cursor-pointer rounded border px-3 py-1.5 text-sm text-blue-950 hover:bg-blue-50">Crear factura</Link></div>{contrato.facturas?.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{["Factura","Estado","Base","Total","Cobrado","Fecha de cobro"].map(label=><th key={label} className="p-2 text-left">{label}</th>)}</tr></thead><tbody>{contrato.facturas.map((factura:any)=><tr key={factura.id_factura_cliente} className="border-t"><td className="p-2"><Link href={`/dashboard/administracion/facturas-clientes/${encodeURIComponent(factura.id_factura_cliente)}`} className="cursor-pointer text-blue-900 hover:underline">{factura.numero_factura || factura.id_factura_cliente}</Link></td><td className="p-2">{factura.verifactu_estado_envio==="factura emitida"?"Emitida":factura.estado}</td><td className="p-2">{formatMoney(factura.base_imponible)}</td><td className="p-2">{formatMoney(factura.importe_total)}</td><td className="p-2">{formatMoney(factura.importe_cobrado)}</td><td className="p-2">{formatDate(factura.fecha_real_cobro)}</td></tr>)}</tbody></table></div>:<p>Este contrato todavía no tiene factura asociada.</p>}</section>
      </div>{tab==='documento'&&<ContractDocument contract={contrato}/>}</div>
      {contactOpen&&<ContractContactModal accountId={contrato.id_cuenta_contrato} onClose={()=>setContactOpen(false)} onSelect={chooseContact}/>}
      {ordersOpen&&<ContractOrdersModal contractId={id} orders={contrato.ordenes||[]} onClose={()=>setOrdersOpen(false)} onDone={refreshContract}/>}
    </div>
  );
};

export default ResumenContrato;
