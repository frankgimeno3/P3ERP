import React, { FC } from "react";
import Link from 'next/link';
import { InterfazContrato } from "@/app/interfaces/interfaces";

interface TablaContenidoCampañaProps {
  contrato: InterfazContrato;
}

const TablaContenidoCampaña: FC<TablaContenidoCampañaProps> = ({ contrato }) => {
  const contenido_campana = contrato.contenido_campana;

  const total_antes_descuento = contenido_campana.reduce(
    (acc, fila) => acc + (Number(fila.precio_producto) || 0),
    0
  );

  return (
    <>
      <table className="table-auto border-collapse text-center w-full">
        <thead>
          <tr className="bg-blue-950 text-white">
            <th className="px-4 py-2">Medio</th>
            <th className="px-4 py-2">Publicación</th>
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2">Deadline material</th>
            <th className="px-4 py-2">Fecha de publicación</th>
            <th className="px-4 py-2">Estado del material</th>
            <th className="px-4 py-2">Ficha completa contenido</th>
            <th className="px-4 py-2">Precio unitario</th>
          </tr>
        </thead>
        <tbody>
          {contenido_campana.map((fila, index) => (
            <tr key={index} className="bg-white text-gray-700">
              <td className="px-4 py-2">{fila.medio}</td>
              <td className="px-4 py-2">{fila.publicacion}</td>
              <td className="px-4 py-2">{fila.producto}</td>
              <td className="px-4 py-2">{fila.deadline_publicacion}</td>
              <td className="px-4 py-2">{fila.fecha_publicacion_publicacion}</td>
              <td className="px-4 py-2">{fila.estado_material_contrato}</td>
              <td className="px-4 py-2">
                {fila.urlcontenido?.startsWith('/') ? (
                  <Link
                    href={fila.urlcontenido}
                    className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900 text-sm"
                  >
                    Ver
                  </Link>
                ) : (
                  <a
                    href={fila.urlcontenido}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-950 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900 text-sm"
                  >
                    Ver
                  </a>
                )}
              </td>
              <td className="px-4 py-2">{fila.precio_producto} €</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-row w-full mb-1">
        <div className="flex flex-row bg-blue-950 text-white px-5 w-full text-sm p-3 border-b border-gray-200 justify-end">
          <p className="font-bold">Total ofertado antes de descuento</p>
        </div>
        <div className="flex flex-row bg-white text-gray-600 px-5 w-1/8 border-y border-gray-100 items-center text-center">
          <p className="pl-2 mx-auto">{total_antes_descuento} €</p>
        </div>
      </div>

      <div className="w-full flex flex-row">
        <div className="flex flex-col flex-1">
          <div className="flex flex-row w-full h-12">
            <div className="flex flex-row bg-blue-950 text-white px-5 w-2/4 text-sm py-1 border-b border-gray-200 items-center">
              <p>Descuento total</p>
            </div>
            <div className="flex flex-row bg-white text-gray-600 px-5 w-full border-y border-gray-100 items-center text-sm">
              <p>- {contrato.descuento_final_contrato} €</p>
            </div>
          </div>

          <div className="flex flex-row w-full h-12">
            <div className="flex flex-row bg-blue-950 text-white px-5 w-2/4 text-sm py-1 border-b border-gray-200 items-center">
              <p>Base imponible</p>
            </div>
            <div className="flex flex-row bg-white text-gray-600 px-5 w-full border-y border-gray-100 items-center text-sm">
              <p>{contrato.importe_total_BI_contrato} €</p>
            </div>
          </div>

          <div className="flex flex-row w-full h-12">
            <div className="flex flex-row bg-blue-950 text-white px-5 w-2/4 text-sm py-1 border-b border-gray-200 items-center">
              <p>Precio final</p>
            </div>
            <div className="flex flex-row bg-white text-gray-600 px-5 w-full border-y border-gray-100 items-center text-sm">
              <p>{contrato.importe_contrato_con_iva} €</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1">
          <div className="flex flex-row w-full h-12">
            <div className="flex flex-row bg-blue-950 text-white px-5 w-2/4 text-sm py-1 border-b border-gray-200 items-center">
              <p>Forma de cobro</p>
            </div>
            <div className="flex flex-row bg-white text-gray-600 px-5 w-full border-y border-gray-100 items-center text-sm">
              <p>{contrato.forma_cobro_contrato}</p>
            </div>
          </div>

          <div className="flex flex-row w-full h-12">
            <div className="flex flex-row bg-blue-950 text-white px-5 w-2/4 text-sm py-1 border-b border-gray-200 items-center">
              <p>Términos de pago</p>
            </div>
            <div className="flex flex-row bg-white text-gray-600 px-5 w-full border-y border-gray-100 items-center text-sm">
              <p>{contrato.fecha_cobro_prevista_contrato}</p>
            </div>
          </div>

          <div className="flex flex-row w-full h-12">
            <div className="flex flex-row bg-blue-950 text-white px-5 w-2/4 text-sm py-1 border-b border-gray-200 items-center">
              <p>Número de pagos</p>
            </div>
            <div className="flex flex-row bg-white text-gray-600 px-5 w-full border-y border-gray-100 items-center text-sm">
              <p>{contrato.array_ordenes_cobro.length}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TablaContenidoCampaña;
