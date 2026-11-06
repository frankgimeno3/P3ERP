'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {dashboardMenu, getDashboardMenuLocation} from '@/app/config/dashboardMenu';

export function dashboardPageTitle(pathname: string, heading = '') {
  if (pathname === '/dashboard') return 'Mi panel | P3ERP';
  const location = getDashboardMenuLocation(pathname);
  const currentModule = location?.module || dashboardMenu.find(item => pathname.startsWith(`/dashboard/${item.id}/`) || pathname === `/dashboard/${item.id}`);
  const lastSegment = pathname.split('/').filter(Boolean).at(-1) || '';
  let fallback = lastSegment;
  try {fallback = decodeURIComponent(lastSegment).replaceAll('_', ' ').replaceAll('-', ' ');} catch { /* Conserva segmentos históricos mal codificados. */ }
  const label = heading.trim().replace(/\s+/g, ' ') || location?.page.label || fallback || 'Mi panel';
  return [label, currentModule?.label !== label ? currentModule?.label : '', 'P3ERP'].filter(Boolean).join(' | ');
}

export default function DashboardPageTitle() {
  const pathname = usePathname();
  useEffect(() => {
    const content = document.querySelector('[data-dashboard-content]') || document.body;
    const update = () => {
      // Las fichas cargan su nombre después de la navegación. No tomar títulos de modales.
      const heading = Array.from(content.querySelectorAll('h1, [data-page-title]'))
        .filter(node => !node.closest('[role="dialog"], [aria-modal="true"], dialog'));
      const label = (heading.find(node => node.tagName === 'H1') || heading[0])?.textContent || '';
      const title = dashboardPageTitle(pathname, label);
      if (document.title !== title) document.title = title;
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(content, {childList: true, characterData: true, subtree: true});
    // Next puede completar los metadatos heredados después de montar la página.
    observer.observe(document.head, {childList: true, characterData: true, subtree: true});
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
