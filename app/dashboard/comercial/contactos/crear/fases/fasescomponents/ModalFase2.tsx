"use client";

import React, { FC, useEffect } from "react";

interface Cuenta {
  id_cuenta: string;
  nombre_empresa: string;
  pais_cuenta: string;
}

interface ModalFase2Props {
  modalOpen: boolean;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  resultados: Cuenta[] | null;
  handleSeleccionar: (cuenta: Cuenta) => void;
  codigoInput: string;
  nombreInput: string;
}

const ModalFase2: FC<ModalFase2Props> = ({
  modalOpen,
  setModalOpen,
  loading,
  resultados,
  handleSeleccionar,
  codigoInput,
  nombreInput,
}) => {
 
    useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };

    if (modalOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [modalOpen, setModalOpen]);

  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="relative flex flex-col text-center bg-white border border-gray-100 rounded-2xl shadow-xl p-10 w-[600px] max-w-full">
        <button
          onClick={() => setModalOpen(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer"
        >
          ✕
        </button>

        <p className="text-xl font-bold mb-4">
          {loading
            ? "Buscando cuentas de empresas que coincidan con los parámetros establecidos ..."
            : "Búsqueda completada"}
        </p>

        {codigoInput ? (
          <div className="flex flex-row gap-1 items-center italic text-sm text-gray-500 justify-center mb-4">
            <span>código de cuenta de empresa:</span>
            <span className="font-bold">{codigoInput}</span>
          </div>
        ) : (
          <div className="flex flex-row gap-1 items-center italic text-sm text-gray-500 justify-center mb-4">
            <span>nombre de la empresa:</span>
            <span className="font-bold">{nombreInput}</span>
          </div>
        )}

        {loading ? (
          <p className="text-center">Cargando...</p>
        ) : resultados && resultados.length > 0 ? (
          <div>
            <div className="flex flex-row items-center justify-center py-5 pt-8 text-center gap-4 w-full">
              <h3 className="text-lg font-semibold">Coincidencias encontradas!</h3>
              <p className="text-xs italic text-gray-400">
                (seleccione una opción para continuar)
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-3 py-2">Código Cuenta</th>
                  <th className="px-3 py-2">Nombre Cuenta</th>
                  <th className="px-3 py-2">País</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((c, i) => (
                  <tr
                    key={i}
                    className="text-center cursor-pointer bg-gray-100 hover:bg-gray-50 hover:border hover:border-gray-100"
                    onClick={() => handleSeleccionar(c)}
                  >
                    <td className="px-3 py-2 border border-white">{c.id_cuenta}</td>
                    <td className="px-3 py-2 border border-white">{c.nombre_empresa}</td>
                    <td className="px-3 py-2 border border-white">{c.pais_cuenta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col justify-between text-center">
            <p className="mb-4 italic">No se encontraron coincidencias para estos datos.</p>
            <div className="flex flex-col gap-5 p-12">
              <button className="bg-blue-900 hover:bg-blue-900/70 text-white text-md shadow-lg cursor-pointer rounded-lg px-5 py-3">
                <span className="font-bold">Ir a la ficha del contacto</span> y crear la cuenta de empresa más tarde
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="bg-blue-900 hover:bg-blue-900/70 text-white text-md shadow-lg cursor-pointer rounded-lg px-5 py-3"
              >
                Cancelar, modificar datos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalFase2;
