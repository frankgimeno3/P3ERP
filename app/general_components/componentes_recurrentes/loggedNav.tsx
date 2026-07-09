import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import AuthenticationService from "@/app/service/AuthenticationService";

const LoggedNav = () => {
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
    '/dashboard/comercial': 'Modulo de gestion comercial',
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

    return 'Página de gestión';
  };

  const description = getDescription(pathname, routeDescriptions);

  return (
    <nav className="relative flex flex-row items-center justify-between bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 px-4 py-3 text-gray-200 md:px-6 md:py-3.5">
      <div className="flex flex-col text-left">
        <p
          className="cursor-pointer text-xl font-semibold text-gray-100 hover:text-white md:text-2xl"
          onClick={() => handleRedirection('/dashboard')}
        >
          Portal de gestión PROPORCIÓN 3, S.A.
        </p>
        <p className="text-sm font-normal text-gray-300">{description}</p>
      </div>
      <div className="flex flex-row items-center gap-2 text-sm uppercase md:gap-3 md:text-base">
        <Link
          href="/dashboard/mediateca"
          className="rounded-lg bg-white/10 px-3 py-2 font-medium text-gray-200 transition-colors hover:bg-white/20 hover:text-white md:px-4"
        >
          Mediateca
        </Link>
        <button
          className="rounded-lg bg-white/10 px-3 py-2 font-medium text-gray-200 transition-colors hover:bg-white/20 hover:text-white md:px-4"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
};

export default LoggedNav;
