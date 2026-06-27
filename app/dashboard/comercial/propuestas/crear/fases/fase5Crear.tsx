import { useRouter } from 'next/navigation';
import React, { FC, useMemo } from 'react';
import cuentasContents from "@/app/contents/cuentasContents.json";
import contactsContents from "@/app/contents/contactsContents.json";
import agentesContents from "@/app/contents/agentesContents.json";

interface Producto {
  medio: string;
  publicacion: string;
  producto: string;
  precioTarifa: number;
  precioOfrecido: number | "";
  fechaPublicacion: string;
  descuento_unitario?: number;
  precio_unitario?: number;
}

interface ContactoPersonalizado {
  nombre_completo: string;
  email: string;
}

interface Cobro {
  formaCobro: "Recibo" | "Transferencia bancaria" | "Otro";
  otroEspecificacion?: string;
  banco?: "Banco Santander" | "Banco Sabadell";
  fechaCobro: string;
  importeCobro: number | "";
}

interface Fase5CrearProps {
  setFaseCreacionPropuesta: (fase: number) => void;
  nombrePropuesta: string;
  setNombrePropuesta: (value: string) => void;
  comentariosAdicionales: string;
  setComentariosAdicionales: (value: string) => void;
  // Fase 1
  codigoCliente: string;
  selectedCliente: any;
  // Fase 2
  contactoAnunciante: string;
  contactoFirmante: string;
  contactoPersonalizado: ContactoPersonalizado | null;
  // Fase 3
  productos: Producto[];
  // Fase 4
  nombreFactura: string;
  direccionFactura: string;
  codigoPostal: string;
  estadoZona: string;
  pais: string;
  vat: string;
  baseImponible: string;
  impuesto: string;
  precioTotal: string;
  cobros: Cobro[];
}

