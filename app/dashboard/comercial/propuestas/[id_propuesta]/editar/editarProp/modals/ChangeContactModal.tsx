import React, { FC, useEffect, useState } from "react";
import contactos from "@/app/contents/contactsContents.json";
import { InterfazCuenta } from "@/app/interfaces/interfaces";

interface ChangeContactModalProps {
  cuentaSeleccionada: InterfazCuenta;
  onClose: () => void;
  onSelectContact: (idContacto: string) => void;
  onManualNameEntry?: (name: string) => void;
}

const ChangeContactModal: FC<ChangeContactModalProps> = ({
  cuentaSeleccionada,
  onClose,
  onSelectContact,
  onManualNameEntry,
}) => {
  const [manualName, setManualName] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // 🔹 Cierre con tecla ESC
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

  if (!cuentaSeleccionada) return null;

  const contactosDeCuenta = cuentaSeleccionada.array_contactos_cuenta
    .map((contactoCuenta) =>
      contactos.find((c: any) => c.id_contacto === contactoCuenta.id_contacto)
    )
    .filter(Boolean);

  const handleManualSubmit = () => {
    if (manualName.trim() && onManualNameEntry) {
      onManualNameEntry(manualName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative animate-fadeIn">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {showManualInput ? "Introducir nombre manualmente" : "Seleccione un contacto"}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Empresa: <strong>{cuentaSeleccionada.nombre_empresa}</strong>
        </p>

        {!showManualInput ? (
          <>
            {contactosDeCuenta.length > 0 ? (
              <>
                <table className="w-full border border-gray-200 text-sm rounded-md overflow-hidden mb-4">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Teléfono</th>
                      <th className="px-3 py-2 text-left">Cargo</th>
                      <th className="px-3 py-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactosDeCuenta.map((contacto: any) => (
                      <tr
                        key={contacto.id_contacto}
                        className="hover:bg-gray-50 border-t"
                      >
                        <td className="px-3 py-2">{contacto.nombre_completo_contacto || contacto.nombre_contacto}</td>
                        <td className="px-3 py-2">{contacto.email_contacto}</td>
                        <td className="px-3 py-2">{contacto.telefono_contacto}</td>
                        <td className="px-3 py-2">{contacto.cargo_contacto}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              onSelectContact(contacto.id_contacto);
                              onClose();
                            }}
                            className="bg-blue-900 text-white px-3 py-1 rounded-md hover:bg-blue-800 transition"
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t pt-4">
                  <button
                    onClick={() => setShowManualInput(true)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    O introducir nombre manualmente
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-500 mb-4">No hay contactos disponibles.</p>
                <div className="border-t pt-4">
                  <button
                    onClick={() => setShowManualInput(true)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Introducir nombre manualmente
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del contacto
              </label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualName.trim()) {
                    handleManualSubmit();
                  }
                }}
                placeholder="Ingrese el nombre del contacto"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setManualName("");
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Volver
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={!manualName.trim()}
                className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
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

export default ChangeContactModal;
