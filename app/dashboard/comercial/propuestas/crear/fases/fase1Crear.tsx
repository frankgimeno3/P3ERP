import React, { FC, useState, useMemo, useEffect } from "react";
import cuentasContents from "@/app/contents/cuentasContents.json";

interface Cuenta {
  id_cuenta: string;
  nombre_empresa: string;
  id_agente: string;
}

interface Fase1CrearProps {
  setFaseCreacionPropuesta: (fase: number) => void;
  setCodigoCliente: (codigo: string) => void;
  codigoCliente: string;
  setSelectedCliente: (cliente: Cuenta | null) => void;
  selectedCliente: Cuenta | null;
}

const Fase1Crear: FC<Fase1CrearProps> = ({
  setFaseCreacionPropuesta,
  setCodigoCliente,
  codigoCliente,
  setSelectedCliente,
  selectedCliente
}) => {
  const [codigoInput, setCodigoInput] = useState(codigoCliente);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;

  // Filtrar cuentas basado en el término de búsqueda
  const filteredCuentas = useMemo(() => {
    if (!searchTerm.trim()) {
      return cuentasContents as Cuenta[];
    }
    
    const term = searchTerm.toLowerCase().trim();
    return (cuentasContents as Cuenta[]).filter((cuenta) => {
      const idMatch = cuenta.id_cuenta.toLowerCase().includes(term);
      const nombreMatch = cuenta.nombre_empresa.toLowerCase().includes(term);
      return idMatch || nombreMatch;
    });
  }, [searchTerm]);

  // Resetear página cuando cambie el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredCuentas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCuentas = filteredCuentas.slice(startIndex, endIndex);

  const handleBuscar = () => {
    setLoading(true);
    setSearchTerm(codigoInput);

    // Simular carga
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const handleSeleccionarCliente = (cliente: Cuenta) => {
    const fullCliente = cuentasContents.find(c => c.id_cuenta === cliente.id_cuenta);
    setSelectedCliente(fullCliente as any);
    setCodigoInput(cliente.id_cuenta);
    setCodigoCliente(cliente.id_cuenta);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="p-4">
      <p className="mb-2">Introduce el código de cliente</p>
      <div className="flex gap-2 items-center mb-4">
        <input
          type="text"
          placeholder="Código de cliente o nombre de empresa aquí"
          className="flex-1 p-2 border rounded-xl text-gray-400"
          value={codigoInput}
          onChange={(e) => setCodigoInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleBuscar();
            }
          }}
        />
        <button
          onClick={handleBuscar}
          className="rounded-xl shadow bg-white text-sm text-gray-500 px-4 py-2 hover:bg-gray-100/50"
        >
          Buscar
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {!loading && (
        <div className="mt-4">
          <div className="mb-2 text-sm text-gray-600">
            {filteredCuentas.length > 0 
              ? `Mostrando ${startIndex + 1}-${Math.min(endIndex, filteredCuentas.length)} de ${filteredCuentas.length} resultados`
              : "No se encontraron resultados"}
          </div>
          
          {filteredCuentas.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-100">
                  <thead>
                    <tr className="bg-blue-950/80 text-white">
                      <th className=" px-4 py-2 text-left">Código</th>
                      <th className=" px-4 py-2 text-left">Nombre Empresa</th>
                      <th className=" px-4 py-2 text-left">ID Agente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCuentas.map((cuenta) => (
                      <tr
                        key={cuenta.id_cuenta}
                        className={`hover:bg-gray-200 cursor-pointer ${
                          selectedCliente?.id_cuenta === cuenta.id_cuenta ? "bg-blue-100" : ""
                        }`}
                        onClick={() => handleSeleccionarCliente(cuenta)}
                      >
                        <td className="border border-gray-300 px-4 py-2">{cuenta.id_cuenta}</td>
                        <td className="border border-gray-300 px-4 py-2">{cuenta.nombre_empresa}</td>
                        <td className="border border-gray-300 px-4 py-2">{cuenta.id_agente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCuentas.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-xl shadow text-sm ${
                      currentPage === 1
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-xl shadow text-sm ${
                      currentPage === totalPages
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Siguiente
                  </button>
                </div>
              )}

              {filteredCuentas.length <= itemsPerPage && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <button
                    disabled
                    className="px-4 py-2 rounded-xl shadow text-sm bg-gray-300 text-gray-500 cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página 1 de 1
                  </span>
                  <button
                    disabled
                    className="px-4 py-2 rounded-xl shadow text-sm bg-gray-300 text-gray-500 cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {selectedCliente && (
        <div className="mt-4">
          <button
            onClick={() => setFaseCreacionPropuesta(2)}
            className="bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600"
          >
            Confirmar y seleccionar persona de contacto
          </button>
        </div>
      )}
    </div>
  );
};

export default Fase1Crear;
