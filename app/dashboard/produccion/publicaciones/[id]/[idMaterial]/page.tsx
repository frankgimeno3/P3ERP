"use client";
import { useParams } from "next/navigation";
import React, { FC, useState } from "react";
import data from "@/app/contents/contenidosContents.json";
import BotonFlotante from "@/app/general_components/componentes_recurrentes/BotonFlotante";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";


interface ContenidoEnRevistaProps {}

const ContenidoEnRevista: FC<ContenidoEnRevistaProps> = () => {
  const params = useParams<{ id: string; idMaterial: string }>();
  const idContenidoURL = params.idMaterial;

  const contenido = data.find((item) => item.id_contenido === idContenidoURL);

  if (!contenido) {
    return <div className="p-12 text-red-600">No se encontró el contenido</div>;
  }

  const estadosDisponibles = [
    "Pendiente de solicitar",
    "Entregado",
    "En revisión",
    "Pendiente",
    "En redacción",
    "Ya en revista",
  ];

  const estadoOriginal = contenido.estado_contenido;
  const [estado, setEstado] = useState(estadoOriginal);

  return (
      <div className="bg-gray-100 min-h-screen text-gray-700">
      <MiddleNav tituloprincipal={`Detalle del contenido ${contenido.id_contenido}`} />
        <div className="bg-white rounded shadow m-6   p-12 ">
          <div>
            <strong>Publicación:</strong> {contenido.id_publicacion}
          </div>
          <div>
            <strong>Empresa:</strong> {contenido.id_cuenta}
          </div>
          <div>
            <strong>Especificaciones:</strong> {contenido.especificaciones_contenido}
          </div>
          <div>
            <strong>Agente:</strong> {contenido.id_agente}
          </div>
          <div>
            <strong>Deadline:</strong> {contenido.deadline_contenido}
          </div>
          <div>
            <strong>Estado:</strong>
            <select
              className="ml-2 border rounded px-2 py-1"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              {estadosDisponibles.map((op, idx) => (
                <option key={idx} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        </div>
               <BotonFlotante isContenidoEdited={estado !== estadoOriginal} />
      </div>

   );
};

export default ContenidoEnRevista;
