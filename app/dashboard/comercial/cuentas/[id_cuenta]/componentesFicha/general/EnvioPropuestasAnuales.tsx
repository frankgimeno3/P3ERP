'use client';

import { Fragment, useEffect, useState, type FormEvent } from "react";
import apiClient from "@/app/apiClient";
import DatePartsInput from "@/app/components/DatePartsInput";
import SearchableSelect from "@/app/components/SearchableSelect";
import { taskStates } from "@/app/components/tasks/TaskList";
import { normalizeAnnualDayMonth, normalizeAnnualRange } from "@/app/lib/annualRenewalDates";

type RangoAnual = { entre: string; hasta: string };
type Task = {
  id: string;
  nombre: string;
  estado: string;
  descripcion: string;
  referencia: string;
  fecha_limite: string | null;
  agentes: string[];
  nombre_agente: string;
  updated_at: string;
};
type Agent = {
  id_agente: string;
  nombre_completo_agente: string;
  nombre_agente?: string;
  estado_agente?: string;
  is_empleado_account?: boolean;
};
type Renewal = {
  activo: boolean;
  predeterminado: RangoAnual;
  rango: RangoAnual | null;
  rango_manual: boolean;
  tarea: Task | null;
  puede_editar: boolean;
};

const taskName = "Enviar propuesta de renovación anual";
const control = "mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2";
const button = "rounded border border-gray-300 px-3 py-2 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:opacity-50";
const primaryButton = "rounded bg-blue-950 px-3 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:opacity-50";

function FechaAnual({ label, value, onChange, disabled }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [day = "", month = ""] = value.split("/");
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1">{label}</legend>
      <div className="flex items-center gap-1.5">
        {[[day, "dd"], [month, "mm"]].map(([part, placeholder], index) => (
          <Fragment key={placeholder}>
            {index === 1 && <span aria-hidden="true">/</span>}
            <input
              aria-label={`${label} ${placeholder}`}
              aria-invalid={Boolean(value && !normalizeAnnualDayMonth(value))}
              className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
              inputMode="numeric"
              maxLength={2}
              placeholder={placeholder}
              value={part}
              onChange={event => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, 2);
                const parts = index === 0 ? [digits, month] : [day, digits];
                onChange(parts.some(Boolean) ? parts.join("/") : "");
              }}
            />
          </Fragment>
        ))}
      </div>
    </fieldset>
  );
}

