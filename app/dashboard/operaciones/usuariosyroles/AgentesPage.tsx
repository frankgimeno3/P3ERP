'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgenteService } from '@/app/service/AgenteService';
import { RoleService } from '@/app/service/RoleService';
import { EmployeeList } from '../../direccion/laboral/components/Employees';
import '../../direccion/laboral/laboral.css';
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

export default function Agentes({ initialTab = 'agentes' }: { initialTab?: 'agentes' | 'asuntos' }) {
 const [tab,setTab] = useState(initialTab);
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

  const [statusTab,setStatusTab] = useState('activo');
  const [filters,setFilters] = useState({id:'',nombre:'',email:'',rol:''});
  const matches = (value:string,query:string) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
  const visible = agentes.filter(a => (statusTab === 'activo' ? a.estado_agente === 'activo' : a.estado_agente !== 'activo') && matches(a.id_agente,filters.id) && matches(a.nombre_completo_agente || a.nombre_agente+' '+a.apellidos_agente,filters.nombre) && matches(a.email_agente,filters.email) && (!filters.rol || a.rol_agente === filters.rol));
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
        <div className="flex gap-3"><button type="button" onClick={() => router.push('/dashboard/operaciones/agentes/roles')} className="cursor-pointer rounded border px-4 py-2 hover:bg-blue-50">Administrar roles</button><button type="button" onClick={() => setShowCreateUser(true)} className="cursor-pointer rounded-md bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 hover:shadow-md">
          Crear agente
        </button></div>
      </div>

      <div role="tablist" aria-label="Agentes" className="mb-5 flex gap-2">{(['agentes','asuntos'] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} onClick={() => { setTab(value); window.history.replaceState(null, '', value === 'asuntos' ? '?tab=asuntos' : window.location.pathname); }} className={'cursor-pointer rounded px-4 py-2 ' + (tab === value ? 'bg-blue-950 text-white hover:bg-blue-800' : 'bg-white text-blue-950 hover:bg-blue-100')}>{value === 'agentes' ? 'Agentes' : 'Asuntos'}</button>)}</div>
      {tab === 'asuntos' ? <div className="laboral"><EmployeeList activeOnly /></div> : <>
      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div role="tablist" aria-label="Estado de agentes" className="mb-4 flex gap-2">{[['activo','Activos'],['inactivo','Inactivos']].map(([value,label])=><button key={value} role="tab" aria-selected={statusTab===value} onClick={()=>setStatusTab(value)} className={`cursor-pointer rounded px-4 py-2 hover:bg-blue-100 ${statusTab===value?'bg-blue-950 text-white hover:bg-blue-800':'bg-white'}`}>{label}</button>)}</div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">{(['id','nombre','email'] as const).map(key=><label key={key}>{key==='id'?'ID':key==='nombre'?'Nombre':'Email'}<input className="block w-full rounded border p-2" value={filters[key]} onChange={e=>setFilters({...filters,[key]:e.target.value})} /></label>)}<label>Rol<select className="block w-full cursor-pointer rounded border p-2 hover:border-blue-900" value={filters.rol} onChange={e=>setFilters({...filters,rol:e.target.value})}><option value="">Todos</option>{Array.from(new Set([...rolesByName,...agentes.map(a=>a.rol_agente)])).filter(Boolean).sort().map(role=><option key={role} value={role}>{role}</option>)}</select></label></div>
      <div key={statusTab} role="tabpanel" className="overflow-hidden rounded bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Rol</th>

                <th className="px-4 py-2 text-left">Cuenta de empleado</th>
                <th className="px-4 py-2 text-left">Accesos extra</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 text-gray-500" colSpan={6}>
                    Cargando agentes...
                  </td>
                </tr>
              )}

              {!loading && visible.length === 0 && (
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 text-gray-500" colSpan={6}>
                    No hay agentes para mostrar.
                  </td>
                </tr>
              )}

              {!loading && visible.map((agente) => {
                return (
                  <tr
                    key={agente.id_agente}
                    onClick={() => router.push(`/dashboard/operaciones/agentes/${agente.id_agente}`)}
                    className="cursor-pointer border-t border-gray-200 hover:bg-blue-50"
                  >
                    <td className="px-4 py-2 font-medium">{agente.id_agente}</td>
                    <td className="px-4 py-2">{getNombreAgente(agente)}</td>
                    <td className="px-4 py-2">{agente.email_agente || '-'}</td>
                    <td className="px-4 py-2">{agente.rol_agente || '-'}</td>

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
      </>}
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
