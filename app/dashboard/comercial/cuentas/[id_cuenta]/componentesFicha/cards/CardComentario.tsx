import React, { FC, useState } from "react";

interface CardComentarioProps {
  autor: string;
  fecha: string;
  contenido: string;
  onModificar: (contenido: string) => void;
  onBorrar: () => void;
}

const CardComentario: FC<CardComentarioProps> = ({
  autor,
  fecha,
  contenido,
  onModificar,
  onBorrar,
}) => {
  const [editando, setEditando] = useState(false);
  const [contenidoEditado, setContenidoEditado] = useState(contenido);

  const cancelarEdicion = () => {
    setContenidoEditado(contenido);
    setEditando(false);
  };

  const modificarComentario = () => {
    if (!contenidoEditado.trim()) return;
    onModificar(contenidoEditado);
    setEditando(false);
  };

  return (
    <div className="flex flex-col gap-4 bg-white border border-gray-100 rounded shadow p-5">
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-row justify-between gap-4 text-sm text-gray-500">
          <p className="font-medium text-gray-700">{autor}</p>
          <p>{fecha}</p>
        </div>

        {editando ? (
          <textarea
            value={contenidoEditado}
            onChange={(e) => setContenidoEditado(e.target.value)}
            className="w-full min-h-28 border border-gray-300 rounded-lg p-3 resize-y focus:outline-none focus:ring focus:ring-blue-400 text-sm"
          />
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">{contenido}</p>
        )}
      </div>

      <div className="flex flex-row justify-end items-center gap-2">
        {editando ? (
          <>
            <button
              onClick={modificarComentario}
              className="text-xs text-white bg-blue-600 hover:bg-blue-700 cursor-pointer rounded px-3 py-1.5"
            >
              Modificar
            </button>
            <button
              onClick={cancelarEdicion}
              className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer rounded px-3 py-1.5"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditando(true)}
              className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer rounded px-3 py-1.5"
            >
              Editar
            </button>
            <button
              onClick={onBorrar}
              className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer rounded px-3 py-1.5"
            >
              Borrar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CardComentario;
