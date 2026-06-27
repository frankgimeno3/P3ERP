"use client";

import React, { FC, useState, useEffect } from "react";
import Link from 'next/link';
import cuentas from "@/app/contents/cuentasContents.json";
import contactos from "@/app/contents/contactsContents.json";
import { InterfazContacto, InterfazCuenta } from "@/app/interfaces/interfaces";
import ChangeContactModal from "./modals/ChangeContactModal";
import SearchAccountModal from "./modals/SearchAccountModal";

interface EditarDatosAnuncianteProps {
  empresaAnunciante: string;
  contactoPropuesta: string;
  contactoActual: InterfazContacto | null;
  setContactoActual: (contacto: InterfazContacto | null) => void;
  isModalOpen: boolean;
  setIsModalOpen: (val: boolean) => void;
  setEmpresaAnunciante?: (id: string) => void;
}

const EditarDatosAnunciante: FC<EditarDatosAnuncianteProps> = ({
  empresaAnunciante,
  contactoPropuesta,
  contactoActual,
  setContactoActual,
  isModalOpen,
  setIsModalOpen,
  setEmpresaAnunciante,
}) => {
  const [isSearchAccountModalOpen, setIsSearchAccountModalOpen] = useState(false);
  const [currentAccountId, setCurrentAccountId] = useState(empresaAnunciante);

  const cuentasData = cuentas as InterfazCuenta[];
  const contactosData = contactos as InterfazContacto[];

  // Sincronizar currentAccountId cuando cambia empresaAnunciante
  useEffect(() => {
    setCurrentAccountId(empresaAnunciante);
  }, [empresaAnunciante]);

  const cuentaSeleccionada = cuentasData.find(
    (c) => c.id_cuenta === currentAccountId
  );

  // Actualizar contactos cuando cambia la cuenta
  useEffect(() => {
    if (cuentaSeleccionada) {
      const contactosDeCuenta = cuentaSeleccionada.array_contactos_cuenta
        .map((contactoCuenta) =>
          contactosData.find((c) => c.id_contacto === contactoCuenta.id_contacto)
        )
        .filter(Boolean) as InterfazContacto[];

      if (contactosDeCuenta.length > 0) {
        // Si hay contactos, verificar si el contacto actual pertenece a esta cuenta
        const contactoExistente = contactosDeCuenta.find(
          (c) => c.id_contacto === contactoActual?.id_contacto
        );
        // Solo actualizar si el contacto actual no pertenece a esta cuenta
        if (!contactoExistente) {
          setContactoActual(contactosDeCuenta[0]);
        }
      } else {
        // Si no hay contactos, establecer null
        setContactoActual(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccountId]);

  if (!cuentaSeleccionada) {
    return <div className="text-red-500 p-6">Propuesta no encontrada.</div>;
  }

  const handleSelectContact = (idContacto: string) => {
    const nuevoContacto = contactosData.find((c) => c.id_contacto === idContacto);
    if (nuevoContacto) setContactoActual(nuevoContacto as InterfazContacto);
  };

  const handleSelectAccount = (accountId: string) => {
    setCurrentAccountId(accountId);
    if (setEmpresaAnunciante) {
      setEmpresaAnunciante(accountId);
    }
  };

  // Obtener contactos de la cuenta actual
  const contactosDeCuenta = cuentaSeleccionada.array_contactos_cuenta
    .map((contactoCuenta) =>
      contactosData.find((c) => c.id_contacto === contactoCuenta.id_contacto)
    )
    .filter(Boolean) as InterfazContacto[];

  // Verificar si hay contactos disponibles o si hay un contacto manual
  const tieneContactos = contactosDeCuenta.length > 0 || (contactoActual && !contactoActual.id_contacto);

  return (
    <>
      <table className="w-full border shadow-xs border-gray-100 text-center text-sm">
        <thead>
          <tr className="bg-blue-950/80 text-white">
            <th className="px-6 py-2">Empresa anunciante</th>
            <th className="px-4 py-2">Código CRM</th>
            <th className="px-4 py-2">País</th>
            <th className="px-4 py-2">Contacto de gestión</th>
            <th className="px-4 py-2">Cargo del contacto</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white text-gray-700">
            <td className="px-4 py-2">
              <Link
                href={`/dashboard/clientes/cuentas/${cuentaSeleccionada.id_cuenta}`}
                className="bg-blue-950/80 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900"
              >
                {cuentaSeleccionada.nombre_empresa}
              </Link>
            </td>
            <td className="px-4 py-2 flex items-center justify-center gap-2">
              {cuentaSeleccionada.id_cuenta}
              <button
                className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                onClick={() => setIsSearchAccountModalOpen(true)}
                title="Buscar cuenta"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600 cursor-pointer bg-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <line
                    x1="21"
                    y1="21"
                    x2="16.65"
                    y2="16.65"
                    strokeWidth="2"
                  />
                </svg>
              </button>
            </td>
            <td className="px-4 py-2">{cuentaSeleccionada.pais_cuenta}</td>
            <td className="px-4 py-2 flex items-center justify-center gap-2">
              {tieneContactos || contactoActual ? (
                <>
                  {contactoActual?.id_contacto ? (
                    <Link
                      href={`/dashboard/clientes/contactos/${contactoActual.id_contacto}`}
                      className="bg-blue-950/80 text-gray-100 p-2 px-4 rounded-lg shadow-xl cursor-pointer hover:bg-blue-900"
                    >
                      {contactoActual?.nombre_completo_contacto || contactoActual?.nombre_contacto || "Sin contacto"}
                    </Link>
                  ) : (
                    <span className="bg-blue-950/80 text-gray-100 p-2 px-4 rounded-lg shadow-xl">
                      {contactoActual?.nombre_completo_contacto || contactoActual?.nombre_contacto || "Sin contacto"}
                    </span>
                  )}
                  <button
                    className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                    onClick={() => setIsModalOpen(true)}
                    title="Cambiar contacto"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-600 cursor-pointer bg-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <circle cx="11" cy="11" r="8" strokeWidth="2" />
                      <line
                        x1="21"
                        y1="21"
                        x2="16.65"
                        y2="16.65"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                </>
              ) : (
                <span className="text-gray-500">No se encontraron contactos</span>
              )}
            </td>
            <td className="px-4 py-2">
              {tieneContactos || contactoActual
                ? (contactoActual?.cargo_contacto || "")
                : "No se encontraron contactos"}
            </td>
          </tr>
        </tbody>
      </table>

       {isModalOpen && (
        <ChangeContactModal
          cuentaSeleccionada={cuentaSeleccionada}
          onClose={() => setIsModalOpen(false)}
          onSelectContact={handleSelectContact}
          onManualNameEntry={(name: string) => {
            // Crear un contacto temporal sin código
            const contactoManual: InterfazContacto = {
              id_contacto: "",
              nombre_contacto: name,
              apellidos_contacto: "",
              nombre_completo_contacto: name,
              id_cuenta: cuentaSeleccionada.id_cuenta,
              nombre_empresa: cuentaSeleccionada.nombre_empresa,
              telefono_contacto: "",
              email_contacto: "",
              cargo_contacto: "",
              idiomas: "",
              conocido_en: "",
              contactado_en_feria: "",
              suscripciones: [],
              otros_datos_interes: "",
              pais_contacto: cuentaSeleccionada.pais_cuenta,
            };
            setContactoActual(contactoManual);
            setIsModalOpen(false);
          }}
        />
      )}

      {isSearchAccountModalOpen && (
        <SearchAccountModal
          currentAccountId={currentAccountId}
          onClose={() => setIsSearchAccountModalOpen(false)}
          onSelectAccount={handleSelectAccount}
        />
      )}
    </>
  );
};

export default EditarDatosAnunciante;
