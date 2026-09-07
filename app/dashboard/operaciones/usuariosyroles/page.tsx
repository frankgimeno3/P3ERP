'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgenteService } from '@/app/service/AgenteService';
import { RoleService } from '@/app/service/RoleService';
import CreateUserWizard from './CreateUserWizard';

interface Agente {
  id_agente: string;
  nombre_agente: string;
  apellidos_agente: string;
  nombre_completo_agente: string;
  email_agente: string;
  rol_agente: string;
  estado_agente: string;
  is_empleado_account: boolean;
  accesos_personalizados: boolean;
  array_accesos_adicionales: string[];
}

interface Role {
  id_rol: string;
  nombre_rol: string;
  descripcion_rol: string;
  permisos_rol: string[];
  estado_rol: string;
}

export default function Agentes() {
  const router = useRouter();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [agentesData, rolesData] = await Promise.all([
          AgenteService.getAgentes(),
          RoleService.getRoles().catch(() => []),
        ]);

        if (!isMounted) return;

        const normalizedAgentes = Array.isArray(agentesData) ? agentesData : [];
        setAgentes(normalizedAgentes);
        setRoles(Array.isArray(rolesData) ? rolesData : []);

      } catch (error: any) {
        if (isMounted) {
          setError(error?.message || 'Error al cargar los agentes');
          setAgentes([]);
          setRoles([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const rolesByName = useMemo(() => new Set(roles.map((role) => role.nombre_rol || role.id_rol).filter(Boolean)), [roles]);

  const getNombreAgente = (agente: Agente) => {
    return agente.nombre_completo_agente || `${agente.nombre_agente || ''} ${agente.apellidos_agente || ''}`.trim() || '-';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 px-12 text-gray-800">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xl font-semibold text-gray-700">Agentes</p>
          <p className="text-sm text-gray-500">Agentes registrados y rol asignado</p>
        </div>
        <button type="button" onClick={() => setShowCreateUser(true)} className="cursor-pointer rounded-md bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 hover:shadow-md">
          Crear agente
        </button>
      </div>

      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Rol</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Cuenta de empleado</th>
                <th className="px-4 py-2 text-left">Accesos extra</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 text-gray-500" colSpan={7}>
                    Cargando agentes...
                  </td>
                </tr>
              )}

              {!loading && agentes.length === 0 && (
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 text-gray-500" colSpan={7}>
                    No hay agentes para mostrar.
                  </td>
                </tr>
              )}

              {!loading && agentes.map((agente) => {
                return (
                  <tr
                    key={agente.id_agente}
                    onClick={() => router.push(`/dashboard/operaciones/agentesyroles/${agente.id_agente}`)}
                    className="cursor-pointer border-t border-gray-200 hover:bg-blue-50"
                  >
                    <td className="px-4 py-2 font-medium">{agente.id_agente}</td>
                    <td className="px-4 py-2">{getNombreAgente(agente)}</td>
                    <td className="px-4 py-2">{agente.email_agente || '-'}</td>
                    <td className="px-4 py-2">{agente.rol_agente || '-'}</td>
                    <td className="px-4 py-2">{agente.estado_agente || '-'}</td>
                    <td className="px-4 py-2">{agente.is_empleado_account ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-2">
                      {agente.accesos_personalizados ? `${agente.array_accesos_adicionales?.length || 0} adicionales` : rolesByName.has(agente.rol_agente) ? 'rol base' : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </div>
      {showCreateUser && (
        <CreateUserWizard
          roles={roles}
          onClose={() => setShowCreateUser(false)}
          onCreated={(agent) => setAgentes((current) => [...current, {
            ...agent,
            nombre_agente: agent.nombre_completo_agente,
            apellidos_agente: '',
            is_empleado_account: true,
            accesos_personalizados: false,
            array_accesos_adicionales: [],
          }].sort((a, b) => getNombreAgente(a).localeCompare(getNombreAgente(b))))}
        />
      )}
    </div>
  );
}
