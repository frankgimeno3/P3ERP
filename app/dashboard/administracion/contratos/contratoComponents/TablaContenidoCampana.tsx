import React, { FC } from "react";
import Link from 'next/link';
import { InterfazContrato } from "@/app/interfaces/interfaces";

interface Props {
  contenidos: InterfazContrato['contenido_campana'];
}

const TablaContenidoCampaña: FC<Props> = ({ contenidos }) => {

  return (
    <table className="table-auto border-collapse text-center w-full">
      <thead>
        <tr className="bg-blue-950 text-white">
          <th className="px-4 py-2">Medio</th>
          <th className="px-4 py-2">Publicación</th>
          <th className="px-4 py-2">Producto</th>
          <th className="px-4 py-2">Precio (€)</th>
          <th className="px-4 py-2">Deadline</th>
          <th className="px-4 py-2">Fecha publicación</th>
          <th className="px-4 py-2">Estado material</th>
          <th className="px-4 py-2">Acción</th>
        </tr>
      </thead>
      <tbody>
        {contenidos.map((fila, index) => (
          <tr key={index} className="bg-white text-gray-700">
            <td className="px-4 py-2">{fila.medio}</td>
            <td className="px-4 py-2">{fila.publicacion}</td>
            <td className="px-4 py-2">{fila.producto}</td>
            <td className="px-4 py-2">{fila.precio_producto.toLocaleString()} €</td>
            <td className="px-4 py-2">{fila.deadline_publicacion}</td>
            <td className="px-4 py-2">{fila.fecha_publicacion_publicacion}</td>
            <td className="px-4 py-2">{fila.estado_material_contrato}</td>
            <td className="px-4 py-2">
              {fila.urlcontenido?.startsWith('/') ? (
                <Link
                  href={fila.urlcontenido}
                  className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl hover:bg-blue-900 transition"
                >
                  Ver contenido
                </Link>
              ) : (
                <a
                  href={fila.urlcontenido}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl hover:bg-blue-900 transition"
                >
                  Ver contenido
                </a>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TablaContenidoCampaña;
