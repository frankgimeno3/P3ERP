"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AgenteService } from "@/app/service/AgenteService";
import { RoleService } from "@/app/service/RoleService";
import TaskBoard from "../../../direccion/tareas/TaskBoard";

interface Agente {
  id_agente: string;
  nombre_agente: string;
  apellidos_agente: string;
  nombre_completo_agente: string;
  email_agente: string;
  rol_agente: string;
  estado_agente: string;
  accesos_personalizados: boolean;
  array_accesos_adicionales: string[];
}

interface Role {
  id_rol: string;
  nombre_rol: string;
  descripcion_rol: string;
  permisos_rol: string[];
}

const ESTADOS = ["activo", "inactivo", "bloqueado"];

function getNombreAgente(agente: Agente | null) {
  if (!agente) return "-";
  return agente.nombre_completo_agente || `${agente.nombre_agente || ""} ${agente.apellidos_agente || ""}`.trim() || agente.id_agente;
}

export default function UsuarioDetallePage() {
  const router = useRouter();
  const params = useParams();
  const idAgente = String(params?.id || "");
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolAgente, setRolAgente] = useState("");
  const [estadoAgente, setEstadoAgente] = useState("activo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    Promise.all([AgenteService.getAgentes(), RoleService.getRoles().catch(() => [])])
      .then(([agentesData, rolesData]) => {
        if (!mounted) return;
        const normalizedAgentes = Array.isArray(agentesData) ? agentesData : [];
        const normalizedRoles = Array.isArray(rolesData) ? rolesData : [];
        const agente = normalizedAgentes.find((item) => item.id_agente === idAgente);
        setAgentes(normalizedAgentes);
        setRoles(normalizedRoles);
        setRolAgente(agente?.rol_agente || "");
        setEstadoAgente(agente?.estado_agente || "activo");
      })
      .catch((error: any) => setError(error?.message || "No se ha podido cargar el usuario."))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [idAgente]);

  const agente = useMemo(() => agentes.find((item) => item.id_agente === idAgente) || null, [agentes, idAgente]);
  const roleOptions = useMemo(() => {
    const fromRoles = roles.map((role) => role.nombre_rol || role.id_rol).filter(Boolean);
    const fromAgentes = agentes.map((item) => item.rol_agente).filter(Boolean);
    return Array.from(new Set([...fromRoles, ...fromAgentes])).sort((a, b) => a.localeCompare(b));
  }, [agentes, roles]);
  const selectedRole = useMemo(() => roles.find((role) => role.nombre_rol === rolAgente || role.id_rol === rolAgente) || null, [roles, rolAgente]);

  const save = async () => {
    if (!agente) return;
    try {
      setSaving(true);
      setError("");
      setSaveMessage("");
      const updated = await AgenteService.updateAgenteRoles(idAgente, {
        rol_agente: rolAgente,
        estado_agente: estadoAgente,
      });
      setAgentes((current) => current.map((item) => (item.id_agente === updated.id_agente ? updated : item)));
      setSaveMessage("Usuario actualizado");
    } catch (error: any) {
      setError(error?.message || "No se ha podido guardar el usuario.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 px-12 text-gray-800">
      <button type="button" onClick={() => router.push("/dashboard/operaciones/usuariosyroles")} className="mb-4 rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm hover:bg-gray-50">
        Volver a usuarios
      </button>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="bg-white p-5 text-sm text-gray-500 shadow-sm">Cargando usuario...</div>}

      {!loading && !agente && <div className="bg-white p-5 text-sm text-gray-500 shadow-sm">Usuario no encontrado.</div>}

      {!loading && agente && (
        <div className="space-y-5">
          <section className="bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Agente</p>
                <h1 className="mt-1 text-xl font-semibold text-blue-950">{getNombreAgente(agente)}</h1>
                <p className="text-sm text-gray-500">{agente.email_agente || agente.id_agente}</p>
              </div>
              {saveMessage && <span className="text-sm text-green-700">{saveMessage}</span>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Rol</span>
                <select value={rolAgente} onChange={(event) => setRolAgente(event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="">Sin rol</option>
                  {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Estado</span>
                <select value={estadoAgente} onChange={(event) => setEstadoAgente(event.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm">
                  {ESTADOS.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </label>
            </div>

            {selectedRole?.descripcion_rol && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold uppercase text-gray-500">Descripcion</p>
                <p className="mt-1 text-sm text-gray-700">{selectedRole.descripcion_rol}</p>
              </div>
            )}

            {selectedRole?.permisos_rol?.length ? (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold uppercase text-gray-500">Permisos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRole.permisos_rol.map((permiso) => <span key={permiso} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{permiso}</span>)}
                </div>
              </div>
            ) : null}

            <button type="button" onClick={save} disabled={saving} className="mt-5 rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:bg-gray-400">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </section>

          <section className="bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-blue-950">Listas y tareas</h2>
              <p className="mt-1 text-sm text-gray-500">Gestion de listas, orden y tareas del usuario.</p>
            </div>
            <TaskBoard agenteId={idAgente} embedded />
          </section>
        </div>
      )}
    </div>
  );
}
