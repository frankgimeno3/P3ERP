import React, { FC, useState } from "react";
import empresasJSON from "@/app/contents/cuentasContents.json";
import { InterfazContacto, InterfazCuenta } from "@/app/interfaces/interfaces";
import PopupEmpresa from "./PopupEmpresa";

interface DatosEmpresaContactoProps {
  contacto: InterfazContacto;
  setContactoEditable: React.Dispatch<React.SetStateAction<InterfazContacto | undefined>>;
  onChange: () => void;
}

const DatosEmpresaContacto: FC<DatosEmpresaContactoProps> = ({
  contacto,
  setContactoEditable,
  onChange,
}) => {

   const empresas: InterfazCuenta[] = empresasJSON.map((e: any) => ({
    id_cuenta: e.id_cuenta || "",
    nombre_empresa: e.nombre_empresa || "",
    pais_cuenta: e.pais_cuenta || "",
    id_agente: e.id_agente || "",
    descripcion_cuenta: e.descripcion_cuenta || "",
    actividades_cuenta: e.actividades_cuenta || "",
    presente_en_qq: e.presente_en_qq || false,
    fuente_novedades_cuenta: e.fuente_novedades_cuenta || "",
    datos_comerciales: {
      ciudad_principal_cuenta: e.datos_comerciales?.ciudad_principal_cuenta || "",
      telefono_principal_cuenta: e.datos_comerciales?.telefono_principal_cuenta || "",
      categoria_principal_cuenta: e.datos_comerciales?.categoria_principal_cuenta || "",
      contacto_principal: e.datos_comerciales?.contacto_principal || "",  
      resumen_actividad_cuenta: e.datos_comerciales?.resumen_actividad_cuenta || "",
    },
    array_direcciones_cuenta: e.array_direcciones_cuenta?.length
      ? e.array_direcciones_cuenta
      : [
          {
            nombre_direccion: "",
            pais_direccion: "",
            region_direccion: "",
            ciudad_direccion: "",
            codigo_postal: "",
            direccion_completa: "",
            telefono_direccion: "",
            descripcion_direccion: "",
          },
        ],
    array_contactos_cuenta: e.array_contactos_cuenta?.length
      ? e.array_contactos_cuenta
      : [{ id_contacto: "" }],
    array_comentarios_cuenta: e.array_comentarios_cuenta || [],
  }));

  const [empresaSeleccionada, setEmpresaSeleccionada] = useState({
    empresa: contacto.id_cuenta || "",
    codigoEmpresa: "",
    cargo: "",
  });

  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Datos asociados a la cuenta</h2>
      <table className="min-w-full">
        <thead className="bg-blue-950/80 text-white">
          <tr>
            <th className="text-left p-2 font-light">Empresa asociada</th>
            <th className="text-left p-2 font-light">Código empresa</th>
            <th className="text-left p-2 font-light">Cargo en la empresa</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-200 hover:bg-gray-100/30">
            <td className="p-2 border-b border-gray-200 w-1/3">
              <span className="cursor-not-allowed">{contacto.nombre_empresa}</span>
            </td>
            <td className="p-2 border-b border-gray-200">
              <div className="flex flex-row items-center">
                  <span
                  className="hover:bg-gray-200 cursor-pointer"
                  onClick={() => setPopupOpen(true)}
                >
                  {contacto.id_cuenta}
                </span>
                <button
                  className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                  onClick={() => setPopupOpen(true)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-600 cursor-pointer"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <circle cx="11" cy="11" r="8" strokeWidth="2" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            </td>
            <td className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={contacto.cargo_contacto}
                onChange={(e) => {
                  setContactoEditable(prev => 
                    prev ? { ...prev, cargo_contacto: e.target.value } : prev
                  );
                  onChange();
                }}
                className="w-full border border-gray-200 rounded p-1"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <PopupEmpresa
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        empresas={empresas}
        onSelect={(e) => {
          setEmpresaSeleccionada({
            ...empresaSeleccionada,
            empresa: e.nombre_empresa,
            codigoEmpresa: e.id_cuenta,
          });
          setContactoEditable(prev => 
            prev ? { 
              ...prev, 
              id_cuenta: e.id_cuenta,
              nombre_empresa: e.nombre_empresa
            } : prev
          );
          onChange();
        }}
      />
    </div>
  );
};

export default DatosEmpresaContacto;
