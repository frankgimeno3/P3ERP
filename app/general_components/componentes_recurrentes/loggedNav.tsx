import { useCurrentUser, clearCurrentUser } from '@/app/lib/currentUser';
import { useRouter, usePathname } from "next/navigation";
import { MousePointer2 } from 'lucide-react';
import Link from "next/link";
import AuthenticationService from "@/app/service/AuthenticationService";

const LoggedNav = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const currentUser = user || { name: 'cargando…', role: 'cargando…' };

 
  const handleLogout = async () => {
    await AuthenticationService.logout();
    clearCurrentUser();
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

  const description = `${getDescription(pathname, routeDescriptions)} - usuario ${currentUser.name} con rol ${currentUser.role}`;

  return (
    <nav className="relative flex flex-row items-center justify-between bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 px-4 py-3 text-gray-200 uppercase md:px-6 md:py-3.5">
      <div className="flex items-center gap-3 text-left">
        <Link href="/dashboard" aria-label="Ir al inicio del portal" className="group flex shrink-0 cursor-pointer items-center justify-center rounded p-2 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <MousePointer2 aria-hidden="true" size={38} strokeWidth={1.5} className="fill-transparent text-white transition-[fill] duration-700 ease-in-out group-hover:fill-white group-focus-visible:fill-white motion-reduce:transition-none" />
        </Link>
        <div className="flex flex-col">
        <p
          className="cursor-pointer text-xl font-normal text-gray-100 hover:text-white md:text-2xl"
          onClick={() => handleRedirection('/dashboard')}
        >
          Portal de gestión PROPORCIÓN 3
        </p>
        <p className="text-sm font-normal text-gray-300">{description}</p>
        </div>
      </div>
      <div className="flex flex-row items-center gap-2 text-sm uppercase md:gap-3 md:text-base">
        <Link
          href="/dashboard/mediateca"
          className="rounded-lg bg-white/10 px-3 py-2 font-normal text-gray-200 transition-colors hover:bg-white/20 hover:text-white md:px-4"
        >
          Mediateca
        </Link>
        <Link
          href="/gm"
          className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 font-normal text-gray-200 transition-colors hover:bg-white/20 hover:text-white md:px-4"
        >
          Modo GM
        </Link>
        <button
          className="rounded-lg bg-white/10 px-3 py-2 font-normal text-gray-200 transition-colors hover:bg-white/20 hover:text-white md:px-4"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
};

export default LoggedNav;
