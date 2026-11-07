import {dashboardMenu, flattenMenuEntries, getDashboardMenuLocation} from './dashboardMenu';
import routePatterns from './dashboardRoutePatterns.json';

const pageLabels = new Map(dashboardMenu.flatMap(area => flattenMenuEntries(area.children).map(page => [page.href, page.label] as const)));
const labels: Record<string, string> = {
  dashboard: 'Mi panel', 'gestion-contenidos': 'Gestión contenidos', contenidos: 'Contenidos', materiales: 'Materiales',
  crear: 'Crear', nueva: 'Nueva', nuevo: 'Nuevo', editar: 'Editar', importar: 'Importar', exportar: 'Exportar',
  canales: 'Canales', catalogo: 'Catálogo', revision: 'Revisión', conciliacion: 'Conciliación',
};

export function dashboardPathExists(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return routePatterns.some(pattern => {
    const template = pattern.split('/').filter(Boolean);
    for (let index = 0; index < template.length; index++) {
      const segment = template[index];
      if (segment.startsWith('[[...')) return true;
      if (segment.startsWith('[...')) return parts.length > index;
      if (!parts[index] || (!segment.startsWith('[') && segment !== parts[index])) return false;
    }
    return template.length === parts.length;
  });
}

export function dashboardPathLabel(pathname: string) {
  const page = pageLabels.get(pathname);
  if (page) return page;
  const area = dashboardMenu.find(item => pathname === `/dashboard/${item.id}`);
  if (area) return area.label;
  let segment = pathname.split('/').filter(Boolean).at(-1) || 'dashboard';
  if (labels[segment]) return labels[segment];
  try {segment = decodeURIComponent(segment);} catch { /* Mantén identificadores históricos mal codificados. */ }
  segment = segment.replaceAll('_', ' ').replaceAll('-', ' ');
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function dashboardMidnavTitle(pathname: string) {
  if(/^\/(mis-tareas|tareas)(?:\/|$)/.test(pathname))return 'MIS TAREAS';
  if (dashboardMenu.some(area => pathname === `/dashboard/${area.id}`)) return dashboardPathLabel(pathname);
  return getDashboardMenuLocation(pathname)?.page.label || dashboardPathLabel(pathname);
}