function RenewalTaskModal({ task, agents, onClose, onSave }: {
  task: Task | null;
  agents: Agent[];
  onClose: () => void;
  onSave: (task: object) => Promise<void>;
}) {
  const [form, setForm] = useState({
    nombre: task?.nombre ?? taskName,
    descripcion: task?.descripcion ?? "",
    referencia: task?.referencia ?? "",
    fecha_limite: task?.fecha_limite ?? "",
    estado: task?.estado ?? "pendiente",
    agente: task?.agentes[0] || "-",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && !saving) onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose, saving]);

  const options = agents
    .filter(agent => agent.is_empleado_account !== false && !["inactivo", "borrador"].includes(agent.estado_agente?.toLowerCase() ?? ""))
    .map(agent => ({ value: agent.id_agente, label: agent.nombre_completo_agente || agent.nombre_agente || agent.id_agente }));
  options.unshift({ value: "-", label: "Sin agente asignado" });
  if (task?.agentes[0] && !options.some(option => option.value === task.agentes[0])) {
    options.push({ value: task.agentes[0], label: task.nombre_agente || task.agentes[0] });
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !form.agente) return;
    setSaving(true);
    setError("");
    try {
      const { agente, ...fields } = form;
      await onSave({ ...fields, id: task?.id, version: task?.updated_at, agentes: agente === "-" ? [] : [agente] });
      onClose();
    } catch (reason) {
      setError(errorMessage(reason, "No se pudo guardar la tarea."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="renewal-task-title" className="relative mx-auto my-6 max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose} className="absolute right-3 top-2 rounded px-2 text-2xl enabled:cursor-pointer enabled:hover:bg-gray-100">×</button>
        <h3 id="renewal-task-title" className="mb-4 pr-8 text-lg font-semibold">Editar tarea de renovación</h3>
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={saving} className="space-y-4">
            <label className="block">Nombre<input autoFocus required maxLength={250} value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} className={control} /></label>
            <label className="block">Descripción<textarea maxLength={10000} value={form.descripcion} onChange={event => setForm({ ...form, descripcion: event.target.value })} className={`${control} min-h-20`} /></label>
            <label className="block">Referencia<input maxLength={500} value={form.referencia} onChange={event => setForm({ ...form, referencia: event.target.value })} className={control} /></label>
            <DatePartsInput label="Fecha límite" value={form.fecha_limite} onChange={value => setForm({ ...form, fecha_limite: value })} disabled={saving} />
            <label className="block">Estado<select className={`${control} enabled:cursor-pointer enabled:hover:border-blue-950`} value={form.estado} onChange={event => setForm({ ...form, estado: event.target.value })}>
              {Object.entries(taskStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <div className="space-y-1">
              <p>Agente de seguimiento</p>
              <SearchableSelect required label="Agente de seguimiento" value={form.agente} onChange={agente => setForm({ ...form, agente })} options={options} disabled={saving} />
            </div>
          </fieldset>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <div className="flex justify-end">
            <button className={primaryButton} disabled={saving || !form.nombre.trim() || !form.agente}>{saving ? "Guardando…" : "Guardar tarea"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function errorMessage(reason: unknown, fallback: string) {
  return (reason as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

export default function EnvioPropuestasAnuales({ idCuenta, agents }: { idCuenta: string; agents: Agent[] }) {
  const [data, setData] = useState<Renewal>();
  const [rango, setRango] = useState<RangoAnual>({ entre: "", hasta: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const url = `/api/v1/comercial/cuentas/${encodeURIComponent(idCuenta)}/tareas/renovacion-anual`;

  useEffect(() => {
    const request = new AbortController();
    apiClient.get<Renewal>(url, { signal: request.signal }).then(({ data }) => {
      if (request.signal.aborted) return;
      setData(data);
      setRango(data.rango ?? data.predeterminado);
    }).catch(reason => {
      if (!request.signal.aborted) setError(errorMessage(reason, "No se pudo cargar el seguimiento."));
    });
    return () => request.abort();
  }, [url]);

  if (!data) return <p className="md:col-span-3" role={error ? "alert" : "status"}>{error || "Cargando seguimiento de renovación…"}</p>;

  const { activo, tarea: task } = data;
  const currentRange = data.rango ?? data.predeterminado;
  const settingsChanged = rango.entre !== currentRange.entre || rango.hasta !== currentRange.hasta;
  const normalized = normalizeAnnualRange(rango);
  const canEdit = data.puede_editar && !saving;

  const saveSettings = async (nextActive: boolean, nextRange: RangoAnual | null) => {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    const automatic = !data.rango_manual && nextRange?.entre === data.predeterminado.entre && nextRange?.hasta === data.predeterminado.hasta;
    try {
      const response = await apiClient.put<Renewal>(url, { activo: nextActive, rango: nextActive && !automatic ? nextRange : null });
      setData(response.data);
      setRango(response.data.rango ?? response.data.predeterminado);
    } catch (reason) {
      setError(errorMessage(reason, "No se pudo guardar el seguimiento."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4 md:col-span-3">
      <div className="grid items-start gap-4 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="mb-2 font-medium" id="renewal-followup-label">¿En seguimiento para futura renovación?</h3>
          <button type="button" role="switch" aria-checked={activo} aria-busy={saving} aria-labelledby="renewal-followup-label" onClick={() => void saveSettings(!activo, null)} disabled={!canEdit}
            className="inline-flex rounded-full border border-gray-300 bg-gray-100 p-1 enabled:cursor-pointer enabled:hover:ring-2 enabled:hover:ring-blue-200 disabled:opacity-60">
            <span className={`rounded-full px-4 py-1 ${!activo ? "bg-blue-950 text-white" : ""}`}>No</span>
            <span className={`rounded-full px-4 py-1 ${activo ? "bg-blue-950 text-white" : ""}`}>Sí</span>
          </button>
        </div>
        {activo && (
          <>
            <div>
              <h3 className="mb-2 font-medium">Fecha de envío de las próximas propuestas anuales</h3>
              <div className="flex flex-wrap gap-4">
                <FechaAnual label="Entre" value={rango.entre} disabled={!canEdit} onChange={entre => setRango({ ...rango, entre })} />
                <FechaAnual label="Hasta" value={rango.hasta} disabled={!canEdit} onChange={hasta => setRango({ ...rango, hasta })} />
              </div>
            </div>
            <article className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <h3 className="font-medium">Tarea de renovación</h3>
              <p>{task?.nombre ?? taskName}</p>
              <p className="text-gray-600">{task?.nombre_agente || "Sin agente asignado"}</p>
              {task && <p className="text-gray-600">{taskStates[task.estado]}{task.fecha_limite && ` · ${task.fecha_limite}`}</p>}
              {data.puede_editar && <button type="button" disabled={!canEdit} onClick={() => setEditing(true)} className={button}>Editar tarea</button>}
            </article>
          </>
        )}
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {data.puede_editar && activo && (settingsChanged || !task) && (
        <button type="button" className={primaryButton} disabled={!canEdit || !normalized} onClick={() => void saveSettings(true, normalized)}>
          {saving ? "Guardando…" : "Guardar seguimiento"}
        </button>
      )}
      {editing && <RenewalTaskModal task={task} agents={agents} onClose={() => setEditing(false)} onSave={async tarea => {
        const response = await apiClient.put<Renewal>(url, { tarea });
        setData(response.data);
      }} />}
    </div>
  );
}
