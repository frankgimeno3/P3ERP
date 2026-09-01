export type AppRole = "base" | "administracion" | "operaciones" | "superadmin";

export const roleRank: Record<AppRole, number> = {
  base: 0,
  administracion: 1,
  operaciones: 2,
  superadmin: 3,
};

export function normalizeRole(role: unknown): AppRole {
  const value = String(role || "").trim().toLowerCase();
  if (value === "administracion" || value === "operaciones" || value === "superadmin") return value;
  return "base";
}

export function canViewModule(role: unknown, moduleId: string) {
  const normalized = normalizeRole(role);
  if (moduleId === "direccion") return normalized === "superadmin";
  if (moduleId === "operaciones") return roleRank[normalized] >= roleRank.operaciones;
  if (moduleId === "administracion") return roleRank[normalized] >= roleRank.administracion;
  return true;
}

export function canAccessDashboardPath(role: unknown, pathname: string) {
  if (pathname.startsWith("/dashboard/direccion")) return canViewModule(role, "direccion");
  if (pathname.startsWith("/dashboard/operaciones")) return canViewModule(role, "operaciones");
  if (pathname.startsWith("/dashboard/administracion")) return canViewModule(role, "administracion");
  return true;
}

export function canAccessApiPath(role: unknown, pathname: string, method: string) {
  const normalized = normalizeRole(role);
  if (pathname.startsWith("/api/v1/direccion")) return normalized === "superadmin";
  if (pathname.startsWith("/api/v1/operaciones")) return roleRank[normalized] >= roleRank.operaciones;
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
