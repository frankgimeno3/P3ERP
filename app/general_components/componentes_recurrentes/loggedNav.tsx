import React, { FC } from 'react';
import { useRouter, usePathname } from "next/navigation";
import AuthenticationService from "@/app/service/AuthenticationService";

interface LoggedNavProps {}

const LoggedNav: FC<LoggedNavProps> = () => {
  const router = useRouter();
  const pathname = usePathname();

 
  const handleLogout = async () => {
    await AuthenticationService.logout();
    router.replace('/');
  };

  const handleRedirection = (path: string) => {
    router.push(path);
  };

  const routeDescriptions: Record<string, string> = {
    '/dashboard': 'Haga click en un módulo para continuar',
    '/dashboard/fichajes': 'Módulo de fichaje',
    '/dashboard/clientes': 'Módulo de gestión de cuentas y contactos',
    '/dashboard/comercial': 'Módulo de gestión de propuestas y contratos',
    '/dashboard/administracion': 'Módulo administrativo',
    '/dashboard/produccion': 'Módulo de producción',
    '/dashboard/operaciones': 'Módulo de operaciones como moderador',
  };

  const getDescription = (pathname: string, routes: Record<string, string>) => {
    const sortedRoutes = Object.keys(routes).sort((a, b) => b.length - a.length);

    for (const route of sortedRoutes) {
      if (pathname.startsWith(route)) {
        return routes[route];
      }
    }

    return 'Página de registro de fichajes';
  };

  const description = getDescription(pathname, routeDescriptions);

  return (
    <nav className="flex flex-row justify-between p-5 px-8 items-center bg-blue-950 text-gray-100 relative">
      <div className="flex flex-col text-left">
        <p
          className="text-2xl font-bold cursor-pointer"
          onClick={() => handleRedirection('/dashboard')}
        >
          Portal de gestión PROPORCIÓN 3, S.A.
        </p>
        <p>{description}</p>
      </div>
      <div className="flex flex-row gap-12 text-lg items-center">
        <button
          className="bg-white hover:bg-gray-100 text-gray-600 cursor-pointer px-2 py-1 text-xs rounded-sm"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
};

export default LoggedNav;
