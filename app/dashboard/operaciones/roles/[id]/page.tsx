"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleService } from "@/app/service/RoleService";
import { AgenteService } from "@/app/service/AgenteService";

const dashboardRoutes = [
  '/dashboard',
  '/dashboard/administracion/control-administrativo',
  '/dashboard/administracion/facturas-clientes',
  '/dashboard/administracion/facturas-proveedores',
  '/dashboard/administracion/ferias',
  '/dashboard/administracion/ferias/[id_feria]',
  '/dashboard/administracion/pendiente-cobro',
  '/dashboard/administracion/proveedores',
  '/dashboard/administracion/proveedores/tickets',
  '/dashboard/administracion/suscripciones',
  '/dashboard/comercial/contactos',
  '/dashboard/comercial/contactos/crear',
  '/dashboard/comercial/contactos/[id]',
  '/dashboard/comercial/contratos',
  '/dashboard/comercial/contratos/[id]',
  '/dashboard/comercial/cuentas',
  '/dashboard/comercial/cuentas/crear',
  '/dashboard/comercial/cuentas/[id_cuenta]',
  '/dashboard/comercial/documentacion',
  '/dashboard/comercial/documentacion/editor/[tipo]/[idioma]',
  '/dashboard/comercial/propuestas',
  '/dashboard/comercial/propuestas/crear',
  '/dashboard/comercial/propuestas/plantillas',
  '/dashboard/comercial/propuestas/[id_propuesta]',
  '/dashboard/comercial/propuestas/[id_propuesta]/editar',
  '/dashboard/direccion/bancos',
  '/dashboard/direccion/previsiones/prevision-gastos',
  '/dashboard/direccion/previsiones/prevision-ingresos',
  '/dashboard/direccion/previsiones/prevision-ingresos/prevision-recibos',
  '/dashboard/direccion/previsiones/prevision-ingresos/prevision-transfers',
  '/dashboard/direccion/previsiones/prevision-liquidez',
  '/dashboard/operaciones/data',
  '/dashboard/operaciones/data/exportar/contactos',
  '/dashboard/operaciones/data/exportar/cuentas',
  '/dashboard/operaciones/data/importar/contactos',
  '/dashboard/operaciones/data/importar/cuentas',
  '/dashboard/operaciones/roles',
  '/dashboard/operaciones/agentesyroles',
  '/dashboard/operaciones/gestion_cuentas',
  '/dashboard/produccion/hoja_produccion/contenidos',
  '/dashboard/produccion/hoja_produccion/contenidos/[id_contenido]',
  '/dashboard/produccion/hoja_produccion',
  '/dashboard/produccion/hoja_produccion/crear',
  '/dashboard/produccion/hoja_produccion/[id]',
  '/dashboard/produccion/hoja_produccion/[id]/[idMaterial]',
];

const roleSections: Record<string, string[]> = {
  base: ["dashboard", "comercial", "produccion"],
  administracion: ["dashboard", "comercial", "produccion", "administracion"],
  operaciones: ["dashboard", "comercial", "produccion", "administracion", "operaciones"],
  superadmin: ["dashboard", "comercial", "produccion", "administracion", "operaciones", "direccion"],
};

function normalizeRoleId(value = "") {
  return value.toLowerCase().trim();
}

function getRouteSection(route: string) {
  return route.split("/")[2] || "dashboard";
}

function getBasePermissions(roleId: string) {
  const sections = roleSections[normalizeRoleId(roleId)] || [];
  return dashboardRoutes.filter((route) => sections.includes(getRouteSection(route)));
}

function canModifyRole(currentRole: string, targetRole: string) {
  const current = normalizeRoleId(currentRole);
  const target = normalizeRoleId(targetRole);
  if (current === "superadmin") return true;
  if (current === "operaciones" && target !== "superadmin") return true;
  return false;
}

