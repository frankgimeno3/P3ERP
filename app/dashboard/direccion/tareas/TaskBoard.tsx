"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { TareaService } from "@/app/service/TareaService";

type Tarea = {
  id_tarea: string;
  agente: string;
  titulo: string;
  contenido: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  lista_tareas: string;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  relacionada_con_cuenta: string;
  relacionada_con_contacto: string;
  relacionada_con_contenido: string;
  relacionada_con_feria: string;
  relacionada_con_proveedor: string;
  created_at?: string;
  updated_at?: string;
};

type Lista = {
  id_lista_tareas: string;
  nombre_lista_tareas: string;
  id_agente: string;
  tareas_order_array: { id_tarea: string; posicion: number }[];
  orden_lista: number;
};

type TaskBoardProps = {
  agenteId: string;
  embedded?: boolean;
};

type RelationOptions = {
  cuentas: any[];
  contactos: any[];
  contenidos: any[];
  ferias: any[];
  proveedores: any[];
};

type RelationKind = keyof RelationOptions;

type RelationOption = {
  value: string;
  label: string;
  detail: string;
  search: string;
};

const estados = ["pendiente", "en curso", "completada", "bloqueada"];
const prioridades = ["alta", "media", "baja"];
const emptyRelations = {
  relacionada_con_cuenta: "",
  relacionada_con_contacto: "",
  relacionada_con_contenido: "",
  relacionada_con_feria: "",
  relacionada_con_proveedor: "",
};

function emptyTaskForm(listaTareas = ""): Tarea {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id_tarea: "",
    agente: "",
    titulo: "",
    contenido: "",
    descripcion: "",
    estado: "pendiente",
    prioridad: "media",
    lista_tareas: listaTareas,
    fecha_desde: today,
    fecha_hasta: today,
    ...emptyRelations,
  };
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

function taskOccursOn(tarea: Tarea, day: Date) {
  if (!tarea.fecha_desde || !tarea.fecha_hasta) return false;
  const target = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  return target >= new Date(`${tarea.fecha_desde}T00:00:00`).getTime()
    && target <= new Date(`${tarea.fecha_hasta}T23:59:59`).getTime();
}

function taskOverlapsMonth(tarea: Tarea, month: Date) {
  if (!tarea.fecha_desde || !tarea.fecha_hasta) return false;
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).getTime();
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59).getTime();
  return new Date(`${tarea.fecha_desde}T00:00:00`).getTime() <= monthEnd
    && new Date(`${tarea.fecha_hasta}T23:59:59`).getTime() >= monthStart;
}

