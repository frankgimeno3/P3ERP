import React, { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ArrowIcon: FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const LoggedLeftMenu: FC = () => {
  const pathname = usePathname();

  const [isFichajesOpen, setIsFichajesOpen] = useState(false);
  const [isComercialOpen, setIsComercialOpen] = useState(false);
  const [isClientesOpen, setIsClientesOpen] = useState(false);
  const [isOperacionesOpen, setIsOperacionesOpen] = useState(false);
  const [isProduccionOpen, setIsProduccionOpen] = useState(false);
  const [isAdministracionOpen, setIsAdministracionOpen] = useState(false);

  const isRouteActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setIsFichajesOpen(pathname.startsWith('/dashboard/fichajes'));
    setIsComercialOpen(pathname.startsWith('/dashboard/comercial'));
    setIsClientesOpen(pathname.startsWith('/dashboard/clientes'));
    setIsOperacionesOpen(pathname.startsWith('/dashboard/operaciones'));
    setIsProduccionOpen(pathname.startsWith('/dashboard/produccion'));
    setIsAdministracionOpen(pathname.startsWith('/dashboard/administracion'));
  }, [pathname]);

  const getLinkClassName = (href: string) =>
    `block px-3 py-1.5 text-left rounded w-full transition cursor-pointer ${
      isRouteActive(href)
        ? 'bg-blue-950 text-white shadow-sm'
        : 'hover:bg-blue-950 hover:text-white'
    }`;

  return (
    <div className="flex flex-col min-h-screen w-80 bg-white border-r border-gray-200 p-4 pl-6 shadow-sm text-gray-800" style={{ width: '170px', fontSize: '10px' }}>

      {/* FICHAJES */}
      <div className="mb-4">
        <div
          onClick={() => setIsFichajesOpen(!isFichajesOpen)}
          className="flex justify-between items-center px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition"
        >
          <span>Fichajes</span>
          <ArrowIcon isOpen={isFichajesOpen} />
        </div>
        {isFichajesOpen && (
          <div className="ml-4 mt-2 space-y-2">
            <Link href="/dashboard/fichajes/fichar" className={getLinkClassName('/dashboard/fichajes/fichar')} aria-current={isRouteActive('/dashboard/fichajes/fichar') ? 'page' : undefined}>
              Fichar eventos
            </Link>
            <Link href="/dashboard/fichajes/historial" className={getLinkClassName('/dashboard/fichajes/historial')} aria-current={isRouteActive('/dashboard/fichajes/historial') ? 'page' : undefined}>
              Historial de fichajes
            </Link>
          </div>
        )}
      </div>

      {/* CLIENTES */}
      <div className="mb-4">
        <div
          onClick={() => setIsClientesOpen(!isClientesOpen)}
          className="flex justify-between items-center px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition"
        >
          <span>Clientes</span>
          <ArrowIcon isOpen={isClientesOpen} />
        </div>
        {isClientesOpen && (
          <div className="ml-4 mt-2 space-y-2">
            <Link href="/dashboard/clientes/cuentas" className={getLinkClassName('/dashboard/clientes/cuentas')} aria-current={isRouteActive('/dashboard/clientes/cuentas') ? 'page' : undefined}>
              Cuentas
            </Link>

            <Link href="/dashboard/clientes/contactos" className={getLinkClassName('/dashboard/clientes/contactos')} aria-current={isRouteActive('/dashboard/clientes/contactos') ? 'page' : undefined}>
              Contactos
            </Link>
          </div>
        )}
      </div>

      {/* COMERCIAL */}
      <div className="mb-4">
        <div
          onClick={() => setIsComercialOpen(!isComercialOpen)}
          className="flex justify-between items-center px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition"
        >
          <span>Comercial</span>
          <ArrowIcon isOpen={isComercialOpen} />
        </div>
        {isComercialOpen && (
          <div className="ml-4 mt-2 space-y-2">
            <Link href="/dashboard/comercial/propuestas" className={getLinkClassName('/dashboard/comercial/propuestas')} aria-current={isRouteActive('/dashboard/comercial/propuestas') ? 'page' : undefined}>
              Propuestas
            </Link>
            <Link href="/dashboard/comercial/contratos" className={getLinkClassName('/dashboard/comercial/contratos')} aria-current={isRouteActive('/dashboard/comercial/contratos') ? 'page' : undefined}>
              Mis contratos
            </Link>
          </div>
        )}
      </div>

      {/* PRODUCCION */}
      <div className="mb-4">
        <div
          onClick={() => setIsProduccionOpen(!isProduccionOpen)}
          className="flex justify-between items-center px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition"
        >
          <span>Producción</span>
          <ArrowIcon isOpen={isProduccionOpen} />
        </div>
        {isProduccionOpen && (
          <div className="ml-4 mt-2 space-y-2">
            <Link href="/dashboard/produccion/servicios" className={getLinkClassName('/dashboard/produccion/servicios')} aria-current={isRouteActive('/dashboard/produccion/servicios') ? 'page' : undefined}>
              Servicios
            </Link>
            <Link href="/dashboard/produccion/publicaciones" className={getLinkClassName('/dashboard/produccion/publicaciones')} aria-current={isRouteActive('/dashboard/produccion/publicaciones') ? 'page' : undefined}>
              Contenidos
            </Link>
          </div>
        )}
      </div>

      {/* ADMINISTRACION */}
      <div className="mb-4">
        <div
          onClick={() => setIsAdministracionOpen(!isAdministracionOpen)}
          className="flex justify-between items-center px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition"
        >
          <span>Administración</span>
          <ArrowIcon isOpen={isAdministracionOpen} />
        </div>
        {isAdministracionOpen && (
          <div className="ml-4 mt-2 space-y-2">
            <Link href="/dashboard/administracion/contratos" className={getLinkClassName('/dashboard/administracion/contratos')} aria-current={isRouteActive('/dashboard/administracion/contratos') ? 'page' : undefined}>
              Contratos
            </Link>
          </div>
        )}
      </div>

      {/* OPERACIONES */}
      <div className="mb-4">
        <div
          onClick={() => setIsOperacionesOpen(!isOperacionesOpen)}
          className="flex justify-between items-center px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition"
        >
          <span>Operaciones</span>
          <ArrowIcon isOpen={isOperacionesOpen} />
        </div>
        {isOperacionesOpen && (
          <div className="ml-4 mt-2 space-y-2">
            <Link href="/dashboard/operaciones/fichajes" className={getLinkClassName('/dashboard/operaciones/fichajes')} aria-current={isRouteActive('/dashboard/operaciones/fichajes') ? 'page' : undefined}>
              Gestión de fichajes
            </Link>
            <Link href="/dashboard/operaciones/data" className={getLinkClassName('/dashboard/operaciones/data')} aria-current={isRouteActive('/dashboard/operaciones/data') ? 'page' : undefined}>
              Gestión de BBDD
            </Link>
            <Link href="/dashboard/operaciones/usuariosyroles" className={getLinkClassName('/dashboard/operaciones/usuariosyroles')} aria-current={isRouteActive('/dashboard/operaciones/usuariosyroles') ? 'page' : undefined}>
              Gestión de usuarios y roles
            </Link>
            <Link href="/dashboard/operaciones/eventos" className={getLinkClassName('/dashboard/operaciones/eventos')} aria-current={isRouteActive('/dashboard/operaciones/eventos') ? 'page' : undefined}>
              Registro global de eventos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoggedLeftMenu;
