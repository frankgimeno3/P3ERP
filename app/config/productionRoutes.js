export const productionRouteMoves = [
  ['/dashboard/produccion/articulos', '/dashboard/operaciones/articulos'],
  ['/dashboard/produccion/revistas', '/dashboard/operaciones/revistas'],
  ['/dashboard/administracion/ferias', '/dashboard/operaciones/ferias'],
  ['/dashboard/comercial/documentacion', '/dashboard/operaciones/documentacion'],
];
export function canonicalProductionPath(path) {
  if (path === '/dashboard/mediateca' || path.startsWith('/dashboard/mediateca/')) return path.replace('/dashboard/mediateca', '/dashboard/direccion/mediateca');
  for (const root of ['/dashboard/produccion/gestion', '/dashboard/produccion/contenidos']) {
    if (path === root) return '/dashboard/produccion/gestion-contenidos/revista';
    if (path.startsWith(root + '/revistas/')) return '/dashboard/produccion/gestion-contenidos/revista/' + path.slice((root + '/revistas/').length).replace(/\/contenidos\/?$/, '');
    if (path.startsWith(root + '/')) return '/dashboard/produccion/repositorio/contenidos/' + path.slice(root.length + 1);
  }
  const content = path.match(/^\/dashboard\/produccion\/hoja_produccion\/([^/]+)$/);
  if (content && content[1] !== 'crear') return '/dashboard/produccion/repositorio/contenidos/' + content[1];
  for (const [before, after] of productionRouteMoves) if (path === before || path.startsWith(before + '/')) return after + path.slice(before.length);
  return path;
}
