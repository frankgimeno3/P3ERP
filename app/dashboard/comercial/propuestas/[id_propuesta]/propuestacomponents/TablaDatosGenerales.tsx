import { InterfazAgente, InterfazPropuesta } from '@/app/interfaces/interfaces';
import React, { FC, useEffect, useState } from 'react';
import agentes from "@/app/contents/agentesContents.json"

interface TablaDatosGeneralesProps {
    propuesta:InterfazPropuesta
}

const TablaDatosGenerales: FC<TablaDatosGeneralesProps> = ({propuesta}) => {

      const [agenteSeleccionado, setAgenteSeleccionado] = useState<InterfazAgente | undefined>(() =>
    agentes.find((a) => a.id_agente === propuesta.id_agente_propuesta)
  );

  useEffect(() => {
    const agente = agentes.find((a) => a.id_agente === propuesta.id_agente_propuesta);
    setAgenteSeleccionado(agente);
  }, [propuesta]);
  
    return (
        <table className=" w-full border  shadow-xs border-gray-100  text-center text-sm"  >
            <thead>
                    <tr className="bg-blue-950/80 text-white ">
                    <th className="px-4 py-2">Código propuesta</th>
                    <th className="px-4 py-2 ">Fecha de envío al cliente</th>
                    <th className="px-4 py-2">Agente ofertate</th>
                </tr>
            </thead>
            <tbody>
                <tr className="bg-white text-gray-700">
                    <td className="px-4 py-2">{propuesta.id_propuesta}</td>
                    <td className="px-4 py-2">{propuesta.fecha_envio_propuesta}</td>
                    <td className="px-4 py-2">{agenteSeleccionado?.nombre_completo_agente}</td>
                </tr>
            </tbody>
        </table>);
};

export default TablaDatosGenerales;