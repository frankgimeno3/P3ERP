import React, { FC, useEffect } from "react";
import { InterfazPropuesta } from "@/app/interfaces/interfaces";
const propuestas: any[] = [];

const splitDate = (value: string) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/) || String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { day: "", month: "", year: "" };
  return match[0].includes("-")
    ? { day: match[3], month: match[2], year: match[1] }
    : { day: match[1], month: match[2], year: match[3] };
};

const updateDatePart = (value: string, field: "day" | "month" | "year", nextValue: string) => {
  const parts = splitDate(value);
  const next = { ...parts, [field]: nextValue.replace(/\D/g, "").slice(0, field === "year" ? 4 : 2) };
  if (!next.day && !next.month && !next.year) return "";
  return `${next.day.padStart(2, "0")}/${next.month.padStart(2, "0")}/${next.year.padStart(4, "0")}`;
};

interface DatosCobroPropuestaProps {
  codigoPropuesta: string;
  cobros: any[];
  setCobros: (cobros: any[] | ((prev: any[]) => any[])) => void;
  showModal: boolean;
  setShowModal: (val: boolean) => void;
  cobroAEliminar: number | null;
  setCobroAEliminar: (val: number | null) => void;
}

const DatosCobroPropuesta: FC<DatosCobroPropuestaProps> = ({
  codigoPropuesta, cobros, setCobros,
  showModal, setShowModal, cobroAEliminar, setCobroAEliminar,
}) => {
  const propuestasData = propuestas as InterfazPropuesta[];
  const propuesta_seleccionada = propuestasData.find(
    (p) => p.id_propuesta === codigoPropuesta
  );

   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModal(false);
        setCobroAEliminar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setShowModal, setCobroAEliminar]);

  const handleChange = (index: number, field: string, value: string | number) => {
    const updated = [...cobros];
    updated[index] = { ...updated[index], [field]: value };
    setCobros(updated);
  };

  const handleEliminarClick = (index: number) => {
    setCobroAEliminar(index);
    setShowModal(true);
  };

  const handleConfirmarEliminar = () => {
    if (cobroAEliminar !== null) {
      const updated = cobros.filter((_, i) => i !== cobroAEliminar);
      setCobros(updated);
      setCobroAEliminar(null);
      setShowModal(false);
    }
  };

  const handleCancelar = () => {
    setShowModal(false);
    setCobroAEliminar(null);
  };

  if (!propuesta_seleccionada) {
    return <p className="text-center text-gray-500">Propuesta no encontrada.</p>;
  }

  return (
    <>
      <table className="w-full border shadow-xs border-gray-100 text-center text-sm">
        <thead>
          <tr className="bg-blue-950/80 text-white">
            <th className="px-4 py-2">Número de cobro</th>
            <th className="px-4 py-2">Fecha</th>
            <th className="px-4 py-2">Importe</th>
            <th className="px-4 py-2">Forma de pago</th>
            <th className="px-4 py-2">Eliminar</th>
          </tr>
        </thead>
        <tbody>
          {cobros.map((cobro, index) => (
            <tr key={index} className="bg-white text-gray-700 border-t border-gray-100">
              <td className="px-4 py-2">{cobro.numero_cobro}</td>
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  {(["day", "month", "year"] as const).map((field) => (
                    <input
                      key={field}
                      value={splitDate(cobro.fecha_cobro || "")[field]}
                      onChange={(e) => handleChange(index, "fecha_cobro", updateDatePart(cobro.fecha_cobro || "", field, e.target.value))}
                      placeholder={field === "day" ? "dd" : field === "month" ? "mm" : "yyyy"}
                      className={`border border-gray-300 rounded px-2 py-1 ${field === "year" ? "w-20" : "w-14"}`}
                    />
                  ))}
                </div>
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  value={cobro.importe_cobro || ""}
                  onChange={(e) => handleChange(index, "importe_cobro", parseFloat(e.target.value))}
                  step="0.01"
                  min="0"
                  className="border border-gray-300 rounded px-2 py-1 w-full"
                />
              </td>
              <td className="px-4 py-2">
                <select
                  value={cobro.forma_cobro || ""}
                  onChange={(e) => handleChange(index, "forma_cobro", e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 w-full"
                >
                  <option value="Otros">Otros</option>
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  <option value="Recibo domiciliado">Recibo domiciliado</option>
                </select>
              </td>
             <td className="px-4 py-2">
                <button
                  onClick={() => handleEliminarClick(index)}
                  className="text-red-600 font-bold text-xl hover:text-red-800"
                  aria-label={`Eliminar fila ${index + 1}`}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

       {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-sm p-4 relative">
            <button
              onClick={handleCancelar}
              className="absolute top-2 right-3 text-gray-500 text-lg font-bold hover:text-gray-700"
            >
              ×
            </button>
            <h2 className="text-lg font-semibold text-center mb-4">
              ¿Seguro que desea eliminar?
            </h2>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={handleCancelar}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DatosCobroPropuesta;
