"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import AgentTasks from '../../agentes/AgentTasks';
import { EmployeePayrollList } from '../../../direccion/laboral/components/EmployeePayroll';
import '../../../direccion/laboral/laboral.css';
import { AgenteService } from "@/app/service/AgenteService";
import { RoleService } from "@/app/service/RoleService";

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
}


const ESTADOS = ["activo", "inactivo", "bloqueado"];
const ROLE_ORDER = ["base", "administracion", "operaciones", "superadmin"];

function getNombreAgente(agente: Agente | null) {
  if (!agente) return "-";
  return agente.nombre_completo_agente || `${agente.nombre_agente || ""} ${agente.apellidos_agente || ""}`.trim() || agente.id_agente;
}

export default function AgenteDetallePage() {
  const router = useRouter();
  const params = useParams();
  const idAgente = String(params?.id || "");
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolAgente, setRolAgente] = useState("");
  const [estadoAgente, setEstadoAgente] = useState("activo");
  const [isEmpleado, setIsEmpleado] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [tab, setTab] = useState('detalles');
  useEffect(()=>{if(new URLSearchParams(window.location.search).get('tab')==='tareas')setTab('tareas');},[]);
  const [payrollTab, setPayrollTab] = useState('historial');
  const [agreement, setAgreement] = useState<any>(null);
  const [agreementError, setAgreementError] = useState('');
  const [agreementVersion, setAgreementVersion] = useState(0);
  const [agreementLoading, setAgreementLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController(); setAgreementLoading(true); setAgreementError('');
    fetch('/api/v1/direccion/cargos-recurrentes', { signal:controller.signal, cache:'no-store' }).then(async response => { if (!response.ok) throw new Error('No se pudo cargar la nómina pactada.'); return response.json(); }).then(rows => setAgreement(rows.find((r:any) => r.tipo_cargo === 'nomina' && r.id_agente === idAgente) || null)).catch(error => { if (error.name !== 'AbortError') setAgreementError(error.message); }).finally(() => { if (!controller.signal.aborted) setAgreementLoading(false); });
    return () => controller.abort();
  },[idAgente,agreementVersion]);

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
        setRolAgente(agente?.rol_agente || "base");
        setEstadoAgente(agente?.estado_agente || "activo");
        setIsEmpleado(agente?.is_empleado_account ?? true);
        setNombre(agente?.nombre_completo_agente || `${agente?.nombre_agente || ""} ${agente?.apellidos_agente || ""}`.trim());
        setEmail(agente?.email_agente || "");
      })
      .catch((error: any) => setError(error?.message || "No se ha podido cargar el agente."))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [idAgente]);



  const agente = useMemo(() => agentes.find((item) => item.id_agente === idAgente) || null, [agentes, idAgente]);
  const roleOptions = useMemo(() => {
    const fromRoles = roles.map((role) => role.nombre_rol || role.id_rol).filter(Boolean);
    const fromAgentes = agentes.map((item) => item.rol_agente).filter(Boolean);
    return Array.from(new Set([...fromRoles, ...fromAgentes])).sort((a, b) => {
      const aIndex = ROLE_ORDER.indexOf(a);
      const bIndex = ROLE_ORDER.indexOf(b);
      return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
    });
  }, [agentes, roles]);
  const selectedRole = useMemo(() => roles.find((role) => role.nombre_rol === rolAgente || role.id_rol === rolAgente) || null, [roles, rolAgente]);

  const save = async () => {
    if (!agente) return;
    if (!nombre.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Indica un nombre y un email válidos.'); return; }
    try {
      setSaving(true);
      setError("");
      setSaveMessage("");
      const updated = await AgenteService.updateAgenteRoles(idAgente, {
        nombre_completo_agente: nombre,
        email_agente: email,
        rol_agente: rolAgente,
        estado_agente: estadoAgente,
        is_empleado_account: isEmpleado,
      });
      setAgentes((current) => current.map((item) => (item.id_agente === updated.id_agente ? updated : item)));
      setSaveMessage("Agente actualizado");
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || "No se ha podido guardar el agente.");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    try {
      setDeleting(true);
      setDeleteError("");
      await AgenteService.deleteAgente(idAgente);
      router.replace("/dashboard/operaciones/agentes");
    } catch (error: any) {
      setDeleteError(error?.response?.data?.message || error?.message || "No se ha podido borrar el agente.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 px-12 text-gray-800">
      <button type="button" onClick={() => router.push("/dashboard/operaciones/agentes")} className="mb-4 cursor-pointer rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm transition hover:bg-gray-50 hover:shadow-md">
        Volver a agentes
      </button>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="bg-white p-5 text-sm text-gray-500 shadow-sm">Cargando agente...</div>}

      {!loading && !agente && <div className="bg-white p-5 text-sm text-gray-500 shadow-sm">Agente no encontrado.</div>}

      {!loading && agente && (
        <div className="space-y-5"><div className="flex justify-end">              <button type="button" onClick={() => { setDeleteError(""); setShowDeleteModal(true); }} className="cursor-pointer rounded border border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 hover:shadow-md">
                Borrar agente
              </button></div><nav className="flex gap-2" aria-label="Ficha de agente">{[['detalles','Detalles'],['nominas','Nóminas'],['tareas','Tareas']].map(([value,label]) => <button key={value} onClick={() => setTab(value)} aria-pressed={tab === value} className={`cursor-pointer rounded px-4 py-2 hover:bg-blue-100 ${tab === value ? 'bg-blue-950 text-white hover:bg-blue-900' : 'bg-white'}`}>{label}</button>)}</nav>
          {tab === 'detalles' && <section className="bg-white p-5 shadow-sm">
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
                <span className="text-sm font-medium text-gray-700">Nombre</span>
                <input value={nombre} onChange={event => setNombre(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Email</span>
                <input type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Rol</span>
                <select value={rolAgente} onChange={(event) => setRolAgente(event.target.value)} className="mt-1 w-full cursor-pointer rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:border-blue-950">
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

            <label className="mt-4 flex cursor-pointer items-center gap-2 rounded border border-gray-200 p-3 transition hover:bg-blue-50">
              <input type="checkbox" checked={isEmpleado} onChange={event => setIsEmpleado(event.target.checked)} className="cursor-pointer" />
              Cuenta de empleado (is_empleado_account)
            </label>

            {selectedRole?.descripcion_rol && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold uppercase text-gray-500">Descripcion</p>
                <p className="mt-1 text-sm text-gray-700">{selectedRole.descripcion_rol}</p>
              </div>
            )}

            {selectedRole?.permisos_rol?.length ? (
              <details className="mt-4 border-t border-gray-200 pt-4">
                <summary className="cursor-pointer rounded p-2 text-xs font-semibold uppercase text-gray-500 hover:bg-blue-50">Permisos</summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRole.permisos_rol.map((permiso) => <span key={permiso} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{permiso}</span>)}
                </div>
              </details>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={save} disabled={saving} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-400">
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>

            </div>
          </section>}

          {tab === 'nominas' && <section className="bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-blue-950">Nóminas</h2><p className="mt-1 text-sm text-gray-500">Histórico de nóminas del empleado.</p></div>
              <button type="button" disabled={!agente.is_empleado_account || agreementLoading || !!agreementError || !!agreement} onClick={() => setShowRecurringModal(true)} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white transition enabled:cursor-pointer enabled:hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">Establecer nómina recurrente</button>
            </div>
            <nav className="mb-4 flex gap-2" aria-label="Nóminas">{[['historial','Historial nóminas'],['pactada','Nómina pactada']].map(([value,label]) => <button key={value} onClick={() => setPayrollTab(value)} className={`cursor-pointer rounded border px-4 py-2 hover:bg-blue-50 ${payrollTab === value ? 'bg-blue-100' : ''}`}>{label}</button>)}</nav>
            {payrollTab === 'pactada' ? <div>{agreementLoading ? <p>Cargando...</p> : agreementError ? <p role="alert" className="text-red-700">{agreementError}</p> : agreement ? <div><p className="mb-3 font-semibold">{getNombreAgente(agente)}</p><a className="block cursor-pointer p-2 text-blue-900 hover:bg-blue-50 hover:underline" href={`/dashboard/direccion/tesoreria/cargos-recurrentes/${agreement.id_cargo_recurrente}`}>Ver y modificar cargo previsto</a>{agreement.programacion.map((r:any,i:number) => <div key={i} className="rounded border p-4"><p>Importe neto: {Number(r.total_iva).toFixed(2)} EUR</p><p>Cada {r.cada} {r.unidad}</p><p>{r.descripcion}</p></div>)}</div> : <p>No hay nómina recurrente registrada.</p>}</div> : <>
            <div className="laboral"><EmployeePayrollList employee={idAgente} version={agreementVersion} /></div>
            </>}
          </section>}
          {tab === 'tareas' && <AgentTasks agent={idAgente} />}
        </div>
      )}
      {showDeleteModal && agente && (
        <DeleteUserModal
          userName={getNombreAgente(agente)}
          deleting={deleting}
          error={deleteError}
          onClose={() => { if (!deleting) setShowDeleteModal(false); }}
          onConfirm={deleteUser}
        />
      )}
      {showRecurringModal && agente && <RecurringPayrollModal agent={agente} onSaved={() => { setAgreementVersion(v => v + 1); setPayrollTab('pactada'); }} onClose={() => setShowRecurringModal(false)} />}
    </div>
  );
}

function RecurringPayrollModal({ agent, onClose, onSaved }: { agent: Agente; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");


  const [description, setDescription] = useState("Nómina");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose, saving]);
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/v1/direccion/cargos-recurrentes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo_cargo: "nomina", id_agente: agent.id_agente, id_proveedor: null, tipo_programacion: "periodicidad", programacion: [{ cada: 1, unidad: "meses", base_imponible: 0, total_iva: Number(amount), descripcion: description }] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "No se pudo guardar la nómina recurrente.");
      onSaved(); onClose();
    } catch (error: any) { setError(error.message); } finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"><header className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-semibold text-blue-950">Establecer nómina recurrente</h2><p className="mt-1 text-sm text-gray-500">{getNombreAgente(agent)}</p></div><button type="button" aria-label="Cerrar" onClick={onClose} className="cursor-pointer text-3xl text-gray-600 hover:text-blue-900">×</button></header><form onSubmit={save} className="space-y-4"><label className="block text-sm font-medium">Importe neto<input required min="0.01" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 w-full rounded border p-2" /></label><p className="rounded bg-blue-50 p-3">Periodicidad: cada 1 mes</p><label className="block text-sm font-medium">Descripción<input required value={description} onChange={event => setDescription(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>{error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="cursor-pointer rounded border px-4 py-2 hover:bg-gray-100">Cancelar</button><button type="submit" disabled={saving} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Guardando..." : "Guardar nómina recurrente"}</button></div></form></section></div>;
}

