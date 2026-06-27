'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { FC } from 'react';
import contactos from "@/app/contents/contactsContents.json";
import cuentas from "@/app/contents/cuentasContents.json";

interface ContenidoContactosEmpresaProps {
  id_cuenta: string;
}

const ContenidoContactosEmpresa: FC<ContenidoContactosEmpresaProps> = ({ id_cuenta }) => {
  const router = useRouter();

  const cuentaSeleccionada = cuentas.find((c) => c.id_cuenta === id_cuenta);

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  const idsContactos = cuentaSeleccionada?.array_contactos_cuenta.map(c => c.id_contacto) || [];

  const contactosFiltrados = contactos.filter((c) => idsContactos.includes(c.id_contacto));

  if (!contactosFiltrados || contactosFiltrados.length === 0) {
    return (
      <p className="text-gray-500">
        No hay contactos disponibles para esta cuenta.
      </p>
    );
  }

  return (
    <div className="p-4">
      <div className='flex flex-row justify-between items-center'>
        <h2 className="text-xl font-bold mb-4">Contactos de la Empresa</h2>

        <Link
          href="/dashboard/clientes/contactos/crear"
          className='p-2 px-4 text-sm mb-2 rounded-lg shadow-xl bg-blue-950/80 hover:bg-blue-950/70 text-white cursor-pointer'
        >
          Crear
        </Link>
      </div>
      <table className="min-w-full">
        <thead className="bg-blue-950/80 text-white">
          <tr>
            <th className="text-left p-2 font-light">Código de contacto</th>
            <th className="text-left p-2 font-light">Nombre y apellidos</th>
            <th className="text-left p-2 font-light">Cargo</th>
            <th className="text-left p-2 font-light">Email principal</th>
          </tr>
        </thead>
        <tbody>
          {contactosFiltrados.map((contacto) => (
            <tr
              key={contacto.id_contacto}
              onClick={(e) => handleRowClick(e, `/dashboard/clientes/contactos/${contacto.id_contacto}`)}
              className="border-t border-gray-200 hover:bg-gray-100/30 cursor-pointer"
            >
              <td className="p-2 border-b border-gray-200">
                {contacto.id_contacto}
              </td>
              <td className="p-2 border-b border-gray-200">
                {contacto.nombre_completo_contacto}
              </td>
              <td className="p-2 border-b border-gray-200">
                {contacto.cargo_contacto || '-'}
              </td>
              <td className="p-2 border-b border-gray-200">
                {contacto.email_contacto}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContenidoContactosEmpresa;