export default function TaskBoard({ agenteId, embedded = false }: TaskBoardProps) {
  const [activeTab, setActiveTab] = useState<"tareas" | "calendario">("tareas");
  const [listas, setListas] = useState<Lista[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [taskModal, setTaskModal] = useState<Tarea | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [listModal, setListModal] = useState<Lista | null>(null);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [moveDeleteTo, setMoveDeleteTo] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [taskForm, setTaskForm] = useState<Tarea>(emptyTaskForm());
  const [relationOptions, setRelationOptions] = useState<RelationOptions>({ cuentas: [], contactos: [], contenidos: [], ferias: [], proveedores: [] });
  const [listName, setListName] = useState("");

  const loadData = async () => {
    if (!agenteId) return;
    try {
      setLoading(true);
      setError("");
      const [listasData, tareasData] = await Promise.all([
        TareaService.getListas({ agente: agenteId }),
        TareaService.getTareas({ agente: agenteId }),
      ]);
      const normalizedListas = Array.isArray(listasData) ? listasData : [];
      setListas(normalizedListas);
      setTareas(Array.isArray(tareasData) ? tareasData : []);
      setTaskForm((current) => ({ ...current, lista_tareas: current.lista_tareas || normalizedListas[0]?.id_lista_tareas || "" }));
    } catch (error: any) {
      setError(error?.message || "No se han podido cargar las tareas.");
      setListas([]);
      setTareas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [agenteId]);

  useEffect(() => {
    TareaService.getRelationOptions()
      .then((data) => setRelationOptions({
        cuentas: Array.isArray(data.cuentas) ? data.cuentas : [],
        contactos: Array.isArray(data.contactos) ? data.contactos : [],
        contenidos: Array.isArray(data.contenidos) ? data.contenidos : [],
        ferias: Array.isArray(data.ferias) ? data.ferias : [],
        proveedores: Array.isArray(data.proveedores) ? data.proveedores : [],
      }))
      .catch(() => setRelationOptions({ cuentas: [], contactos: [], contenidos: [], ferias: [], proveedores: [] }));
  }, []);

  const tareasById = useMemo(() => new Map(tareas.map((tarea) => [tarea.id_tarea, tarea])), [tareas]);

  const orderedTasksForList = (lista: Lista) => {
    const orderedIds = [...(lista.tareas_order_array || [])].sort((a, b) => a.posicion - b.posicion).map((item) => item.id_tarea);
    const ordered = orderedIds.map((id) => tareasById.get(id)).filter(Boolean) as Tarea[];
    const missing = tareas.filter((tarea) => tarea.lista_tareas === lista.id_lista_tareas && !orderedIds.includes(tarea.id_tarea));
    return [...ordered, ...missing];
  };

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const monthTasks = useMemo(() => {
    return tareas
      .filter((tarea) => tarea.estado !== "completada" && taskOverlapsMonth(tarea, month))
      .sort((a, b) => new Date(a.fecha_desde || 0).getTime() - new Date(b.fecha_desde || 0).getTime());
  }, [month, tareas]);

  const createTask = async () => {
    try {
      const created = await TareaService.createTarea({ ...taskForm, agente: agenteId, lista_tareas: taskForm.lista_tareas || listas[0]?.id_lista_tareas || "" });
      setTareas((current) => [...current, created]);
      setCreateTaskOpen(false);
      setTaskForm(emptyTaskForm(listas[0]?.id_lista_tareas || ""));
      await loadData();
    } catch (error: any) {
      setError(error?.message || "No se ha podido crear la tarea.");
    }
  };

  const saveTask = async (task: Tarea) => {
    try {
      const saved = await TareaService.updateTarea(task.id_tarea, task);
      setTareas((current) => current.map((item) => (item.id_tarea === saved.id_tarea ? saved : item)));
      setTaskModal(null);
      await loadData();
    } catch (error: any) {
      setError(error?.message || "No se ha podido guardar la tarea.");
    }
  };

  const deleteTask = async (task: Tarea) => {
    if (!window.confirm("Eliminar tarea?")) return;
    await TareaService.deleteTarea(task.id_tarea);
    setTaskModal(null);
    await loadData();
  };

  const moveTaskOrder = async (lista: Lista, tarea: Tarea, direction: -1 | 1) => {
    const tasks = orderedTasksForList(lista);
    const index = tasks.findIndex((item) => item.id_tarea === tarea.id_tarea);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= tasks.length) return;
    const reordered = [...tasks];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    const tareas_order_array = reordered.map((item, position) => ({ id_tarea: item.id_tarea, posicion: position }));
    setListas((current) => current.map((item) => (
      item.id_lista_tareas === lista.id_lista_tareas ? { ...item, tareas_order_array } : item
    )));
    await TareaService.updateLista(lista.id_lista_tareas, {
      ...lista,
      tareas_order_array,
    });
    await loadData();
  };

  const createList = async () => {
    if (!listName.trim()) return;
    await TareaService.createLista({ id_agente: agenteId, nombre_lista_tareas: listName.trim() });
    setCreateListOpen(false);
    setListName("");
    await loadData();
  };

  const saveList = async () => {
    if (!listModal) return;
    await TareaService.updateLista(listModal.id_lista_tareas, listModal);
    setListModal(null);
    await loadData();
  };

  const deleteList = async () => {
    if (!listModal) return;
    await TareaService.deleteLista(listModal.id_lista_tareas, moveDeleteTo);
    setListModal(null);
    setMoveDeleteTo("");
    await loadData();
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-gray-100 p-6 px-12 text-gray-800"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded bg-white shadow-sm">
          <button type="button" onClick={() => setActiveTab("tareas")} className={`px-5 py-2 text-sm ${activeTab === "tareas" ? "bg-blue-950 text-white" : "text-gray-700 hover:bg-gray-50"}`}>Tareas</button>
          <button type="button" onClick={() => setActiveTab("calendario")} className={`px-5 py-2 text-sm ${activeTab === "calendario" ? "bg-blue-950 text-white" : "text-gray-700 hover:bg-gray-50"}`}>Calendario</button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setCreateListOpen(true)} className="rounded border border-blue-950 px-4 py-2 text-sm text-blue-950 hover:bg-blue-50">Crear lista</button>
          <button type="button" onClick={() => setCreateTaskOpen(true)} className="rounded bg-blue-950 px-4 py-2 text-sm text-white hover:bg-blue-900">Agregar tarea</button>
        </div>
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="mb-4 bg-white p-4 text-sm text-gray-500 shadow-sm">Cargando tareas...</div>}

      {activeTab === "tareas" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {listas.map((lista) => (
            <div key={lista.id_lista_tareas} className="min-w-72 max-w-72 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-blue-950">{lista.nombre_lista_tareas}</p>
                  <p className="text-xs text-gray-500">{orderedTasksForList(lista).length} tareas</p>
                </div>
                <button type="button" onClick={() => { setListModal(lista); setMoveDeleteTo(""); }} className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-white">Editar</button>
              </div>
              <div className="flex min-h-80 flex-col gap-2 p-3">
                {orderedTasksForList(lista).map((tarea, tareaIndex, listaTareas) => {
                  const isFirst = tareaIndex === 0;
                  const isLast = tareaIndex === listaTareas.length - 1;
                  return (
                  <div
                    key={tarea.id_tarea}
                    role="button"
                    tabIndex={0}
                    onClick={() => setTaskModal(tarea)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setTaskModal(tarea);
                      }
                    }}
                    className="cursor-pointer border border-gray-200 bg-white p-3 text-left shadow-sm hover:border-blue-950 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-800">{tarea.titulo || "Sin titulo"}</p>
                      <span className="text-xs text-gray-500">{tarea.prioridad}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs text-gray-600">{tarea.contenido || "-"}</p>
                    {tarea.descripcion && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{tarea.descripcion}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{tarea.estado}</span>
                      <span onClick={(event) => event.stopPropagation()} className="flex gap-1">
                        <button
                          type="button"
                          aria-label="Subir tarea"
                          disabled={isFirst}
                          onClick={() => moveTaskOrder(lista, tarea, -1)}
                          className="rounded border border-gray-300 p-1 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-300"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Bajar tarea"
                          disabled={isLast}
                          onClick={() => moveTaskOrder(lista, tarea, 1)}
                          className="rounded border border-gray-300 p-1 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-300"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </span>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "calendario" && (
        <div className="grid gap-5 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded border px-3 py-1 hover:bg-gray-50">{"<"}</button>
              <p className="font-semibold capitalize text-blue-950">{monthLabel(month)}</p>
              <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded border px-3 py-1 hover:bg-gray-50">{">"}</button>
            </div>
            <div className="grid grid-cols-7 border border-gray-200 text-xs">
              {["L", "M", "X", "J", "V", "S", "D"].map((day) => <div key={day} className="bg-gray-100 p-2 text-center font-semibold">{day}</div>)}
              {calendarDays.map((day) => {
                const dayTasks = tareas.filter((tarea) => tarea.estado !== "completada" && taskOccursOn(tarea, day));
                return (
                  <div key={day.toISOString()} className={`min-h-24 border-t border-gray-200 p-2 ${day.getMonth() === month.getMonth() ? "bg-white" : "bg-gray-50 text-gray-400"}`}>
                    <p className="font-medium">{day.getDate()}</p>
                    {dayTasks.slice(0, 2).map((tarea) => <p key={tarea.id_tarea} className="mt-1 truncate rounded bg-blue-50 px-1 text-blue-950">{tarea.titulo}</p>)}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-3 font-semibold text-blue-950">Pendientes del mes</p>
            <div className="flex flex-col gap-2">
              {monthTasks.length === 0 && <p className="text-sm text-gray-500">No hay tareas pendientes este mes.</p>}
              {monthTasks.map((tarea) => (
                <button key={tarea.id_tarea} type="button" onClick={() => setTaskModal(tarea)} className="border border-gray-200 p-3 text-left hover:bg-gray-50">
                  <p className="font-medium">{tarea.titulo}</p>
                  <p className="text-xs text-gray-500">{tarea.estado} - {tarea.prioridad}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {createTaskOpen && (
        <TaskModal
          title="Nueva tarea"
          task={{ ...taskForm, id_tarea: "", agente: agenteId } as Tarea}
          listas={listas}
          relationOptions={relationOptions}
          onChange={(task) => setTaskForm(task)}
          onClose={() => setCreateTaskOpen(false)}
          onSave={createTask}
        />
      )}

      {taskModal && (
        <TaskModal
          title="Editar tarea"
          task={taskModal}
          listas={listas}
          relationOptions={relationOptions}
          onChange={setTaskModal}
          onClose={() => setTaskModal(null)}
          onSave={() => saveTask(taskModal)}
          onDelete={() => deleteTask(taskModal)}
        />
      )}

      {createListOpen && (
        <SimpleModal title="Crear lista" onClose={() => setCreateListOpen(false)}>
          <input value={listName} onChange={(event) => setListName(event.target.value)} placeholder="Nombre de lista" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setCreateListOpen(false)} className="rounded border px-4 py-2 text-sm">Cancelar</button>
            <button type="button" onClick={createList} className="rounded bg-blue-950 px-4 py-2 text-sm text-white">Crear</button>
          </div>
        </SimpleModal>
      )}

      {listModal && (
        <SimpleModal title="Editar lista" onClose={() => setListModal(null)}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nombre</span>
            <input value={listModal.nombre_lista_tareas} onChange={(event) => setListModal({ ...listModal, nombre_lista_tareas: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">Orden</span>
            <input type="number" value={listModal.orden_lista} onChange={(event) => setListModal({ ...listModal, orden_lista: Number(event.target.value) })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">Mover tareas a otra lista si se elimina</span>
            <select value={moveDeleteTo} onChange={(event) => setMoveDeleteTo(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="">Solo eliminar si esta vacia</option>
              {listas.filter((lista) => lista.id_lista_tareas !== listModal.id_lista_tareas).map((lista) => <option key={lista.id_lista_tareas} value={lista.id_lista_tareas}>{lista.nombre_lista_tareas}</option>)}
            </select>
          </label>
          <div className="mt-4 flex justify-between gap-2">
            <button type="button" onClick={deleteList} className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">Eliminar</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setListModal(null)} className="rounded border px-4 py-2 text-sm">Cancelar</button>
              <button type="button" onClick={saveList} className="rounded bg-blue-950 px-4 py-2 text-sm text-white">Guardar</button>
            </div>
          </div>
        </SimpleModal>
      )}
    </div>
  );
}

function SimpleModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-blue-950">{title}</p>
          <button type="button" onClick={onClose} className="text-xl text-gray-500 hover:text-gray-800">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TaskModal({
  title,
  task,
  listas,
  relationOptions,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  title: string;
  task: Tarea;
  listas: Lista[];
  relationOptions: RelationOptions;
  onChange: (task: Tarea) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const sinFecha = !task.fecha_desde && !task.fecha_hasta;
  const fechasValidas = sinFecha || Boolean(task.fecha_desde && task.fecha_hasta && task.fecha_hasta >= task.fecha_desde);
  const relationConfig = useMemo(() => buildRelationConfig(relationOptions), [relationOptions]);
  const [relationModal, setRelationModal] = useState<RelationKind | null>(null);

  const relationLabels: Record<RelationKind, string> = {
    cuentas: "Cuenta",
    contactos: "Contacto",
    contenidos: "Contenido",
    ferias: "Feria",
    proveedores: "Proveedor",
  };

  const relationFields: Record<RelationKind, keyof Tarea> = {
    cuentas: "relacionada_con_cuenta",
    contactos: "relacionada_con_contacto",
    contenidos: "relacionada_con_contenido",
    ferias: "relacionada_con_feria",
    proveedores: "relacionada_con_proveedor",
  };

  const setRelation = (kind: RelationKind, value: string) => {
    onChange({ ...task, [relationFields[kind]]: value });
    setRelationModal(null);
  };

  return (
    <SimpleModal title={title} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Titulo</span>
          <input value={task.titulo} onChange={(event) => onChange({ ...task, titulo: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Contenido</span>
          <textarea value={task.contenido} onChange={(event) => onChange({ ...task, contenido: event.target.value })} className="min-h-28 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Descripcion</span>
          <textarea value={task.descripcion} onChange={(event) => onChange({ ...task, descripcion: event.target.value })} className="min-h-20 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={sinFecha}
            onChange={(event) => {
              if (event.target.checked) {
                onChange({ ...task, fecha_desde: null, fecha_hasta: null });
              } else {
                const today = new Date().toISOString().slice(0, 10);
                onChange({ ...task, fecha_desde: today, fecha_hasta: today });
              }
            }}
          />
          Sin fecha
        </label>
        {!sinFecha && (
          <div className="grid gap-3 md:grid-cols-2">
            <DateFields label="Fecha desde" value={task.fecha_desde} onChange={(value) => onChange({ ...task, fecha_desde: value })} />
            <DateFields label="Fecha hasta" value={task.fecha_hasta} onChange={(value) => onChange({ ...task, fecha_hasta: value })} />
          </div>
        )}
        {!fechasValidas && <p className="text-sm text-red-600">La fecha hasta no puede ser anterior a la fecha desde.</p>}
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Lista</span>
            <select value={task.lista_tareas} onChange={(event) => onChange({ ...task, lista_tareas: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
              {listas.map((lista) => <option key={lista.id_lista_tareas} value={lista.id_lista_tareas}>{lista.nombre_lista_tareas}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Estado</span>
            <select value={task.estado} onChange={(event) => onChange({ ...task, estado: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
              {estados.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Prioridad</span>
            <select value={task.prioridad} onChange={(event) => onChange({ ...task, prioridad: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
              {prioridades.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}
            </select>
          </label>
        </div>
        <details className="border-t border-gray-200 pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-blue-950">Relacionar con</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(Object.keys(relationLabels) as RelationKind[]).map((kind) => (
              <RelationButton
                key={kind}
                label={relationLabels[kind]}
                value={String(task[relationFields[kind]] || "")}
                options={relationConfig[kind]}
                onOpen={() => setRelationModal(kind)}
                onClear={() => onChange({ ...task, [relationFields[kind]]: "" })}
              />
            ))}
          </div>
        </details>
      </div>
      <div className="mt-5 flex justify-between gap-2">
        {onDelete ? <button type="button" onClick={onDelete} className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">Eliminar</button> : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">Cancelar</button>
          <button type="button" onClick={onSave} disabled={!task.titulo || !task.lista_tareas || !fechasValidas} className="rounded bg-blue-950 px-4 py-2 text-sm text-white disabled:bg-gray-400">Guardar</button>
        </div>
      </div>
      {relationModal && (
        <RelationPickerModal
          title={`Seleccionar ${relationLabels[relationModal].toLowerCase()}`}
          options={relationConfig[relationModal]}
          selectedValue={String(task[relationFields[relationModal]] || "")}
          onSelect={(value) => setRelation(relationModal, value)}
          onClose={() => setRelationModal(null)}
        />
      )}
    </SimpleModal>
  );
}

function DateFields({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) {
  const iso = value?.slice(0, 10) || "";
  const [initialYear = "", initialMonth = "", initialDay = ""] = iso ? iso.split("-") : [];
  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    const [nextYear = "", nextMonth = "", nextDay = ""] = value?.slice(0, 10).split("-") || [];
    setDay(nextDay);
    setMonth(nextMonth);
    setYear(nextYear);
  }, [value]);

  const update = (nextDay: string, nextMonth: string, nextYear: string) => {
    if (nextDay.length === 2 && nextMonth.length === 2 && nextYear.length === 4) {
      const candidate = `${nextYear}-${nextMonth}-${nextDay}`;
      const parsed = new Date(`${candidate}T00:00:00`);
      if (parsed.getFullYear() === Number(nextYear) && parsed.getMonth() + 1 === Number(nextMonth) && parsed.getDate() === Number(nextDay)) {
        onChange(candidate);
      }
    }
  };

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
        <input aria-label={`${label} dia`} inputMode="numeric" maxLength={2} placeholder="dd" value={day} onChange={(event) => { setDay(event.target.value); update(event.target.value, month, year); }} className="w-full rounded border border-gray-300 px-2 py-2 text-sm" />
        <input aria-label={`${label} mes`} inputMode="numeric" maxLength={2} placeholder="mm" value={month} onChange={(event) => { setMonth(event.target.value); update(day, event.target.value, year); }} className="w-full rounded border border-gray-300 px-2 py-2 text-sm" />
        <input aria-label={`${label} ano`} inputMode="numeric" maxLength={4} placeholder="yyyy" value={year} onChange={(event) => { setYear(event.target.value); update(day, month, event.target.value); }} className="w-full rounded border border-gray-300 px-2 py-2 text-sm" />
      </div>
    </fieldset>
  );
}

function buildRelationConfig(options: RelationOptions): Record<RelationKind, RelationOption[]> {
  return (
    {
      cuentas: options.cuentas.map((item) => option(item.id_cuenta, item.nombre_empresa || item.id_cuenta, [item.id_cuenta, item.pais_cuenta, item.correo_principal])),
      contactos: options.contactos.map((item) => option(item.id_contacto, item.nombre_completo_contacto || `${item.nombre_contacto || ""} ${item.apellidos_contacto || ""}`.trim() || item.id_contacto, [item.id_contacto, item.nombre_empresa, item.email_contacto, item.telefono_contacto])),
      contenidos: options.contenidos.map((item) => option(item.id_contenido, item.contenido || item.especificaciones_contenido || item.id_contenido, [item.id_contenido, item.nombre_cuenta, item.estado, item.servicio])),
      ferias: options.ferias.map((item) => option(item.id_feria, item.titulo_especifico_edicion || item.nombre_feria || item.id_feria, [item.id_feria, item.nombre_feria, item.pais, item.ciudad])),
      proveedores: options.proveedores.map((item) => option(item.id_proveedor, item.nombre_proveedor || item.id_proveedor, [item.id_proveedor, item.nombre_fiscal_proveedor, item.vat_code, item.pais_proveedor])),
    }
  );
}

function option(value: string, label: string, details: unknown[]): RelationOption {
  const detail = details.filter(Boolean).join(" · ");
  return {
    value: value || "",
    label: label || value || "Sin nombre",
    detail,
    search: `${value || ""} ${label || ""} ${detail}`.toLowerCase(),
  };
}

function RelationButton({
  label,
  value,
  options,
  onOpen,
  onClear,
}: {
  label: string;
  value: string;
  options: RelationOption[];
  onOpen: () => void;
  onClear: () => void;
}) {
  const selected = options.find((item) => item.value === value);
  return (
    <div className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <div className="flex gap-2">
        <button type="button" onClick={onOpen} className="min-h-10 flex-1 rounded border border-gray-300 px-3 py-2 text-left text-sm hover:border-blue-950 hover:bg-blue-50">
          {selected ? selected.label : "Sin relacion"}
        </button>
        {value && (
          <button type="button" onClick={onClear} className="rounded border border-gray-300 px-3 text-gray-600 hover:bg-gray-50" aria-label={`Quitar ${label}`}>
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function RelationPickerModal({
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  title: string;
  options: RelationOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options.filter((item) => item.value);
    return options.filter((item) => item.value && item.search.includes(term));
  }, [options, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query]);

  return (
    <SimpleModal title={title} onClose={onClose}>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Buscar</span>
        <div className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full outline-none" placeholder="Filtrar por cualquier campo" />
        </div>
      </label>
      <div className="mt-4 overflow-hidden border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-blue-950 text-left text-white">
            <tr>
              <th className="p-2">Nombre</th>
              <th className="p-2">Datos</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr
                key={item.value}
                onClick={() => onSelect(item.value)}
                className={`cursor-pointer border-t border-gray-200 hover:bg-blue-50 ${selectedValue === item.value ? "bg-blue-50" : ""}`}
              >
                <td className="p-2 font-medium text-blue-950">{item.label}</td>
                <td className="p-2 text-gray-600">{item.detail || item.value}</td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={2} className="p-4 text-gray-500">No hay resultados.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" onClick={() => onSelect("")} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Sin relacion</button>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400">Anterior</button>
          <span className="text-sm text-gray-600">Pagina {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400">Siguiente</button>
        </div>
      </div>
    </SimpleModal>
  );
}
