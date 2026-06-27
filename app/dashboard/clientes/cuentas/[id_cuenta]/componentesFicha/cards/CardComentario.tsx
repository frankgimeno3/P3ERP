import React, { FC } from "react";

interface CardComentarioProps {
  autor: string;
  fecha: string;
  contenido: string;
  onEditar: () => void;
  onBorrar: () => void;
}

const CardComentario: FC<CardComentarioProps> = ({
  autor,
  fecha,
  contenido,
  onEditar,
  onBorrar,
}) => {
  return (
    <div className="flex flex-row justify-between bg-white border border-gray-100 rounded shadow p-6">
      <div className="flex flex-5 flex-col w-full">
        <div className="flex flex-row">
          <p className="font-bold pr-1">Autor:</p>
          <p>{autor}</p>
        </div>
        <div className="flex flex-row">
          <p className="font-bold pr-1">Fecha:</p>
          <p>{fecha}</p>
        </div>
        <div className="flex flex-col">
          <p className="font-bold">Contenido:</p>
          <p>{contenido}</p>
        </div>
      </div>

      <div className="flex flex-col flex-1 text-center justify-center items-center gap-3">
        <button
          onClick={onEditar}
          className="text-gray-500 bg-gray-100/30 hover:bg-gray-100/50 cursor-pointer rounded-lg shadow px-5 py-2"
        >
          Editar
        </button>
        <button
          onClick={onBorrar}
          className="text-gray-500 bg-gray-100/30 hover:bg-gray-100/50 cursor-pointer rounded-lg shadow px-5 py-2"
        >
          Borrar
        </button>
      </div>
    </div>
  );
};

export default CardComentario;