function DeleteUserModal({ userName, deleting, error, onClose, onConfirm }: { userName: string; deleting: boolean; error: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [confirmation, setConfirmation] = useState("");
  const canDelete = confirmation.trim().toLowerCase() === "borrar";

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !deleting) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleting, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="delete-user-title" className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div><h2 id="delete-user-title" className="text-xl font-semibold text-red-800">¿Seguro que deseas borrar este agente?</h2><p className="mt-1 text-sm text-gray-500">Esta acción eliminará a {userName} de la base de datos y de Cognito.</p></div>
          <button type="button" disabled={deleting} onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-2xl text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50">×</button>
        </header>
        <form className="p-6" onSubmit={(event) => { event.preventDefault(); if (canDelete && !deleting) void onConfirm(); }}>
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">También se eliminarán definitivamente:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Todas las listas de tareas de este agente.</li>
              <li>Todas las tareas asignadas exclusivamente a este agente.</li>
            </ul>
            <p className="mt-2 font-medium">No se eliminarán las listas ni las tareas de otros agentes.</p>
          </div>
          <label htmlFor="delete-user-confirmation" className="block text-sm font-medium text-gray-700">Escribe <strong>borrar</strong> para confirmar</label>
          <input id="delete-user-confirmation" autoFocus type="text" autoComplete="off" value={confirmation} disabled={deleting} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2.5 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100" />
          {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" disabled={deleting} onClick={onClose} className="cursor-pointer rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={!canDelete || deleting} className="cursor-pointer rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500">
              {deleting ? "Borrando…" : "Confirmar borrado"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