export default function RoleAccessPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [role, setRole] = useState<any | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await RoleService.getRoleById(params.id);
        setRole(data);
        setPermissions(Array.isArray(data.permisos_rol) ? data.permisos_rol : []);
      } catch (error: any) {
        setError(error?.message || "No se ha podido cargar el rol.");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchRole();
  }, [params.id]);

  useEffect(() => {
    let payload: any = {};
    try {
      payload = JSON.parse(localStorage.getItem("userPayload") || "{}");
      const groups = payload?.["cognito:groups"] || payload?.roles || [];
      const groupRole = Array.isArray(groups) ? groups.find((item) => roleSections[normalizeRoleId(item)]) : "";
      if (groupRole) setCurrentRole(groupRole);
    } catch (error) {
      console.error("Error leyendo payload del usuario:", error);
    }

    AgenteService.getAgentes()
      .then((data) => {
        const agentes = Array.isArray(data) ? data : [];
        const current = agentes.find((agente) => agente.email_agente && agente.email_agente === payload?.email);
        if (current?.rol_agente) setCurrentRole(current.rol_agente);
      })
      .catch((error) => {
        console.error("Error fetching agente actual:", error);
      });
  }, []);

  const groupedRoutes = useMemo(() => {
    return dashboardRoutes.reduce<Record<string, string[]>>((acc, route) => {
      const section = getRouteSection(route);
      acc[section] = [...(acc[section] || []), route];
      return acc;
    }, {});
  }, []);

  const basePermissions = useMemo(() => getBasePermissions(params.id), [params.id]);
  const basePermissionSet = useMemo(() => new Set(basePermissions), [basePermissions]);
  const canEdit = canModifyRole(currentRole, params.id);
  const additionalPermissions = permissions.filter((route) => !basePermissionSet.has(route));

  const togglePermission = (route: string) => {
    if (!editMode || !canEdit || basePermissionSet.has(route)) return;
    setPermissions((current) =>
      current.includes(route) ? current.filter((item) => item !== route) : [...current, route],
    );
    setMessage("");
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      const mergedPermissions = Array.from(new Set([...basePermissions, ...additionalPermissions]));
      const updated = await RoleService.updateRolePermissions(params.id, mergedPermissions, additionalPermissions);
      setRole(updated);
      setPermissions(Array.isArray(updated.permisos_rol) ? updated.permisos_rol : []);
      setEditMode(false);
      setMessage("Accesos actualizados");
    } catch (error: any) {
      setError(error?.message || "No se han podido guardar los accesos.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      setError("");
      const updated = await RoleService.updateRolePermissions(params.id, basePermissions, []);
      setRole(updated);
      setPermissions(Array.isArray(updated.permisos_rol) ? updated.permisos_rol : []);
      setEditMode(false);
      setMessage("Accesos reseteados al rol base");
    } catch (error: any) {
      setError(error?.message || "No se han podido resetear los accesos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 px-12 text-gray-800">
      <button type="button" onClick={() => router.push('/dashboard/operaciones/roles')} className="mb-4 rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm hover:bg-gray-50">
        Volver a roles
      </button>

      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xl font-semibold text-gray-700">Accesos</p>
          <p className="text-sm text-gray-500">{role ? `${role.nombre_rol || role.id_rol} (${role.id_rol})` : params.id}</p>
          {role?.descripcion_rol && <p className="mt-1 text-sm text-gray-600">{role.descripcion_rol}</p>}
        </div>
        <div className="flex gap-2">
          {!editMode && (
            <button type="button" onClick={() => setEditMode(true)} disabled={!canEdit || loading} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:bg-gray-400">
              Modificar rol
            </button>
          )}
          {editMode && (
            <>
              <button type="button" onClick={handleReset} disabled={saving || loading || !canEdit} className="rounded border border-blue-950 px-4 py-2 text-sm font-medium text-blue-950 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400">
                Resetear a accesos del rol
              </button>
              <button type="button" onClick={handleSave} disabled={saving || loading || !canEdit} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:bg-gray-400">
                {saving ? "Guardando..." : "Guardar accesos"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
      {!canEdit && !loading && (
        <div className="mb-4 border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Tu rol actual no permite modificar este rol.
        </div>
      )}
      {!loading && additionalPermissions.length > 0 && (
        <div className="mb-4 border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Accesos adicionales personalizados: {additionalPermissions.length}
        </div>
      )}

      {loading ? (
        <div className="bg-white p-6 text-gray-500">Cargando accesos...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Object.entries(groupedRoutes).map(([section, routes]) => (
            <div key={section} className="rounded bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-semibold uppercase text-blue-950">{section}</p>
              <div className="space-y-2">
                {routes.map((route) => (
                  <label key={route} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={basePermissionSet.has(route) || permissions.includes(route)}
                      disabled={!editMode || !canEdit || basePermissionSet.has(route)}
                      onChange={() => togglePermission(route)}
                    />
                    <span>{route}</span>
                    {basePermissionSet.has(route) ? (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] uppercase text-gray-500">rol</span>
                    ) : permissions.includes(route) ? (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] uppercase text-blue-800">adicional</span>
                    ) : null}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
