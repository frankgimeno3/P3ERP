'use client';
import {useCallback, useState, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {MiddleNavBar} from '@/app/general_components/componentes_recurrentes/MiddleNav';
import {dashboardMidnavTitle} from '@/app/config/dashboardNavigation';
import {DashboardMidnavContext, type MidnavDescription, type RegisterMidnav} from './DashboardMidnavContext';

export default function DashboardNavigation({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const [descriptions, setDescriptions] = useState(new Map<string, MidnavDescription & {pathname: string}>());
  const register = useCallback<RegisterMidnav>((id, path, description) => {
    setDescriptions(previous => new Map(previous).set(id, {...description, pathname: path}));
    return () => setDescriptions(previous => {const next = new Map(previous); next.delete(id); return next;});
  }, []);
  const current = Array.from(descriptions.values()).filter(item => item.pathname === pathname).at(-1);
  return <DashboardMidnavContext.Provider value={register}>
    <MiddleNavBar tituloprincipal={current?.tituloprincipal || dashboardMidnavTitle(pathname)} currentLabel={current?.currentLabel}/>
    {children}
  </DashboardMidnavContext.Provider>;
}
