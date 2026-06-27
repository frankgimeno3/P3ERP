"use client";
import { useParams, useRouter } from "next/navigation";
import React, { FC } from "react";
import contenidos from "@/app/contents/contenidosContents.json";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

const MaterialesRevista: FC = () => {
  const params = useParams();
  const router = useRouter();
  const idPublicacion = params?.id as string;

  const contenidoSeleccionados = contenidos.filter(
    (item) => item.id_publicacion === idPublicacion
  );

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  console.log("idPublicacion:", idPublicacion);
  console.log("Coincidencias:", contenidoSeleccionados);

  return (
    <div className="flex flex-col h-full min-h-screen text-gray-600">
      <MiddleNav tituloprincipal={`Contenidos de la publicación ${idPublicacion}`} />

      <div className="bg-gray-100 h-full min-h-screen p-12 text-gray-600">
        <div className="flex flex-row justify-between w-full items-center bg-white rounded">
          <table className="min-w-full">
            <thead className="bg-blue-950 text-white">
              <tr>
                <th className="text-left p-2 font-light w-1/8">Empresa</th>
                <th className="text-left p-2 font-light w-2/8">Especificaciones</th>
                <th className="text-left p-2 font-light w-1/8">Agente</th>
                <th className="text-left p-2 font-light w-1/8">Estado</th>
                <th className="text-left p-2 font-light w-1/8">Deadline material</th>
              </tr>
            </thead>
            <tbody>
              {contenidoSeleccionados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-red-600">
                    ⚠️ No se encontraron contenidos para la publicación{" "}
                    <strong>{idPublicacion}</strong>
                  </td>
                </tr>
              ) : (
                contenidoSeleccionados.map((item, index) => (
                  <tr
                    key={index}
                    onClick={(e) => handleRowClick(e, `/dashboard/produccion/publicaciones/${idPublicacion}/${item.id_contenido}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="p-2 border-b border-gray-200">{item.id_cuenta}</td>
                    <td className="p-2 border-b border-gray-200">
                      {item.especificaciones_contenido}
                    </td>
                    <td className="p-2 border-b border-gray-200">{item.id_agente}</td>
                    <td className="p-2 border-b border-gray-200">{item.estado_contenido}</td>
                    <td className="p-2 border-b border-gray-200">{item.deadline_contenido}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MaterialesRevista;
