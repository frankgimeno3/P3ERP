"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { NewsletterService } from "@/app/service/NewsletterService";

function splitDate(value = "") {
  const [dd = "", mm = "", yyyy = ""] = String(value || "").split(/[/-]/);
  return { dd, mm, yyyy };
}

function joinDate(parts: any) {
  return [parts.dd || "", parts.mm || "", parts.yyyy || ""].join("/");
}

function DateInputs({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const parts = splitDate(value);
  const update = (field: string, nextValue: string) => {
    const next = { ...parts, [field]: nextValue.replace(/\D/g, "") };
    onChange(joinDate(next));
  };
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-gray-500">{label}</p>
      <div className="flex gap-2">
        <input value={parts.dd || ""} onChange={(event) => update("dd", event.target.value.slice(0, 2))} placeholder="dd" className="w-16 rounded border px-2 py-2 text-sm" />
        <input value={parts.mm || ""} onChange={(event) => update("mm", event.target.value.slice(0, 2))} placeholder="mm" className="w-16 rounded border px-2 py-2 text-sm" />
        <input value={parts.yyyy || ""} onChange={(event) => update("yyyy", event.target.value.slice(0, 4))} placeholder="yyyy" className="w-24 rounded border px-2 py-2 text-sm" />
      </div>
    </div>
  );
}

export default function NewsletterDetallePage() {
  const router = useRouter();
  const params = useParams<{ id_newsletter: string }>();
  const [newsletter, setNewsletter] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id_newsletter) return;
    setLoading(true);
    NewsletterService.getNewsletterById(params.id_newsletter)
      .then((data) => {
        setNewsletter(data);
        setForm(data);
      })
      .catch((error) => setError(error?.message || "No se ha podido cargar el newsletter."))
      .finally(() => setLoading(false));
  }, [params.id_newsletter]);

  const save = async () => {
    if (!newsletter?.id_newsletter) return;
    setSaving(true);
    setError("");
    try {
      const updated = await NewsletterService.updateNewsletter(newsletter.id_publicacion || newsletter.id_newsletter, form);
      setNewsletter(updated);
      setForm(updated);
    } catch (error: any) {
      setError(error?.message || "No se ha podido guardar el newsletter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-700">
      <MiddleNav tituloprincipal="Newsletter" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10">
        <button type="button" onClick={() => router.push("/dashboard/produccion/publicaciones")} className="mb-5 rounded bg-white px-4 py-2 text-sm text-blue-950 shadow-sm hover:bg-gray-50">
          Volver
        </button>
        {loading && <div className="bg-white p-6 text-sm text-gray-500">Cargando newsletter...</div>}
        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {!loading && newsletter && (
          <section className="bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Newsletter</p>
                <h1 className="text-xl font-semibold text-blue-950">{newsletter.nombre_newsletter || newsletter.titulo || newsletter.id_newsletter}</h1>
                <p className="mt-1 text-sm text-gray-500">{newsletter.edicion || "-"}</p>
              </div>
              <button type="button" onClick={save} disabled={saving} className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:bg-gray-400">
                Guardar
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                ["nombre_newsletter", "Nombre newsletter"],
                ["edicion", "Edicion"],
                ["numero_publicacion", "Numero"],
                ["link", "Link"],
                ["estado", "Estado"],
              ].map(([field, label]) => (
                <label key={field} className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span>
                  <input value={form[field] || ""} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="w-full rounded border px-3 py-2" />
                </label>
              ))}
              <DateInputs label="deadline_materiales" value={form.deadline_materiales || ""} onChange={(value) => setForm({ ...form, deadline_materiales: value })} />
              <DateInputs label="fecha_publicacion" value={form.fecha_publicacion || ""} onChange={(value) => setForm({ ...form, fecha_publicacion: value })} />
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Cuenta</p>
                {newsletter.cuenta_id ? (
                  <Link href={`/dashboard/comercial/cuentas/${newsletter.cuenta_id}`} className="mt-2 inline-flex text-sm text-blue-950 underline">
                    {newsletter.nombre_cuenta || newsletter.cuenta_id}
                  </Link>
                ) : <p className="mt-2 text-sm">-</p>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Contenido</p>
                {newsletter.contenido_id ? (
                  <Link href={`/dashboard/produccion/hoja_produccion/contenidos/${newsletter.contenido_id}`} className="mt-2 inline-flex text-sm text-blue-950 underline">
                    {newsletter.contenido || newsletter.contenido_id}
                  </Link>
                ) : <p className="mt-2 text-sm">-</p>}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
