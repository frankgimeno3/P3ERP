import { InterfazCuenta } from "@/app/interfaces/interfaces";
import React, { useEffect, useState } from "react";

 

interface PopupEmpresaProps {
  isOpen: boolean;
  onClose: () => void;
  empresas: InterfazCuenta[];
  onSelect: (empresa: InterfazCuenta) => void;
}

const PopupEmpresa: React.FC<PopupEmpresaProps> = ({
  isOpen,
  onClose,
  empresas,
  onSelect,
}) => {
  const [busquedaNombre, setBusquedaNombre] = useState("");
  const [busquedaCodigo, setBusquedaCodigo] = useState("");
  const [resultados, setResultados] = useState<InterfazCuenta[] | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleBuscar = () => {
    setCargando(true);
    setResultados(null);
    setTimeout(() => {
      const coincidencias = empresas.filter(
        (e) =>
          e.nombre_empresa.toLowerCase().includes(busquedaNombre.toLowerCase()) ||
          e.id_cuenta.toLowerCase().includes(busquedaCodigo.toLowerCase())
      );
      setResultados(coincidencias);
      setCargando(false);
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-[700px] relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">Buscar empresa</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre"
            value={busquedaNombre}
            onChange={(e) => setBusquedaNombre(e.target.value)}
            className="flex-1 border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Buscar por código"
            value={busquedaCodigo}
            onChange={(e) => setBusquedaCodigo(e.target.value)}
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={handleBuscar}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Buscar
          </button>
        </div>

        <div className="border rounded p-4 h-60 overflow-y-auto">
          {!cargando && resultados === null && (
            <p className="text-gray-500">Busque una empresa por código o nombre.</p>
          )}
          {cargando && <p className="text-gray-500">Cargando resultados...</p>}
          {!cargando && resultados && resultados.length === 0 && (
            <p className="text-gray-500">No se encontraron coincidencias.</p>
          )}
          {!cargando && resultados && resultados.length > 0 && (
            <table className="min-w-full border">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 text-left">Código Empresa</th>
                  <th className="p-2 text-left">Nombre Empresa</th>
                  <th className="p-2 text-left">País</th>
                 </tr>
              </thead>
              <tbody>
                {resultados.map((e, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      onSelect(e);
                      onClose();
                    }}
                  >
                    <td className="p-2 border-t">{e.id_cuenta}</td>
                    <td className="p-2 border-t">{e.nombre_empresa}</td>
                    <td className="p-2 border-t">{e.pais_cuenta}</td>
                   </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PopupEmpresa;
