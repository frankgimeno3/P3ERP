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

  const [isComercialOpen, setIsComercialOpen] = useState(false);
  const [isOperacionesOpen, setIsOperacionesOpen] = useState(false);
  const [isProduccionOpen, setIsProduccionOpen] = useState(false);
  const [isAdministracionOpen, setIsAdministracionOpen] = useState(false);
  const [isDireccionOpen, setIsDireccionOpen] = useState(false);
  const [isPrevisionesOpen, setIsPrevisionesOpen] = useState(false);
  const [isPrevisionIngresosOpen, setIsPrevisionIngresosOpen] = useState(false);

  const isRouteActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setIsComercialOpen(pathname.startsWith('/dashboard/comercial'));
    setIsOperacionesOpen(pathname.startsWith('/dashboard/operaciones'));
    setIsProduccionOpen(pathname.startsWith('/dashboard/produccion'));
    setIsAdministracionOpen(pathname.startsWith('/dashboard/administracion'));
    setIsDireccionOpen(pathname.startsWith('/dashboard/direccion'));
    setIsPrevisionesOpen(pathname.startsWith('/dashboard/direccion/previsiones'));
    setIsPrevisionIngresosOpen(pathname.startsWith('/dashboard/direccion/previsiones/prevision-ingresos'));
  }, [pathname]);

  const getLinkClassName = (href: string) =>
    `block px-3 py-1.5 text-left rounded w-full transition cursor-pointer ${
      isRouteActive(href)
        ? 'bg-blue-950 text-white shadow-sm'
        : 'hover:bg-blue-950 hover:text-white'
    }`;

  return (
    <div className="flex flex-col min-h-screen w-80 bg-white border-r border-gray-200 p-4 pl-6 shadow-sm text-gray-800" style={{ width: '170px', fontSize: '10px' }}>

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
            <Link href="/dashboard/comercial/cuentas" className={getLinkClassName('/dashboard/comercial/cuentas')} aria-current={isRouteActive('/dashboard/comercial/cuentas') ? 'page' : undefined}>
              Cuentas
            </Link>
            <Link href="/dashboard/comercial/contactos" className={getLinkClassName('/dashboard/comercial/contactos')} aria-current={isRouteActive('/dashboard/comercial/contactos') ? 'page' : undefined}>
              Contactos
            </Link>
            <Link href="/dashboard/comercial/propuestas" className={getLinkClassName('/dashboard/comercial/propuestas')} aria-current={isRouteActive('/dashboard/comercial/propuestas') ? 'page' : undefined}>
              Propuestas
            </Link>
            <Link href="/dashboard/comercial/contratos" className={getLinkClassName('/dashboard/comercial/contratos')} aria-current={isRouteActive('/dashboard/comercial/contratos') ? 'page' : undefined}>
              Contratos
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
            <Link href="/dashboard/produccion/hoja_produccion" className={getLinkClassName('/dashboard/produccion/hoja_produccion')} aria-current={isRouteActive('/dashboard/produccion/hoja_produccion') ? 'page' : undefined}>
              Hoja de producción
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
            <Link href="/dashboard/administracion/control-administrativo" className={getLinkClassName('/dashboard/administracion/control-administrativo')} aria-current={isRouteActive('/dashboard/administracion/control-administrativo') ? 'page' : undefined}>
              Control administrativo
            </Link>
            <Link href="/dashboard/administracion/ferias" className={getLinkClassName('/dashboard/administracion/ferias')} aria-current={isRouteActive('/dashboard/administracion/ferias') ? 'page' : undefined}>
              Ferias
            </Link>
            <Link href="/dashboard/administracion/proveedores" className={getLinkClassName('/dashboard/administracion/proveedores')} aria-current={isRouteActive('/dashboard/administracion/proveedores') ? 'page' : undefined}>
              Proveedores
            </Link>
            <Link href="/dashboard/administracion/tareas-montse" className={getLinkClassName('/dashboard/administracion/tareas-montse')} aria-current={isRouteActive('/dashboard/administracion/tareas-montse') ? 'page' : undefined}>
              Tareas Montse
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
            <Link href="/dashboard/operaciones/data" className={getLinkClassName('/dashboard/operaciones/data')} aria-current={isRouteActive('/dashboard/operaciones/data') ? 'page' : undefined}>
              Gestión de BBDD
            </Link>
            <Link href="/dashboard/operaciones/usuariosyroles" className={getLinkClassName('/dashboard/operaciones/usuariosyroles')} aria-current={isRouteActive('/dashboard/operaciones/usuariosyroles') ? 'page' : undefined}>
              Gestión de usuarios y roles
            </Link>
          </div>
        )}
      </div>

      {/* DIRECCION */}
      <div className="mb-4">
        <div
          onClick={() => setIsDireccionOpen(!isDireccionOpen)}
          className="flex justify-between items-center px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition"
        >
          <span>Dirección</span>
          <ArrowIcon isOpen={isDireccionOpen} />
        </div>
        {isDireccionOpen && (
          <div className="ml-4 mt-2 space-y-2">
            <Link href="/dashboard/direccion/bancos" className={getLinkClassName('/dashboard/direccion/bancos')} aria-current={isRouteActive('/dashboard/direccion/bancos') ? 'page' : undefined}>
              Bancos
            </Link>

            <div>
              <div
                onClick={() => setIsPrevisionesOpen(!isPrevisionesOpen)}
                className="flex justify-between items-center px-3 py-1.5 rounded cursor-pointer transition hover:bg-gray-100"
              >
                <span>Previsiones</span>
                <ArrowIcon isOpen={isPrevisionesOpen} />
              </div>

              {isPrevisionesOpen && (
                <div className="ml-4 mt-2 space-y-2">
                  <Link href="/dashboard/direccion/previsiones/prevision-liquidez" className={getLinkClassName('/dashboard/direccion/previsiones/prevision-liquidez')} aria-current={isRouteActive('/dashboard/direccion/previsiones/prevision-liquidez') ? 'page' : undefined}>
                    Previsión liquidez
                  </Link>

                  <div>
                    <div
                      onClick={() => setIsPrevisionIngresosOpen(!isPrevisionIngresosOpen)}
                      className="flex justify-between items-center px-3 py-1.5 rounded cursor-pointer transition hover:bg-gray-100"
                    >
                      <span>Previsión ingresos</span>
                      <ArrowIcon isOpen={isPrevisionIngresosOpen} />
                    </div>

                    {isPrevisionIngresosOpen && (
                      <div className="ml-4 mt-2 space-y-2">
                        <Link href="/dashboard/direccion/previsiones/prevision-ingresos/prevision-recibos" className={getLinkClassName('/dashboard/direccion/previsiones/prevision-ingresos/prevision-recibos')} aria-current={isRouteActive('/dashboard/direccion/previsiones/prevision-ingresos/prevision-recibos') ? 'page' : undefined}>
                          Previsión recibos
                        </Link>
                        <Link href="/dashboard/direccion/previsiones/prevision-ingresos/prevision-transfers" className={getLinkClassName('/dashboard/direccion/previsiones/prevision-ingresos/prevision-transfers')} aria-current={isRouteActive('/dashboard/direccion/previsiones/prevision-ingresos/prevision-transfers') ? 'page' : undefined}>
                          Previsión transfers
                        </Link>
                      </div>
                    )}
                  </div>

                  <Link href="/dashboard/direccion/previsiones/prevision-gastos" className={getLinkClassName('/dashboard/direccion/previsiones/prevision-gastos')} aria-current={isRouteActive('/dashboard/direccion/previsiones/prevision-gastos') ? 'page' : undefined}>
                    Previsión gastos
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoggedLeftMenu;
