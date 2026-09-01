"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgenteService } from "@/app/service/AgenteService";
import { RoleService } from "@/app/service/RoleService";

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [rolesData, agentesData] = await Promise.all([
          RoleService.getRoles(),
          AgenteService.getAgentes(),
        ]);
        setRoles(Array.isArray(rolesData) ? rolesData : []);
        setAgentes(Array.isArray(agentesData) ? agentesData : []);
      } catch (error: any) {
        setError(error?.message || "No se han podido cargar los roles.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const usersByRole = useMemo(() => {
    return agentes.reduce<Record<string, any[]>>((acc, agente) => {
      const keys = [agente.rol_agente].filter(Boolean);
      keys.forEach((key) => {
        acc[key] = [...(acc[key] || []), agente];
      });
      return acc;
    }, {});
  }, [agentes]);

  const getRoleUsers = (role: any) => {
    const keys = [role.id_rol, role.nombre_rol].filter(Boolean);
    const users = keys.flatMap((key) => usersByRole[key] || []);
    return Array.from(new Map(users.map((user) => [user.id_agente, user])).values());
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 px-12 text-gray-800">
      <div className="mb-5">
        <p className="text-xl font-semibold text-gray-700">Roles</p>
        <p className="text-sm text-gray-500">Roles disponibles, agentes asignados y accesos al dashboard</p>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Descripción</th>
              <th className="px-4 py-2 text-left">Personalizado</th>
              <th className="px-4 py-2 text-left">Agentes</th>
              <th className="px-4 py-2 text-left">Accesos</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-gray-500" colSpan={6}>Cargando roles...</td>
              </tr>
            )}
            {!loading && roles.length === 0 && (
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-gray-500" colSpan={6}>No hay roles para mostrar.</td>
              </tr>
            )}
            {!loading && roles.map((role) => {
              const users = getRoleUsers(role);
              return (
                <tr key={role.id_rol} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-blue-950">{role.id_rol}</td>
                  <td className="px-4 py-2">{role.nombre_rol || "-"}</td>
                  <td className="px-4 py-2">{role.descripcion_rol || "-"}</td>
                  <td className="px-4 py-2">
                    {role.accesos_personalizados ? `${role.array_accesos_adicionales?.length || 0} adicionales` : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {users.length ? users.map((user) => user.nombre_completo_agente || user.id_agente).join(", ") : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/operaciones/roles/${role.id_rol}`)}
                      className="rounded bg-blue-950 px-3 py-1 text-xs text-white hover:bg-blue-900"
                    >
                      Accesos
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
