import React, { FC, useState, useMemo, useEffect } from "react";
import contactsContents from "@/app/contents/contactsContents.json";

interface Contacto {
  id_contacto: string;
  nombre_completo_contacto: string;
  id_cuenta: string;
  nombre_empresa: string;
}

interface ContactoPersonalizado {
  nombre_completo: string;
  email: string;
}

interface Fase2CrearProps {
  setFaseCreacionPropuesta: (fase: number) => void;
  setCodigoContactoAnunciante: (codigo: string) => void;
  setCodigoContactoFirmante: (codigo: string) => void;
  codigoCliente: string;
  contactoAnunciante: string;
  contactoFirmante: string;
  contactoPersonalizado: ContactoPersonalizado | null;
  setContactoPersonalizado: (contacto: ContactoPersonalizado | null) => void;
}

const Fase2Crear: FC<Fase2CrearProps> = ({
  setFaseCreacionPropuesta,
  setCodigoContactoAnunciante,
  setCodigoContactoFirmante,
  codigoCliente,
  contactoAnunciante,
  contactoFirmante,
  contactoPersonalizado,
  setContactoPersonalizado,
}) => {
  // Estados Contacto Anunciante
  const [modoAnunciante, setModoAnunciante] = useState<"porcodigo" | "pornombre">("porcodigo");
  const [inputAnunciante, setInputAnunciante] = useState("");
  const [selectedCodigoAnunciante, setSelectedCodigoAnunciante] = useState(contactoAnunciante);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContacto, setSelectedContacto] = useState<Contacto | null>(null);
  const [usarContactoPersonalizado, setUsarContactoPersonalizado] = useState(false);
  const [nombrePersonalizado, setNombrePersonalizado] = useState(contactoPersonalizado?.nombre_completo || "");
  const [emailPersonalizado, setEmailPersonalizado] = useState(contactoPersonalizado?.email || "");

  const itemsPerPage = 20;

  // Filtrar contactos por id_cuenta primero, luego por término de búsqueda
  const filteredContactos = useMemo(() => {
    // Primero filtrar por id_cuenta
    let contactosPorCuenta = (contactsContents as Contacto[]).filter(
      (contacto) => contacto.id_cuenta === codigoCliente
    );

    // Si no hay término de búsqueda, devolver todos los de la cuenta
    if (!searchTerm.trim()) {
      return contactosPorCuenta;
    }
    
    // Filtrar por término de búsqueda
    const term = searchTerm.toLowerCase().trim();
    return contactosPorCuenta.filter((contacto) => {
      if (modoAnunciante === "porcodigo") {
        return contacto.id_contacto.toLowerCase().includes(term);
      } else {
        return contacto.nombre_completo_contacto.toLowerCase().includes(term);
      }
    });
  }, [searchTerm, modoAnunciante, codigoCliente]);

  // Resetear página cuando cambie el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredContactos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContactos = filteredContactos.slice(startIndex, endIndex);

  const handleBuscar = () => {
    setLoading(true);
    setSearchTerm(inputAnunciante);

    // Simular carga
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const handleSeleccionar = (contacto: Contacto) => {
    setSelectedContacto(contacto);
    setSelectedCodigoAnunciante(contacto.id_contacto);
    setInputAnunciante(contacto.id_contacto);
    setCodigoContactoAnunciante(contacto.id_contacto);
    // También establecer el firmante como el mismo contacto
    setCodigoContactoFirmante(contacto.id_contacto);
    setUsarContactoPersonalizado(false);
    setContactoPersonalizado(null);
  };

  const handleContactoPersonalizado = () => {
    if (nombrePersonalizado.trim() && emailPersonalizado.trim()) {
      const contacto: ContactoPersonalizado = {
        nombre_completo: nombrePersonalizado.trim(),
        email: emailPersonalizado.trim()
      };
      setContactoPersonalizado(contacto);
      setCodigoContactoAnunciante("personalizado");
      setCodigoContactoFirmante("personalizado");
      setSelectedCodigoAnunciante("personalizado");
      setUsarContactoPersonalizado(true);
    }
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

  const canConfirmar = () => {
    if (usarContactoPersonalizado) {
      return nombrePersonalizado.trim() !== "" && emailPersonalizado.trim() !== "";
    }
    return !!selectedCodigoAnunciante;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Botón Volver */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setFaseCreacionPropuesta(1)}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400"
        >
          ← Volver a Fase 1
        </button>
      </div>

      {/* Contacto Anunciante */}
      <div className="border p-4 rounded-xl space-y-2">
        <div className="flex justify-between items-center">
          <p>Contacto de la empresa anunciante</p>
          {/* Toggle tipo interruptor con etiquetas */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Código</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={modoAnunciante === "pornombre"}
                onChange={() =>
                  setModoAnunciante(modoAnunciante === "porcodigo" ? "pornombre" : "porcodigo")
                }
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full transition-colors peer-checked:bg-blue-600"></div>
              <div
                className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  modoAnunciante === "pornombre" ? "translate-x-5" : ""
                }`}
              ></div>
            </label>
            <span className="text-gray-400 text-sm">Nombre</span>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={modoAnunciante === "porcodigo" ? " | código del contacto aquí" : " | nombre y apellidos del contacto aquí"}
            className="flex-1 p-2 border rounded-xl text-gray-200 placeholder:text-gray-400 placeholder:text-sm"
            value={inputAnunciante}
            onChange={(e) => setInputAnunciante(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleBuscar();
              }
            }}
            disabled={usarContactoPersonalizado}
          />
          <button
            className="rounded-xl shadow bg-white text-sm text-gray-500 px-4 py-2 hover:bg-gray-100/50 disabled:opacity-50"
            onClick={handleBuscar}
            disabled={usarContactoPersonalizado}
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Opción de contacto personalizado */}
      <div className="border p-4 rounded-xl space-y-2">
        <div className="flex justify-between items-center mb-2">
          <p>O introducir contacto personalizado</p>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={usarContactoPersonalizado}
              onChange={(e) => {
                setUsarContactoPersonalizado(e.target.checked);
                if (!e.target.checked) {
                  setContactoPersonalizado(null);
                  setSelectedCodigoAnunciante("");
                }
              }}
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full transition-colors peer-checked:bg-blue-600"></div>
            <div
              className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                usarContactoPersonalizado ? "translate-x-5" : ""
              }`}
            ></div>
          </label>
        </div>
        {usarContactoPersonalizado && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nombre completo"
              className="w-full p-2 border rounded-xl text-gray-200 placeholder:text-gray-400 placeholder:text-sm"
              value={nombrePersonalizado}
              onChange={(e) => setNombrePersonalizado(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full p-2 border rounded-xl text-gray-200 placeholder:text-gray-400 placeholder:text-sm"
              value={emailPersonalizado}
              onChange={(e) => setEmailPersonalizado(e.target.value)}
            />
            <button
              className="rounded-xl shadow bg-blue-500 text-white text-sm px-4 py-2 hover:bg-blue-600"
              onClick={handleContactoPersonalizado}
            >
              Confirmar contacto personalizado
            </button>
          </div>
        )}
      </div>

      {/* Tabla de resultados */}
      {!usarContactoPersonalizado && (
        <>
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}

          {!loading && (
            <div className="mt-4">
              {filteredContactos.length === 0 ? (
                <div className="border border-gray-300 rounded-xl p-8 text-center">
                  <p className="text-gray-600 mb-4">No se encontraron contactos para esta cuenta.</p>
                  <p className="text-sm text-gray-500">Puede usar la opción de contacto personalizado arriba.</p>
                </div>
              ) : (
                <>
                  <div className="mb-2 text-sm text-gray-600">
                    {`Mostrando ${startIndex + 1}-${Math.min(endIndex, filteredContactos.length)} de ${filteredContactos.length} resultados`}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse ">
                      <thead>
                        <tr className="bg-blue-950/80 text-white">
                          <th className="px-4 py-2 text-left">Código de contacto</th>
                          <th className="px-4 py-2 text-left">Nombre de contacto</th>
                          <th className="px-4 py-2 text-left">Código empresa</th>
                          <th className="px-4 py-2 text-left">Nombre empresa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedContactos.map((contacto) => (
                          <tr
                            key={contacto.id_contacto}
                            className={`hover:bg-gray-200 cursor-pointer ${
                              selectedContacto?.id_contacto === contacto.id_contacto ? "bg-blue-100" : ""
                            }`}
                            onClick={() => handleSeleccionar(contacto)}
                          >
                            <td className="border border-gray-300 px-4 py-2">{contacto.id_contacto}</td>
                            <td className="border border-gray-300 px-4 py-2">{contacto.nombre_completo_contacto}</td>
                            <td className="border border-gray-300 px-4 py-2">{contacto.id_cuenta}</td>
                            <td className="border border-gray-300 px-4 py-2">{contacto.nombre_empresa}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredContactos.length > itemsPerPage && (
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

                  {filteredContactos.length <= itemsPerPage && filteredContactos.length > 0 && (
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
        </>
      )}

      {/* Botón Confirmar */}
      <div>
        <button
          disabled={!canConfirmar()}
          className={`bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600 ${
            !canConfirmar() ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={() => setFaseCreacionPropuesta(3)}
        >
          Confirmar y agregar productos
        </button>
      </div>
    </div>
  );
};

export default Fase2Crear;
