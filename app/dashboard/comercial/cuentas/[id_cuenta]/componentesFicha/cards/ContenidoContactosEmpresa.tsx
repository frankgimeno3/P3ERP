'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { FC, useEffect, useState } from 'react';
import { ContactoService } from '@/app/service/ContactoService';

interface Contacto {
  id_contacto: string;
  nombre_completo_contacto: string;
  cargo_contacto?: string;
  email_contacto?: string;
}

interface ContenidoContactosEmpresaProps {
  id_cuenta: string;
}

const ContenidoContactosEmpresa: FC<ContenidoContactosEmpresaProps> = ({ id_cuenta }) => {
  const router = useRouter();
  const [contactosFiltrados, setContactosFiltrados] = useState<Contacto[]>([]);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);
  const [desvincularCuenta, setDesvincularCuenta] = useState(false);
  const [borrarContacto, setBorrarContacto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarContactos = () => {
    ContactoService.getContactos({ id_cuenta })
      .then((data) => setContactosFiltrados(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error('Error fetching contactos de cuenta:', error);
        setContactosFiltrados([]);
      });
  };

  useEffect(() => {
    cargarContactos();
  }, [id_cuenta]);

  useEffect(() => {
    if (!contactoSeleccionado) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarModal();
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [contactoSeleccionado]);

  const abrirModal = (contacto: Contacto) => {
    setContactoSeleccionado(contacto);
    setDesvincularCuenta(false);
    setBorrarContacto(false);
    setError(null);
  };

  const cerrarModal = () => {
    if (procesando) return;
    setContactoSeleccionado(null);
    setDesvincularCuenta(false);
    setBorrarContacto(false);
    setError(null);
  };

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  const confirmarAccion = async () => {
    if (!contactoSeleccionado || (!desvincularCuenta && !borrarContacto)) return;

    try {
      setProcesando(true);
      setError(null);

      if (borrarContacto) {
        await ContactoService.deleteContacto(contactoSeleccionado.id_contacto);
      } else {
        await ContactoService.unlinkContactoFromCuenta(contactoSeleccionado.id_contacto, id_cuenta);
      }

      setContactosFiltrados((prev) =>
        prev.filter((contacto) => contacto.id_contacto !== contactoSeleccionado.id_contacto),
      );
      setContactoSeleccionado(null);
      setDesvincularCuenta(false);
      setBorrarContacto(false);
    } catch (error: any) {
      setError(error?.message || 'No se pudo completar la acción.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold mb-4">Contactos de la Empresa</h2>

        <Link
          href="/dashboard/comercial/contactos/crear"
          className="p-2 px-4 text-sm mb-2 rounded-lg shadow-xl bg-blue-950/80 hover:bg-blue-950/70 text-white cursor-pointer"
        >
          Añadir contacto
        </Link>
      </div>

      {contactosFiltrados.length === 0 ? (
        <p className="text-gray-500">No hay contactos disponibles para esta cuenta.</p>
      ) : (
        <table className="min-w-full">
          <thead className="bg-blue-950/80 text-white">
            <tr>
              <th className="text-left p-2 font-light">Código de contacto</th>
              <th className="text-left p-2 font-light">Nombre y apellidos</th>
              <th className="text-left p-2 font-light">Cargo</th>
              <th className="text-left p-2 font-light">Email principal</th>
              <th className="text-left p-2 font-light">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contactosFiltrados.map((contacto) => (
              <tr
                key={contacto.id_contacto}
                onClick={(e) => handleRowClick(e, `/dashboard/comercial/contactos/${contacto.id_contacto}`)}
                className="border-t border-gray-200 hover:bg-gray-100/30 cursor-pointer"
              >
                <td className="p-2 border-b border-gray-200">{contacto.id_contacto}</td>
                <td className="p-2 border-b border-gray-200">{contacto.nombre_completo_contacto}</td>
                <td className="p-2 border-b border-gray-200">{contacto.cargo_contacto || '-'}</td>
                <td className="p-2 border-b border-gray-200">{contacto.email_contacto || '-'}</td>
                <td className="p-2 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirModal(contacto);
                    }}
                    className="text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded px-3 py-1.5 cursor-pointer"
                  >
                    Desvincular
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {contactoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[520px] p-6 relative">
            <button
              type="button"
              onClick={cerrarModal}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-xl"
              aria-label="Cerrar modal"
            >
              x
            </button>

            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-800 pr-6">
                Deseas desvincular el contacto {contactoSeleccionado.nombre_completo_contacto || contactoSeleccionado.id_contacto} de la cuenta?
              </h2>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={desvincularCuenta}
                  onChange={(e) => setDesvincularCuenta(e.target.checked)}
                  className="h-4 w-4"
                />
                Sí, desvincular de la cuenta
              </label>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={borrarContacto}
                  onChange={(e) => setBorrarContacto(e.target.checked)}
                  className="h-4 w-4"
                />
                Desvincular y borrar contacto
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={procesando}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-60 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarAccion}
                  disabled={procesando || (!desvincularCuenta && !borrarContacto)}
                  className="px-4 py-2 rounded-lg bg-blue-950 text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContenidoContactosEmpresa;
