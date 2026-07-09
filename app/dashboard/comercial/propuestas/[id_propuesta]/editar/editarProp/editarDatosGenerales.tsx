import React, { FC } from "react";
import { InterfazPropuesta, InterfazAgente } from "@/app/interfaces/interfaces";
const propuestas: any[] = [];
const agentes: any[] = [];

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

interface TablaDatosGeneralesProps {
  codigoPropuesta: string;
  formData: DatosGenerales;
  setFormData: (formData: DatosGenerales | ((prev: DatosGenerales) => DatosGenerales)) => void;
}

export interface DatosGenerales {
  codigoPropuesta: string;
  fechaEnvio: string;
  fechaValidez: string;
  agente: string;
}

const TablaDatosGenerales: FC<TablaDatosGeneralesProps> = ({ codigoPropuesta, formData, setFormData }) => {
  const propuestasData = propuestas as InterfazPropuesta[];
  const agentesData = agentes as InterfazAgente[];

  const propuesta_seleccionada = propuestasData.find(
    (p) => p.id_propuesta === codigoPropuesta
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Buscar el agente actual para mostrar su nombre
  const agenteActual = agentesData.find((a) => a.id_agente === formData.agente);

  if (!propuesta_seleccionada) {
    return <div>No se encontró la propuesta con código: {codigoPropuesta}</div>;
  }

  return (
    <table className="w-full border shadow-xs border-gray-100 text-center text-sm font-light">
      <thead>
        <tr className="bg-blue-950/80 text-white">
          <th className="px-4 py-2">Nombre de la propuesta</th>
          <th className="px-4 py-2">Fecha de envío al cliente</th>
           <th className="px-4 py-2">Agente ofertante</th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-white text-gray-700">
          <td className="px-4 py-2">
            <input
              type="text"
              readOnly
              value={formData.codigoPropuesta}
              className="border border-gray-300 rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
            />
          </td>
          <td className="px-4 py-2">
            <div className="flex gap-1">
              {(["day", "month", "year"] as const).map((field) => (
                <input
                  key={field}
                  value={splitDate(formData.fechaEnvio)[field]}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fechaEnvio: updateDatePart(prev.fechaEnvio, field, e.target.value) }))}
                  placeholder={field === "day" ? "dd" : field === "month" ? "mm" : "yyyy"}
                  className={`border border-gray-300 rounded px-2 py-1 ${field === "year" ? "w-20" : "w-14"}`}
                />
              ))}
            </div>
          </td>
       
          <td className="px-4 py-2">
            <select
              name="agente"
              value={formData.agente}
              onChange={handleSelectChange}
              className="border border-gray-300 rounded px-2 py-1 w-full"
            >
              <option value="">Seleccione un agente</option>
              {agentesData.map((agente) => (
                <option key={agente.id_agente} value={agente.id_agente}>
                  {agente.nombre_completo_agente}
                </option>
              ))}
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default TablaDatosGenerales;
