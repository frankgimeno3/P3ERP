import React, { FC, useEffect, useState } from "react";
import cuentas from "@/app/contents/cuentasContents.json";
import { InterfazCuenta } from "@/app/interfaces/interfaces";

interface SearchAccountModalProps {
  currentAccountId: string;
  onClose: () => void;
  onSelectAccount: (accountId: string) => void;
}

const SearchAccountModal: FC<SearchAccountModalProps> = ({
  currentAccountId,
  onClose,
  onSelectAccount,
}) => {
  const [searchCode, setSearchCode] = useState(currentAccountId);
  const [searchResults, setSearchResults] = useState<InterfazCuenta[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const cuentasData = cuentas as InterfazCuenta[];

  // Cierre con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSearch = () => {
    if (!searchCode.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const results = cuentasData.filter((cuenta) =>
      cuenta.id_cuenta.toLowerCase().includes(searchCode.toLowerCase().trim()) ||
      cuenta.nombre_empresa.toLowerCase().includes(searchCode.toLowerCase().trim())
    );

    setSearchResults(results);
    setHasSearched(true);
  };

  const handleSelectAccount = (accountId: string) => {
    onSelectAccount(accountId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative animate-fadeIn">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Buscar cuenta por código CRM
        </h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Ingrese código CRM o nombre de empresa"
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-950/80 text-white px-6 py-2 rounded-lg hover:bg-blue-900 transition"
          >
            Buscar
          </button>
        </div>

        {hasSearched && (
          <div className="mt-4">
            {searchResults.length > 0 ? (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Código CRM</th>
                      <th className="px-3 py-2 text-left">Nombre Empresa</th>
                      <th className="px-3 py-2 text-left">País</th>
                      <th className="px-3 py-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((cuenta) => (
                      <tr
                        key={cuenta.id_cuenta}
                        className="hover:bg-gray-50 border-t"
                      >
                        <td className="px-3 py-2">{cuenta.id_cuenta}</td>
                        <td className="px-3 py-2">{cuenta.nombre_empresa}</td>
                        <td className="px-3 py-2">{cuenta.pais_cuenta}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleSelectAccount(cuenta.id_cuenta)}
                            className="bg-blue-900 text-white px-3 py-1 rounded-md hover:bg-blue-800 transition"
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No se encontraron coincidencias.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchAccountModal;






