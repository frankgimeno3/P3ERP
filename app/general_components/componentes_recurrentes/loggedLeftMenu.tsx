"use client";

import { useEffect, useState } from "react";
import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function ArrowIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function LoggedLeftMenu() {
  const pathname = usePathname();

  const [isComercialOpen, setIsComercialOpen] = useState(false);
  const [isOperacionesOpen, setIsOperacionesOpen] = useState(false);
  const [isProduccionOpen, setIsProduccionOpen] = useState(false);
  const [isAdministracionOpen, setIsAdministracionOpen] = useState(false);
  const [isAdminClientesOpen, setIsAdminClientesOpen] = useState(false);
  const [isAdminProveedoresOpen, setIsAdminProveedoresOpen] = useState(false);
  const [isDireccionOpen, setIsDireccionOpen] = useState(false);
  const [isPrevisionesOpen, setIsPrevisionesOpen] = useState(false);

  const isRouteActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setIsComercialOpen(pathname.startsWith("/dashboard/comercial"));
    setIsOperacionesOpen(pathname.startsWith("/dashboard/operaciones"));
    setIsProduccionOpen(pathname.startsWith("/dashboard/produccion"));
    setIsAdministracionOpen(pathname.startsWith("/dashboard/administracion"));
    setIsAdminClientesOpen(
      pathname.startsWith("/dashboard/administracion/control-administrativo") ||
      pathname.startsWith("/dashboard/administracion/facturas-clientes") ||
      pathname.startsWith("/dashboard/administracion/pendiente-cobro") ||
      pathname.startsWith("/dashboard/administracion/suscripciones"),
    );
    setIsAdminProveedoresOpen(
      pathname.startsWith("/dashboard/administracion/proveedores") ||
      pathname.startsWith("/dashboard/administracion/facturas-proveedores"),
    );
    setIsDireccionOpen(pathname.startsWith("/dashboard/direccion"));
    setIsPrevisionesOpen(pathname.startsWith("/dashboard/direccion/previsiones"));
  }, [pathname]);

  const getLinkClassName = (href: string) =>
    `block w-full rounded-r-md border-l-2 py-2 pl-5 pr-4 text-left text-sm font-normal uppercase transition-colors ${
      isRouteActive(href)
        ? "border-blue-500 bg-blue-950/40 font-medium text-blue-300"
        : "border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-100"
    }`;

  const sectionClass = "flex cursor-pointer items-center justify-between rounded-r-lg border-l-2 border-transparent py-2 pl-3 pr-3 text-xs font-medium uppercase tracking-wide text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100";
  const childWrapClass = "mt-1 space-y-0.5";

  return (
    <aside className="flex min-h-screen w-[220px] min-w-[220px] shrink-0 flex-col bg-gray-900 py-3 text-gray-300 md:w-[240px] md:min-w-[240px]">
      <div className="mb-2">
        <div onClick={() => setIsComercialOpen(!isComercialOpen)} className={sectionClass}>
          <span>Comercial</span>
          <ArrowIcon isOpen={isComercialOpen} />
        </div>
        {isComercialOpen && (
          <div className={childWrapClass}>
            <MenuLink href="/dashboard/comercial/cuentas" active={isRouteActive} className={getLinkClassName}>Cuentas</MenuLink>
            <MenuLink href="/dashboard/comercial/contactos" active={isRouteActive} className={getLinkClassName}>Contactos</MenuLink>
            <MenuLink href="/dashboard/comercial/propuestas" active={isRouteActive} className={getLinkClassName}>Propuestas</MenuLink>
            <MenuLink href="/dashboard/comercial/contratos" active={isRouteActive} className={getLinkClassName}>Contratos</MenuLink>
            <MenuLink href="/dashboard/comercial/documentacion" active={isRouteActive} className={getLinkClassName}>Documentación</MenuLink>
          </div>
        )}
      </div>

      <div className="mb-2">
        <div onClick={() => setIsProduccionOpen(!isProduccionOpen)} className={sectionClass}>
          <span>Producción</span>
          <ArrowIcon isOpen={isProduccionOpen} />
        </div>
        {isProduccionOpen && (
          <div className={childWrapClass}>
            <MenuLink href="/dashboard/produccion/servicios" active={isRouteActive} className={getLinkClassName}>Servicios</MenuLink>
            <MenuLink href="/dashboard/produccion/hoja_produccion" active={isRouteActive} className={getLinkClassName}>Hoja de producción</MenuLink>
            <MenuLink href="/dashboard/produccion/gestiones_produccion" active={isRouteActive} className={getLinkClassName}>Gestiones de producción</MenuLink>
            <MenuLink href="/dashboard/produccion/publicaciones" active={isRouteActive} className={getLinkClassName}>Publicaciones</MenuLink>
          </div>
        )}
      </div>

      <div className="mb-2">
        <div onClick={() => setIsAdministracionOpen(!isAdministracionOpen)} className={sectionClass}>
          <span>Administración</span>
          <ArrowIcon isOpen={isAdministracionOpen} />
        </div>
        {isAdministracionOpen && (
          <div className={childWrapClass}>
            <MenuLink href="/dashboard/administracion/ferias" active={isRouteActive} className={getLinkClassName}>Ferias</MenuLink>
            <MenuLink href="/dashboard/administracion/tareas-montse" active={isRouteActive} className={getLinkClassName}>Tareas Montse</MenuLink>
            <div onClick={() => setIsAdminClientesOpen(!isAdminClientesOpen)} className={sectionClass}>
              <span>Clientes</span>
              <ArrowIcon isOpen={isAdminClientesOpen} />
            </div>
            {isAdminClientesOpen && (
              <div className={childWrapClass}>
                <MenuLink href="/dashboard/administracion/control-administrativo" active={isRouteActive} className={getLinkClassName}>Control administrativo</MenuLink>
                <MenuLink href="/dashboard/administracion/facturas-clientes" active={isRouteActive} className={getLinkClassName}>Facturas clientes</MenuLink>
                <MenuLink href="/dashboard/administracion/pendiente-cobro" active={isRouteActive} className={getLinkClassName}>Pendiente de cobro</MenuLink>
                <MenuLink href="/dashboard/administracion/suscripciones" active={isRouteActive} className={getLinkClassName}>Suscripciones</MenuLink>
              </div>
            )}
            <div onClick={() => setIsAdminProveedoresOpen(!isAdminProveedoresOpen)} className={sectionClass}>
              <span>Proveedores</span>
              <ArrowIcon isOpen={isAdminProveedoresOpen} />
            </div>
            {isAdminProveedoresOpen && (
              <div className={childWrapClass}>
                <MenuLink href="/dashboard/administracion/proveedores" active={isRouteActive} className={getLinkClassName}>Proveedores</MenuLink>
                <MenuLink href="/dashboard/administracion/facturas-proveedores" active={isRouteActive} className={getLinkClassName}>Facturas proveedores</MenuLink>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-2">
        <div onClick={() => setIsOperacionesOpen(!isOperacionesOpen)} className={sectionClass}>
          <span>Operaciones</span>
          <ArrowIcon isOpen={isOperacionesOpen} />
        </div>
        {isOperacionesOpen && (
          <div className={childWrapClass}>
            <MenuLink href="/dashboard/operaciones/data" active={isRouteActive} className={getLinkClassName}>Gestión de BBDD</MenuLink>
            <MenuLink href="/dashboard/operaciones/usuariosyroles" active={isRouteActive} className={getLinkClassName}>Usuarios</MenuLink>
            <MenuLink href="/dashboard/operaciones/roles" active={isRouteActive} className={getLinkClassName}>Roles</MenuLink>
          </div>
        )}
      </div>

      <div className="mb-2">
        <div onClick={() => setIsDireccionOpen(!isDireccionOpen)} className={sectionClass}>
          <span>Dirección</span>
          <ArrowIcon isOpen={isDireccionOpen} />
        </div>
        {isDireccionOpen && (
          <div className={childWrapClass}>
            <MenuLink href="/dashboard/direccion/bancos" active={isRouteActive} className={getLinkClassName}>Bancos</MenuLink>
            <MenuLink href="/dashboard/direccion/tareas" active={isRouteActive} className={getLinkClassName}>Tareas</MenuLink>
            <div onClick={() => setIsPrevisionesOpen(!isPrevisionesOpen)} className={sectionClass}>
              <span>Previsiones</span>
              <ArrowIcon isOpen={isPrevisionesOpen} />
            </div>
            {isPrevisionesOpen && (
              <div className={childWrapClass}>
                <MenuLink href="/dashboard/direccion/previsiones/prevision-liquidez" active={isRouteActive} className={getLinkClassName}>Previsión liquidez</MenuLink>
                <MenuLink href="/dashboard/direccion/previsiones/prevision-ingresos" active={isRouteActive} className={getLinkClassName}>Previsión ingresos</MenuLink>
                <MenuLink href="/dashboard/direccion/previsiones/prevision-gastos" active={isRouteActive} className={getLinkClassName}>Previsión gastos</MenuLink>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function MenuLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: (href: string) => boolean;
  className: (href: string) => string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className(href)} aria-current={active(href) ? "page" : undefined}>
      {children}
    </Link>
  );
}
