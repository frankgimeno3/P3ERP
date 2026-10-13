export type AppRole = "base" | "comercial" | "direccion" | "administracion" | "contabilidad" | "operaciones" | "superadmin";
import {normalizeRole,roleRank} from "./moduleAccess.js";
export {normalizeRole,roleRank,canViewModule,canAccessDashboardPath} from "./moduleAccess.js";

export function canAccessApiPath(role: unknown, pathname: string, method: string) {
  const normalized = normalizeRole(role) as AppRole;
  if(normalized==='contabilidad' && /^\/api\/v1\/(produccion|operaciones)(?:\/|$)/.test(pathname))return false;
  if (/^\/api\/v1\/admin\/proveedores\/[^/]+\/(benchmark|cargos-recurrentes)(?:\/[^/]+)?\/?$/.test(pathname)) return normalized === 'direccion' || roleRank[normalized] >= roleRank.administracion;
  if (method === 'POST' && /^\/api\/v1\/tareas\/propias\/?$/.test(pathname)) return true;
  if (pathname.startsWith('/api/v1/tareas') && (method !== 'GET' || pathname === '/api/v1/tareas/agentes')) return normalized === 'direccion' || roleRank[normalized] >= roleRank.operaciones;
  if (method !== 'GET' && pathname.startsWith('/api/v1/comercial/contratos/crear')) return roleRank[normalized] >= roleRank.administracion;
  if (/^\/api\/v1\/direccion\/laboral\/tareas-agentes(?:\/[^/]+)?\/?$/.test(pathname)) return ['direccion','contabilidad'].includes(normalized) || roleRank[normalized] >= roleRank.operaciones;
  if (pathname.startsWith("/api/v1/direccion")) return ['superadmin','direccion','contabilidad'].includes(normalized);
  if (pathname.startsWith("/api/v1/operaciones")) return roleRank[normalized] >= roleRank.operaciones;
  if (method !== "GET" && pathname.startsWith("/api/v1/produccion/servicios")) return roleRank[normalized] >= roleRank.operaciones;
  const sharedAdminRead = method === "GET" && /^\/api\/v1\/admin\/(agentes|ferias|proveedores)(?:\/[^/]+)?\/?$/.test(pathname);
  if (sharedAdminRead) return true;
  if (/^\/api\/v1\/admin\/(agentes|roles|user(?:\/|$)|user-wizard)/.test(pathname)) {
    return roleRank[normalized] >= roleRank.operaciones;
  }
  if (pathname.startsWith("/api/v1/admin")) {
    return roleRank[normalized] >= roleRank.administracion;
  }
  return true;
}
