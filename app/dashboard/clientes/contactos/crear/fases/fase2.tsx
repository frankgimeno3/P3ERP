"use client";

import React, { FC, useState } from "react";
import { useRouter } from "next/navigation";
import ModalFase2 from "./fasescomponents/ModalFase2";
import cuentas from "@/app/contents/cuentasContents.json";

interface Cuenta {
  id_cuenta: string;
  nombre_empresa: string;
  pais_cuenta: string;
}

interface Fase2Props {
  setId_Cuenta: React.Dispatch<React.SetStateAction<string>>;
  setCargo: React.Dispatch<React.SetStateAction<string>>;
}

const Fase2: FC<Fase2Props> = ({ setId_Cuenta, setCargo }) => {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargo, setCargoLocal] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<Cuenta[] | null>(null);
  const [seleccionado, setSeleccionado] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  const isFormValid = codigo.trim() !== "" || nombre.trim() !== "";

  const handleBuscar = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!isFormValid) {
      setErrorMessage("Rellena al menos un campo para continuar");
      return;
    }

    setErrorMessage("");
    setModalOpen(true);
    setLoading(true);
    setResultados(null);

    setTimeout(() => {
      const filtradas = cuentas.filter(
        (c) =>
          (codigo && c.id_cuenta.includes(codigo)) ||
          (nombre && c.nombre_empresa.toLowerCase().includes(nombre.toLowerCase()))
      );

      setResultados(filtradas.length > 0 ? filtradas : []);
      setLoading(false);
    }, 2000);
  };

  const handleSeleccionar = (cuenta: Cuenta) => {
    setId_Cuenta(cuenta.id_cuenta);
    setCodigo(cuenta.id_cuenta);
    setNombre(cuenta.nombre_empresa);
    setSeleccionado(true);
    setModalOpen(false);
  };

  const handleCargoChange = (valor: string) => {
    setCargoLocal(valor);
    setCargo(valor);
  };

  return (
    <div className="p-10 px-8 px-56 mb-24 bg-white rounded-2xl shadow-md max-w-5xl mx-auto text-left">
      <h2 className="text-xl font-semibold mb-4 pt-10">
        Selección de cuenta de empresa
      </h2>
      <p className="text-gray-400 text-justify italic pb-5 text-sm">
        A continuación, introduzca nombre o código la empresa a asociar y haga click en "Buscar". Si se encuentran coincidencias, podrá seleccionar la opción elegida.
      </p> 

      <form className="flex flex-col gap-3" onSubmit={handleBuscar}>
        <label className="flex flex-col">
          <p className="text-sm mb-1 flex flex-row">Código de la cuenta {seleccionado && <span className="pl-1">seleccionada</span>}</p>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="border border-gray-200 p-2 rounded-lg pl-4"
            disabled={seleccionado}
          />
        </label>

        <label className="flex flex-col">
          <p className="text-sm mb-1 flex flex-row">Nombre de la cuenta {seleccionado && <span className="pl-1">seleccionada</span>}</p>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border border-gray-200 p-2 rounded-lg pl-4"
            disabled={seleccionado}
          />
        </label>

        {errorMessage && (
          <p className="text-red-300 text-sm">{errorMessage}</p>
        )}

        {!seleccionado ? (
          <button
            type="submit"
            className={`rounded-lg px-4 py-2 mt-5 transition ${isFormValid
              ? 'bg-blue-900 text-white cursor-pointer hover:bg-blue-600'
              : 'bg-blue-900/50 text-white cursor-not-allowed'
              }`}
          >
            Buscar
          </button>
        ) : (
          <>
            <label className="flex flex-col">
              <p className="text-sm">Introduzca el cargo del contacto en la empresa</p>
              <p className="text-xs mb-3 italic text-gray-400">pe: Director de márketing</p>
              <input
                type="text"
                value={cargo}
                onChange={(e) => handleCargoChange(e.target.value)}
                className="border border-gray-200  p-2 rounded-lg"
              />
            </label>

            <button
              onClick={() => router.push("/dashboard/clientes/contactos")}
              className={`rounded-lg px-4 py-2 transition mb-16 ${cargo.trim()
                  ? "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                  : "bg-green-500 text-white opacity-50 cursor-not-allowed"
                }`}
              disabled={!cargo.trim()}
            >
              Ir a la ficha del contacto
            </button>
          </>
        )}
      </form>

      <ModalFase2
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        loading={loading}
        resultados={resultados}
        handleSeleccionar={handleSeleccionar}
        codigoInput={codigo}
        nombreInput={nombre}
      />
    </div>
  );
};

export default Fase2;
