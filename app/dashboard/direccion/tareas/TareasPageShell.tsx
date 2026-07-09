"use client";

import { useEffect, useState } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { AgenteService } from "@/app/service/AgenteService";
import TaskBoard from "./TaskBoard";

type TareasPageShellProps = {
  title: string;
  agenteFijo?: string;
};

export default function TareasPageShell({ title, agenteFijo = "" }: TareasPageShellProps) {
  const [agenteId, setAgenteId] = useState(agenteFijo);

  useEffect(() => {
    if (agenteFijo) {
      setAgenteId(agenteFijo);
      return;
    }

    let payload: any = {};
    try {
      payload = JSON.parse(localStorage.getItem("userPayload") || "{}");
    } catch {
      payload = {};
    }

    AgenteService.getAgentes()
      .then((data) => {
        const agentes = Array.isArray(data) ? data : [];
        const current = agentes.find((item) => item.email_agente && item.email_agente === payload?.email) || agentes[0];
        setAgenteId(current?.id_agente || "");
      })
      .catch(() => setAgenteId(""));
  }, [agenteFijo]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal={title} />
      {agenteId ? (
        <TaskBoard agenteId={agenteId} />
      ) : (
        <div className="min-h-screen bg-gray-100 p-6 px-12 text-gray-500">No se ha encontrado un agente para mostrar tareas.</div>
      )}
    </div>
  );
}
