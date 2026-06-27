import React, { FC } from "react";
import propuestas from "@/app/contents/propuestasContents.json";
import agentes from "@/app/contents/agentesContents.json";
import { InterfazPropuesta, InterfazAgente } from "@/app/interfaces/interfaces";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
            <input
              type="date"
              name="fechaEnvio"
              value={formData.fechaEnvio}
              onChange={handleChange}
              className="border border-gray-300 rounded px-2 py-1 w-full"
            />
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
