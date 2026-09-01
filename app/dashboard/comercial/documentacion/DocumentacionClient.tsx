"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { dashboardMenu, flattenMenuEntries } from "@/app/config/dashboardMenu";
import guidesData from "./guias.json";
import laborCalendar from "./calendario-laboral.json";

type Guide = { summary: string; steps: string[] };
type Publication = {
  id_publicacion?: string;
  nombre_publicacion?: string;
  numero_publicacion?: string;
  edicion_soporte?: string;
  deadline_materiales?: string;
  fecha_publicacion?: string;
};

const guides = guidesData as Record<string, Guide>;

export default function DocumentacionClient() {
  const [area, setArea] = useState<"guides" | "documents">("guides");
  const [moduleId, setModuleId] = useState(dashboardMenu[0]?.id || "");
  const activeModule = dashboardMenu.find((module) => module.id === moduleId) || dashboardMenu[0];
  const pages = useMemo(() => activeModule ? flattenMenuEntries(activeModule.children) : [], [activeModule]);
  const [pageHref, setPageHref] = useState(pages[0]?.href || "");
  const [modal, setModal] = useState<"guide" | "labor" | "publications" | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [publicationStatus, setPublicationStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setPageHref(pages[0]?.href || "");
  }, [moduleId, pages]);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/produccion/gestiones-produccion", { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el calendario");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setPublications(Array.isArray(data.publicaciones) ? data.publicaciones : []);
        setPublicationStatus("ready");
      })
      .catch(() => active && setPublicationStatus("error"));
    return () => { active = false; };
  }, []);

  const selectedPage = pages.find((page) => page.href === pageHref) || pages[0];
  const selectedGuide = selectedPage ? guides[selectedPage.href] : undefined;
  const datedPublications = publications
    .filter((item) => item.fecha_publicacion || item.deadline_materiales)
    .sort((a, b) => String(a.fecha_publicacion || a.deadline_materiales).localeCompare(String(b.fecha_publicacion || b.deadline_materiales)));

  return (
    <main className="w-full px-5 py-7 md:px-10">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex border-b border-gray-200 bg-slate-50 p-2" role="tablist" aria-label="Apartados de documentación">
          <TopTab active={area === "guides"} onClick={() => setArea("guides")}>Guías de uso</TopTab>
          <TopTab active={area === "documents"} onClick={() => setArea("documents")}>Otros documentos</TopTab>
        </div>

        {area === "guides" ? (
          <section className="p-5 md:p-7" role="tabpanel">
            <div className="mb-5">
              <h1 className="text-2xl font-semibold text-blue-950">Guías de uso</h1>
              <p className="mt-1 text-sm text-gray-500">Elige un módulo y después una página concreta para consultar su funcionamiento.</p>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4" role="tablist" aria-label="Módulos">
              {dashboardMenu.map((module) => <SubTab key={module.id} active={module.id === activeModule?.id} onClick={() => setModuleId(module.id)}>{module.label}</SubTab>)}
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="flex flex-col gap-2" role="tablist" aria-label={`Páginas de ${activeModule?.label}`}>
                {pages.map((page) => (
                  <button key={page.href} type="button" role="tab" aria-selected={page.href === selectedPage?.href} onClick={() => setPageHref(page.href)} className={`cursor-pointer rounded-lg border px-4 py-3 text-left transition ${page.href === selectedPage?.href ? "border-blue-800 bg-blue-950 text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"}`}>
                    {page.groupLabel && <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">{page.groupLabel}</span>}
                    <span className="text-sm font-medium">{page.label}</span>
                  </button>
                ))}
              </div>
              {selectedPage && (
                <article className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{activeModule?.label}{selectedPage.groupLabel ? ` · ${selectedPage.groupLabel}` : ""}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-blue-950">{selectedPage.label}</h2>
                  <p className="mt-3 leading-7 text-gray-600">{selectedGuide?.summary || "Esta página se ha añadido al menú y todavía necesita una explicación en guias.json."}</p>
                  {!selectedGuide && <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">Guía pendiente: añade una entrada con la ruta <code>{selectedPage.href}</code>.</p>}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setModal("guide")} className="cursor-pointer rounded-md bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 hover:shadow-md">Abrir guía completa</button>
                    <Link href={selectedPage.href} className="cursor-pointer rounded-md border border-blue-950 px-4 py-2.5 text-sm font-semibold text-blue-950 transition hover:bg-blue-50">Ir a la página</Link>
                  </div>
                </article>
              )}
            </div>
          </section>
        ) : (
          <section className="p-5 md:p-7" role="tabpanel">
            <h1 className="text-2xl font-semibold text-blue-950">Otros documentos</h1>
            <p className="mt-1 text-sm text-gray-500">Calendarios de referencia para planificación interna y producción editorial.</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <DocumentCard title="Calendario laboral" description="Festivos nacionales y avisos para organizar jornadas y entregas." onClick={() => setModal("labor")} />
              <DocumentCard title="Publicaciones y deadlines" description="Fechas de publicación y entrega de materiales obtenidas de las publicaciones registradas." onClick={() => setModal("publications")} />
            </div>
          </section>
        )}
      </div>

      {modal === "guide" && selectedPage && <Modal title={`Guía: ${selectedPage.label}`} onClose={() => setModal(null)}><p className="text-gray-600">{selectedGuide?.summary || "La explicación de esta página está pendiente."}</p><ol className="mt-5 space-y-3">{selectedGuide?.steps.map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-900">{index + 1}</span><span className="pt-0.5 text-gray-700">{step}</span></li>)}</ol></Modal>}
      {modal === "labor" && <Modal title={laborCalendar.title} onClose={() => setModal(null)}><p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{laborCalendar.scope}</p><a href={laborCalendar.sourceUrl} target="_blank" rel="noreferrer" className="mb-5 inline-block cursor-pointer text-sm font-semibold text-blue-700 underline-offset-4 transition hover:text-blue-950 hover:underline">Consultar fuente oficial ↗</a><CalendarTable rows={laborCalendar.events.map((event) => ({ date: event.date, label: event.label, type: "Festivo" }))} /></Modal>}
      {modal === "publications" && <Modal title="Calendario de publicaciones y deadlines" onClose={() => setModal(null)}>{publicationStatus === "loading" && <p>Cargando publicaciones…</p>}{publicationStatus === "error" && <p className="rounded-md bg-red-50 p-3 text-red-700">No se han podido cargar las publicaciones.</p>}{publicationStatus === "ready" && <CalendarTable rows={datedPublications.flatMap((item) => { const label = item.nombre_publicacion || item.edicion_soporte || item.numero_publicacion || "Publicación"; return [{ date: item.deadline_materiales || "", label, type: "Deadline materiales" }, { date: item.fecha_publicacion || "", label, type: "Publicación" }].filter((row) => row.date); }).sort((a, b) => a.date.localeCompare(b.date))} />}</Modal>}
    </main>
  );
}

function TopTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-950 text-white shadow-sm" : "text-gray-600 hover:bg-white hover:text-blue-950"}`}>{children}</button>; }
function SubTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-blue-950 bg-blue-950 text-white" : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"}`}>{children}</button>; }
function DocumentCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-xl text-blue-950 transition group-hover:bg-blue-200" aria-hidden="true">▦</span><span className="mt-4 block text-lg font-semibold text-blue-950">{title}</span><span className="mt-2 block text-sm leading-6 text-gray-600">{description}</span><span className="mt-4 block text-sm font-semibold text-blue-700">Abrir documento →</span></button>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="documentation-modal-title" className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl"><header className="sticky top-0 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4"><h2 id="documentation-modal-title" className="text-xl font-semibold text-blue-950">{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-2xl leading-none text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700">×</button></header><div className="p-6">{children}</div></section></div>;
}

function CalendarTable({ rows }: { rows: Array<{ date: string; label: string; type: string }> }) {
  if (rows.length === 0) return <p className="rounded-md bg-gray-50 p-4 text-gray-500">No hay fechas registradas.</p>;
  return <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="min-w-full text-sm"><thead className="bg-blue-950 text-white"><tr><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Tipo</th><th className="px-4 py-3 text-left">Descripción</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.date}-${row.type}-${row.label}-${index}`} className="border-t border-gray-100 transition hover:bg-blue-50"><td className="whitespace-nowrap px-4 py-3 font-medium text-blue-950">{formatDate(row.date)}</td><td className="px-4 py-3 text-gray-500">{row.type}</td><td className="px-4 py-3 text-gray-700">{row.label}</td></tr>)}</tbody></table></div>;
}

function formatDate(value: string) { const [year, month, day] = value.slice(0, 10).split("-"); return day && month && year ? `${day}/${month}/${year}` : value || "—"; }
