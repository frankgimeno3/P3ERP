import { InterfazPropuesta } from '@/app/interfaces/interfaces';
import React, { FC } from 'react';

interface Props {
  propuesta: InterfazPropuesta;
}
export const TablaContenidoPropuesta: FC<Props> = ({ propuesta }) => {

  const total_antes_descuento = propuesta.contenido_propuesta
    .reduce((acc, fila) => acc + Number(fila.precio_unitario || 0), 0)
    .toFixed(2);

  return (
    <>
      <table className="w-full border shadow-xs border-gray-100 text-center text-sm">
        <thead>
          <tr className="bg-blue-950/80 text-white">
            <th className="px-4 py-2">Medio</th>
            <th className="px-4 py-2">Publicación</th>
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2">Precio tarifa</th>
            <th className="px-4 py-2">Descuento unitario</th>
            <th className="px-4 py-2">Precio unitario</th>
          </tr>
        </thead>
        <tbody>
          {propuesta.contenido_propuesta.map((fila, index) => (
            <tr key={index} className="bg-white text-gray-700">
              <td className="px-4 py-2">{fila.medio}</td>
              <td className="px-4 py-2">{fila.publicacion}</td>
              <td className="px-4 py-2">{fila.producto}</td>
              <td className="px-4 py-2">{fila.precio_tarifa}€</td>
              <td className="px-4 py-2">{fila.descuento_producto}€</td>
              <td className="px-4 py-2">{fila.precio_unitario}€</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-row w-full mb-1">
        <div className="flex flex-row bg-blue-950 text-white px-5 w-full text-sm p-3 border-b border-gray-200 justify-end">
          <p className="font-bold">Total ofertado antes de descuento</p>
        </div>
        <div className="flex flex-row bg-white text-gray-600 px-5 w-75 text-sm border-y border-gray-100 items-center text-center">
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
              <p>- {propuesta.descuento_final_propuesta} €</p>
            </div>
          </div>

          <div className="flex flex-row w-full h-12">
            <div className="flex flex-row bg-blue-950 text-white px-5 w-2/4 text-sm py-1 border-b border-gray-200 items-center">
              <p>Base imponible</p>
            </div>
            <div className="flex flex-row bg-white text-gray-600 px-5 w-full border-y border-gray-100 items-center text-sm">
              <p>{propuesta.importe_total_BI_propuesta} €</p>
            </div>
          </div>

          <div className="flex flex-row w-full h-12">
            <div className="flex flex-row bg-blue-950 text-white px-5 w-2/4 text-sm py-1 border-b border-gray-200 items-center">
              <p>Precio final</p>
            </div>
            <div className="flex flex-row bg-white text-gray-600 px-5 w-full border-y border-gray-100 items-center text-sm">
              <p>{propuesta.importe_propuesta_con_iva} €</p>
            </div>
          </div>
        </div>
      </div>

    </>
  );
};