const Fase5Crear: FC<Fase5CrearProps> = ({ 
  setFaseCreacionPropuesta,
  nombrePropuesta,
  setNombrePropuesta,
  comentariosAdicionales,
  setComentariosAdicionales,
  codigoCliente,
  selectedCliente,
  contactoAnunciante,
  contactoFirmante,
  contactoPersonalizado,
  productos,
  nombreFactura,
  direccionFactura,
  codigoPostal,
  estadoZona,
  pais,
  vat,
  baseImponible,
  impuesto,
  precioTotal,
  cobros,
}) => {
  const router = useRouter();

  // Obtener datos de la cuenta
  const cuenta = useMemo(() => {
    return (cuentasContents as any[]).find(c => c.id_cuenta === codigoCliente);
  }, [codigoCliente]);

  // Obtener datos del contacto anunciante
  const contactoAnuncianteData = useMemo(() => {
    if (contactoPersonalizado) {
      return {
        nombre_completo_contacto: contactoPersonalizado.nombre_completo,
        email_contacto: contactoPersonalizado.email,
      };
    }
    return (contactsContents as any[]).find(c => c.id_contacto === contactoAnunciante);
  }, [contactoAnunciante, contactoPersonalizado]);

  // Obtener datos del agente
  const agenteData = useMemo(() => {
    if (cuenta?.id_agente) {
      return (agentesContents as any[]).find(a => a.id_agente === cuenta.id_agente);
    }
    return null;
  }, [cuenta]);

  // Validar que el nombre de la propuesta esté cumplimentado
  const nombrePropuestaValido = useMemo(() => {
    return nombrePropuesta.trim().length > 0;
  }, [nombrePropuesta]);

  // Función para obtener clase CSS según si el campo está vacío
  const getInputClassName = (fieldName: string) => {
    const baseClass = "border rounded p-2";
    if (fieldName === "nombrePropuesta" && !nombrePropuestaValido) {
      return `${baseClass} bg-yellow-100 text-yellow-800`;
    }
    return baseClass;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Botón Volver */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setFaseCreacionPropuesta(4)}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400"
        >
          ← Volver a Fase 4
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-6">Revisión final</h2>

      {/* Resumen Fase 1: Cuenta */}
      <div className="border p-4 rounded-xl space-y-2">
        <h3 className="font-semibold text-lg bg-blue-950 text-white p-2 -m-4 mb-2 rounded-t-xl">Fase 1: Cuenta Seleccionada</h3>
        {cuenta && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">Código de cuenta:</p>
              <p className="font-semibold">{cuenta.id_cuenta}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Nombre de empresa:</p>
              <p className="font-semibold">{cuenta.nombre_empresa}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">País:</p>
              <p className="font-semibold">{cuenta.pais_cuenta}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Agente:</p>
              <p className="font-semibold">{agenteData?.nombre_completo_agente || cuenta.id_agente}</p>
            </div>
          </div>
        )}
      </div>

      {/* Resumen Fase 2: Contacto */}
      <div className="border p-4 rounded-xl space-y-2">
        <h3 className="font-semibold text-lg bg-blue-950 text-white p-2 -m-4 mb-2 rounded-t-xl">Fase 2: Contacto</h3>
        {contactoAnuncianteData && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">Contacto Anunciante:</p>
              <p className="font-semibold">{contactoAnuncianteData.nombre_completo_contacto}</p>
              {contactoAnuncianteData.email_contacto && (
                <p className="text-sm text-gray-500">{contactoAnuncianteData.email_contacto}</p>
              )}
            </div>
            {contactoAnunciante !== contactoFirmante && contactoFirmante !== "personalizado" && (
              <div>
                <p className="text-sm text-gray-600">Contacto Firmante:</p>
                <p className="font-semibold">
                  {(contactsContents as any[]).find(c => c.id_contacto === contactoFirmante)?.nombre_completo_contacto || contactoFirmante}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resumen Fase 3: Productos */}
      <div className="border p-4 rounded-xl space-y-2">
        <h3 className="font-semibold text-lg bg-blue-950 text-white p-2 -m-4 mb-2 rounded-t-xl">Fase 3: Productos ({productos.length})</h3>
        {productos.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Medio</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Publicación</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Producto</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Precio Tarifa</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Precio Ofrecido</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Fecha Publicación</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">{producto.medio}</td>
                    <td className="border border-gray-300 px-4 py-2">{producto.publicacion}</td>
                    <td className="border border-gray-300 px-4 py-2">{producto.producto}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{producto.precioTarifa.toFixed(2)}€</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {typeof producto.precioOfrecido === "number" ? producto.precioOfrecido.toFixed(2) : producto.precioOfrecido}€
                    </td>
                    <td className="border border-gray-300 px-4 py-2">{producto.fechaPublicacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 mt-4">No hay productos agregados</p>
        )}
      </div>

      {/* Resumen Fase 4: Configuración de Pago */}
      <div className="border p-4 rounded-xl space-y-2">
        <h3 className="font-semibold text-lg bg-blue-950 text-white p-2 -m-4 mb-2 rounded-t-xl">Fase 4: Configuración de Pago</h3>
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Datos de Facturación:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nombre en factura:</p>
                <p className="font-semibold">{nombreFactura || "No especificado"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dirección:</p>
                <p className="font-semibold">{direccionFactura || "No especificado"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Código Postal:</p>
                <p className="font-semibold">{codigoPostal || "No especificado"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estado/Zona:</p>
                <p className="font-semibold">{estadoZona || "No especificado"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">País:</p>
                <p className="font-semibold">{pais || "No especificado"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">VAT CODE / CIF / CÓDIGO FISCAL:</p>
                <p className="font-semibold">{vat || "No especificado"}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Resumen Financiero:</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Base Imponible:</p>
                <p className="font-semibold">{baseImponible}€</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Impuesto ({impuesto}%):</p>
                <p className="font-semibold">{(parseFloat(baseImponible || "0") * parseFloat(impuesto || "0") / 100).toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Precio Total:</p>
                <p className="font-semibold text-lg">{precioTotal}€</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Cobros ({cobros.length}):</h4>
            {cobros.length > 0 ? (
              <div className="space-y-2">
                {cobros.map((cobro, index) => (
                  <div key={index} className="border rounded p-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Cobro {index + 1}:</p>
                        <p className="font-semibold">{cobro.formaCobro}</p>
                        {cobro.formaCobro === "Otro" && cobro.otroEspecificacion && (
                          <p className="text-sm text-gray-500">{cobro.otroEspecificacion}</p>
                        )}
                        {cobro.banco && (
                          <p className="text-sm text-gray-500">Banco: {cobro.banco}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fecha:</p>
                        <p className="font-semibold">{cobro.fechaCobro || "No especificada"}</p>
                        <p className="text-sm text-gray-600 mt-2">Importe:</p>
                        <p className="font-semibold">
                          {typeof cobro.importeCobro === "number" ? cobro.importeCobro.toFixed(2) : "No especificado"}€
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No hay cobros configurados</p>
            )}
          </div>
        </div>
      </div>

      {/* Campos de Fase 5 */}
      <div className="border p-4 rounded-xl space-y-4">
        <h3 className="font-semibold text-lg bg-blue-950 text-white p-2 -m-4 mb-2 rounded-t-xl">Fase 5: Información Final</h3>
        <div className="mt-4 space-y-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Nombre de la propuesta <span className="text-red-500">*</span></label>
            <input 
              className={getInputClassName("nombrePropuesta")}
              placeholder='Prop 01.433241212'
              value={nombrePropuesta}
              onChange={(e) => setNombrePropuesta(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Comentarios adicionales (opcional)</label>
            <textarea 
              className="border rounded p-2" 
              placeholder='Introduce aquí comentarios adicionales si los hay'
              value={comentariosAdicionales}
              onChange={(e) => setComentariosAdicionales(e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600"
          onClick={() => { router.push("/dashboard/comercial/propuestas") }}
        >
          Confirmar y crear propuesta
        </button>
      </div>
    </div>
  );
};

export default Fase5Crear;
