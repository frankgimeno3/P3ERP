import React, { FC, ChangeEvent } from "react";
import propuestas from "@/app/contents/propuestasContents.json";
import { InterfazPropuesta } from "@/app/interfaces/interfaces";

interface OtrosDatosEnFacturaProps {
  codigoPropuesta: string;
  importe_antes_descuento: number;
  formData: FormDataFactura;
  setFormData: (formData: FormDataFactura | ((prev: FormDataFactura) => FormDataFactura)) => void;
}

export interface FormDataFactura {
  total_previo_propuesta: number;
  descuento_final_propuesta: number;
  importe_total_BI_propuesta: number;
  impuesto: string;
  importe_propuesta_con_iva: number;
}

const OtrosDatosEnFactura: FC<OtrosDatosEnFacturaProps> = ({
  codigoPropuesta,
  importe_antes_descuento,
  formData,
  setFormData,
}) => {
  const propuestasData = propuestas as InterfazPropuesta[];

  const propuesta_seleccionada = propuestasData.find(
    (p) => p.id_propuesta === codigoPropuesta
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

     const numericValue = name === "impuesto" ? value : parseFloat(value) || 0;

    setFormData((prev) => ({
      ...prev,
      [name]: numericValue,
    }));
  };

  if (!propuesta_seleccionada) {
    return (
      <div className="text-red-600 font-semibold">
        No se encontró la propuesta con código: {codigoPropuesta}
      </div>
    );
  }

  return (
    <table className="w-full border shadow-xs border-gray-100 text-center text-sm">
      <thead>
        <tr className="bg-blue-950/80 text-white">
          <th className="px-4 py-2">Total</th>
          <th className="px-4 py-2">Descuento</th>
          <th className="px-4 py-2">Base Imponible</th>
          <th className="px-4 py-2">IVA</th>
          <th className="px-4 py-2">Precio final</th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-white text-gray-700">
           <td className="px-4 py-2">
            <input
              type="number"
              name="total_previo_propuesta"
              value={importe_antes_descuento}
              readOnly
              className="border border-gray-200 bg-gray-100 rounded px-2 py-1 w-full text-right cursor-not-allowed"
            />
          </td>

           <td className="px-4 py-2">
            <input
              type="number"
              name="descuento_final_propuesta"
              value={formData.descuento_final_propuesta}
              onChange={handleChange}
              className="border border-gray-300 rounded px-2 py-1 w-full text-right"
            />
          </td>

           <td className="px-4 py-2">
            <input
              type="number"
              name="importe_total_BI_propuesta"
              value={formData.importe_total_BI_propuesta}
              readOnly
              className="border border-gray-200 bg-gray-100 rounded px-2 py-1 w-full text-right"
            />
          </td>

           <td className="px-4 py-2">
            <select
              name="impuesto"
              value={formData.impuesto}
              onChange={handleChange}
              className="border border-gray-300 rounded px-2 py-1 w-full"
            >
              <option value="21">21%</option>
              <option value="0">0%</option>
            </select>
          </td>

           <td className="px-4 py-2">
            <input
              type="number"
              name="importe_propuesta_con_iva"
              value={formData.importe_propuesta_con_iva}
              readOnly
              className="border border-gray-200 bg-gray-100 rounded px-2 py-1 w-full text-right"
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default OtrosDatosEnFactura;
