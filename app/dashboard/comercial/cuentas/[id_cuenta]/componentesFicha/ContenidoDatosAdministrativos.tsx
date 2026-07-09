'use client';

import React, { FC, useState } from "react";
import { InterfazCuenta } from "@/app/interfaces/interfaces";

interface ContenidoDatosAdministrativosProps {
  cuentaEditable: InterfazCuenta;
  setCuentaEditable: React.Dispatch<React.SetStateAction<InterfazCuenta | undefined>>;
  setIsContenidoEdited: (val: boolean) => void;
}

const fieldClass = "w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring focus:ring-blue-400";

const ContenidoDatosAdministrativos: FC<ContenidoDatosAdministrativosProps> = ({
  cuentaEditable,
  setCuentaEditable,
  setIsContenidoEdited,
}) => {
  const [subpestana, setSubpestana] = useState<"facturas" | "facturacion" | "cobros">("facturacion");

  const handleChange = (field: keyof InterfazCuenta, value: string) => {
    setCuentaEditable((prev) => (prev ? { ...prev, [field]: value } : prev));
    setIsContenidoEdited(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex">
        {[
          { key: "facturacion", label: "Datos de facturación" },
          { key: "facturas", label: "Facturas emitidas" },
          { key: "cobros", label: "Estado de cobros" },
        ].map(({ key, label }, index) => (
          <button
            key={key}
            type="button"
            className={`p-3 w-56 text-center transition-all duration-300 ${
              subpestana === key ? "bg-blue-950 text-white" : "bg-white text-gray-700 hover:bg-gray-200"
            } ${index === 0 ? "rounded-tl-lg" : ""} rounded-tr-lg`}
            style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
            onClick={() => setSubpestana(key as typeof subpestana)}
          >
            {label}
          </button>
        ))}
      </div>

      {subpestana === "facturacion" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <label className="space-y-1">
            <span className="font-medium">VAT Code</span>
            <input value={cuentaEditable.vat_code} onChange={(e) => handleChange("vat_code", e.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">Nombre fiscal</span>
            <input value={cuentaEditable.nombre_fiscal} onChange={(e) => handleChange("nombre_fiscal", e.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">País facturación</span>
            <input value={cuentaEditable.pais_facturacion} onChange={(e) => handleChange("pais_facturacion", e.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">Mail contabilidad</span>
            <input value={cuentaEditable.mail_contabilidad} onChange={(e) => handleChange("mail_contabilidad", e.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">Población facturación</span>
            <input value={cuentaEditable.poblacion_facturacion} onChange={(e) => handleChange("poblacion_facturacion", e.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className="font-medium">CP facturación</span>
            <input value={cuentaEditable.cp_facturacion} onChange={(e) => handleChange("cp_facturacion", e.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="font-medium">Dirección facturación</span>
            <input value={cuentaEditable.direccion_facturacion} onChange={(e) => handleChange("direccion_facturacion", e.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="font-medium">Detalles facturación</span>
            <textarea value={cuentaEditable.detalles_facturacion} onChange={(e) => handleChange("detalles_facturacion", e.target.value)} className={`${fieldClass} min-h-32`} />
          </label>
        </section>
      )}

      {subpestana === "facturas" && (
        <section>
          <table className="min-w-full border border-gray-300 text-sm bg-white">
            <thead className="bg-blue-950/80 text-white">
              <tr>
                <th className="text-left p-2 font-light">Factura</th>
                <th className="text-left p-2 font-light">Fecha</th>
                <th className="text-left p-2 font-light">Importe</th>
              </tr>
            </thead>
            <tbody>
              {(cuentaEditable.facturas_emitidas || []).map((factura, index) => (
                <tr key={`${factura.id_factura || "factura"}-${index}`} className="border-t border-gray-200">
                  <td className="p-2">{factura.id_factura || "-"}</td>
                  <td className="p-2">{factura.fecha || "-"}</td>
                  <td className="p-2">{factura.importe ?? "-"}</td>
                </tr>
              ))}
              {(!cuentaEditable.facturas_emitidas || cuentaEditable.facturas_emitidas.length === 0) && (
                <tr>
                  <td colSpan={3} className="p-3 text-gray-500">
                    No hay facturas emitidas para esta cuenta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {subpestana === "cobros" && (
        <section>
          <table className="min-w-full border border-gray-300 text-sm bg-white">
            <thead className="bg-blue-950/80 text-white">
              <tr>
                <th className="text-left p-2 font-light">Factura</th>
                <th className="text-left p-2 font-light">Fecha</th>
                <th className="text-left p-2 font-light">Importe</th>
                <th className="text-left p-2 font-light">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(cuentaEditable.facturas_emitidas || []).map((factura, index) => (
                <tr key={`${factura.id_factura || "cobro"}-${index}`} className="border-t border-gray-200">
                  <td className="p-2">{factura.id_factura || "-"}</td>
                  <td className="p-2">{factura.fecha || "-"}</td>
                  <td className="p-2">{factura.importe ?? "-"}</td>
                  <td className="p-2">{(factura as any).estado_cobro || "Pendiente"}</td>
                </tr>
              ))}
              {(!cuentaEditable.facturas_emitidas || cuentaEditable.facturas_emitidas.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-3 text-gray-500">
                    No hay cobros registrados para esta cuenta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

export default ContenidoDatosAdministrativos;
