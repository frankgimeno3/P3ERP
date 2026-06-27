"use client";
import agentesContents from "@/app/contents/agentesContents.json";
import React, { FC, useState } from "react";

interface Props {
  onFiltrar: (mes: string, anio: string, agente: string, tipoEvento: string) => void;
}

const tiposEvento = [
  "Todos",
  "Modificación en cuenta o contacto",
  "Creación en cuenta o contacto",
  "Edición de propuesta",
  "Creación de propuesta",
  "Creación de contrato",
  "Modificación de contrato",
  "Modificación de materiales",
  "Creación de servicio",
  "Modificación de servicio",
  "Modificación de Orden",
  "Evento de fichaje",
  "Evento de solicitud de fichaje",
  "Evento de aprovación/rechazo fichaje",
  "Creación de usuario",
  "Edición de usuario",
  "Importación",
  "Exportación",
];

const FiltroTemporal: FC<Props> = ({ onFiltrar }) => {
  const [mes, setMes] = useState("01");
  const [anio, setAnio] = useState("2025");
  const [agente, setAgente] = useState("Todos");
  const [tipoEvento, setTipoEvento] = useState("Todos");

  const handleFiltrar = () => {
    onFiltrar(mes, anio, agente, tipoEvento);
  };

  const agentes = [{ id_agente: "Todos", nombre_completo_agente: "Todos" }, ...agentesContents];

  return (
    <div className="flex flex-row bg-blue-950 text-white justify-between items-end text-lg rounded-t px-6 py-3">
      <div className="flex flex-row justify-left items-center w-full">
        <p className="w-full text-lg font-bold">Eventos registrados</p>

        <div className="flex flex-row items-center justify-end p-2 text-right text-sm space-x-5 w-full">
          <div className="flex flex-row items-center">
            <p className="text-gray-200">Mes:</p>
            <select
              className="text-gray-600 px-2 py-1 rounded bg-white ml-2"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            >
              {[...Array(12)].map((_, i) => {
                const month = (i + 1).toString().padStart(2, "0");
                return (
                  <option className="text-black" key={month} value={month}>
                    {month}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-row items-center">
            <p className="text-gray-200">Año:</p>
            <select
              className="text-gray-600 px-2 py-1 rounded bg-white ml-2"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
            >
              {[...Array(6)].map((_, i) => {
                const year = (2030 - i).toString();
                return (
                  <option className="text-black" key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-row items-center">
            <p className="text-gray-200">Agente:</p>
            <select
              className="text-gray-600 px-2 py-1 rounded bg-white ml-2"
              value={agente}
              onChange={(e) => setAgente(e.target.value)}
            >
              {agentes.map((ag) => (
                <option className="text-black" key={ag.id_agente} value={ag.id_agente}>
                  {ag.nombre_completo_agente}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-row items-center">
            <p className="w-24 text-gray-200">Tipo de evento:</p>
            <select
              className="text-gray-600 px-2 py-1 rounded bg-white ml-2"
              value={tipoEvento}
              onChange={(e) => setTipoEvento(e.target.value)}
            >
              {tiposEvento.map((tipo) => (
                <option className="text-black" key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <button
            className="px-3 py-1 cursor-pointer border border-gray-600 rounded hover:bg-gray-200 hover:text-black transition-color w-44"
            onClick={handleFiltrar}
          >
            Actualizar resultados
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltroTemporal;
