export const productionRouteMoves = [
  ['/dashboard/produccion/contenidos', '/dashboard/produccion/gestion'],
  ['/dashboard/produccion/articulos', '/dashboard/operaciones/articulos'],
  ['/dashboard/produccion/revistas', '/dashboard/operaciones/revistas'],
  ['/dashboard/administracion/ferias', '/dashboard/operaciones/ferias'],
  ['/dashboard/comercial/documentacion', '/dashboard/operaciones/documentacion'],
];
export function canonicalProductionPath(path) {
  for (const [before, after] of productionRouteMoves) if (path === before || path.startsWith(before + '/')) return after + path.slice(before.length);
  return path;
}
