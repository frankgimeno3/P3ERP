"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

const dateValue = (d: string, m: string, y: string) =>
  `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;

export default function AnadirTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAmbito = (searchParams.get("ambito") as "P3" | "GM") || "P3";
  
  const now = new Date();
  const [providers, setProviders] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState("");
  const [withProvider, setWithProvider] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ambito, setAmbito] = useState<"P3" | "GM">(initialAmbito);

  const [form, setForm] = useState({
    day: String(now.getDate()),
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    custom: "",
    base: "",
    total: "",
    importe: "",
    payment: "efectivo",
    tarjeta_ultimos_digitos: "",
    tarjeta_banco: "",
  });

  useEffect(() => {
    fetch("/api/v1/admin/proveedores")
      .then((r) => r.json())
      .then(setProviders)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  async function submit() {
    // Validation
    const isP3 = ambito === "P3";
    const baseValid = isP3 && form.base !== "";
    const importeValid = !isP3 && form.importe !== "";
    const totalValid = isP3 && form.total !== "";
    const paymentValid = form.payment === "efectivo" || 
      (form.payment === "tarjeta" && form.tarjeta_ultimos_digitos && form.tarjeta_banco);

    if (
      !file ||
      !form.day ||
      !form.month ||
      !form.year ||
      (!provider && withProvider) ||
      (!withProvider && !form.custom.trim()) ||
      (isP3 && (!baseValid || !totalValid)) ||
      (!isP3 && !importeValid) ||
      !paymentValid
    ) {
      setError("Completa todos los campos requeridos y adjunta el PDF.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Upload PDF
      const presign = await fetch("/api/v1/mediateca/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/pdf",
          prefix: `tickets/${ambito.toLowerCase()}`,
        }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).message);
        return r.json();
      });

      const upload = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });

      if (!upload.ok) throw new Error("No se pudo subir el PDF.");

      // Ensure folder exists
      const folderPath = `tickets/${ambito.toLowerCase()}`;
      try {
        await fetch(`/api/v1/mediateca/folders/by-path?path=${folderPath}`);
      } catch {
        await fetch("/api/v1/mediateca/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: ambito.toLowerCase(),
            path: "tickets",
          }),
        });
      }

      // Register media
      const mediaResponse = await fetch("/api/v1/mediateca/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: presign.mediaId,
          contentName: file.name,
          s3Key: presign.s3Key,
          cdnUrl: presign.cdnUrl,
          folderPath,
          contentType: file.type || "application/pdf",
          type: "pdf",
        }),
      });

      if (!mediaResponse.ok)
        throw new Error("El PDF se subió, pero no pudo registrarse en la mediateca.");

      // Create ticket
      const ticketPayload = {
        ambito,
        fecha_ticket: dateValue(form.day, form.month, form.year),
        id_proveedor: withProvider ? provider?.id_proveedor : null,
        nombre_personalizado_proveedor: withProvider ? "" : form.custom,
        forma_pago: form.payment,
        tarjeta_ultimos_digitos: form.payment === "tarjeta" ? form.tarjeta_ultimos_digitos : "",
        tarjeta_banco: form.payment === "tarjeta" ? form.tarjeta_banco : "",
        documento_src: presign.cdnUrl,
        ...(isP3 && {
          base_imponible: form.base,
          importe_total: form.total,
        }),
        ...(!isP3 && {
          importe: form.importe,
        }),
      };

      const response = await fetch("/api/v1/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketPayload),
      });

      if (!response.ok) throw new Error((await response.json()).message);

      router.push(`/dashboard/administracion/proveedores/tickets?tab=${ambito}`);
    } catch (e: any) {
      setError(e.message || "No se pudo guardar.");
      setSaving(false);
    }
  }

  const filtered = providers.filter((p) =>
    `${p.id_proveedor} ${p.nombre_proveedor}`.toLowerCase().includes(query.toLowerCase())
  );

  const isP3 = ambito === "P3";

  return (
    <div className="min-h-screen bg-gray-100 text-gray-700">
      <MiddleNav tituloprincipal="Añadir ticket" />
      <main className="mx-auto max-w-3xl p-6 lg:p-12">
        <section className="space-y-6 rounded-xl bg-white p-6 shadow">
          {/* Ambito selector */}
          <div>
            <label className="block text-sm font-semibold mb-2">Ámbito</label>
            <select
              value={ambito}
              onChange={(e) => setAmbito(e.target.value as "P3" | "GM")}
              className="w-full rounded border px-3 py-2"
            >
              <option value="P3">P3</option>
              <option value="GM">GM</option>
            </select>
          </div>

          {/* Provider selector */}
          <label className="flex cursor-pointer items-center gap-3 text-gray-700">
            Proveedor registrado
            <button
              type="button"
              role="switch"
              aria-checked={withProvider}
              onClick={() => {
                setWithProvider((v) => !v);
                setProvider(null);
              }}
              className={`relative h-7 w-12 cursor-pointer rounded-full transition hover:ring-2 hover:ring-blue-200 ${
                withProvider ? "bg-blue-950" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  withProvider ? "left-6" : "left-1"
                }`}
              />
            </button>
            {withProvider ? "Sí" : "No"}
          </label>

          {withProvider ? (
            <button
              type="button"
              onClick={() => setModal(true)}
              className="w-full cursor-pointer rounded border p-3 text-left transition hover:bg-blue-50 text-gray-700"
            >
              {provider
                ? `${provider.nombre_proveedor} (${provider.id_proveedor})`
                : "Seleccionar proveedor"}
            </button>
          ) : (
            <label className="block">
              <span className="text-gray-700">Nombre personalizado</span>
              <input
                value={form.custom}
                onChange={(e) => setForm({ ...form, custom: e.target.value })}
                className="mt-1 w-full rounded border p-2 text-gray-700"
              />
            </label>
          )}

          {/* Date */}
          <fieldset>
            <legend className="text-gray-700 font-semibold">Fecha</legend>
            <div className="mt-2 flex gap-2">
              {[
                ["day", "dd", 2],
                ["month", "mm", 2],
                ["year", "yyyy", 4],
              ].map(([key, label, max]) => (
                <input
                  key={key}
                  aria-label={label}
                  maxLength={Number(max)}
                  value={(form as any)[key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [key]: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder={label}
                  className="w-24 rounded border p-2 text-gray-700"
                />
              ))}
            </div>
          </fieldset>

          {/* Amounts - conditionally rendered */}
          {isP3 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-gray-700 font-semibold">Base imponible</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.base}
                  onChange={(e) => setForm({ ...form, base: e.target.value })}
                  className="mt-1 w-full rounded border p-2 text-gray-700"
                />
              </label>
              <label className="block">
                <span className="text-gray-700 font-semibold">Importe total</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.total}
                  onChange={(e) => setForm({ ...form, total: e.target.value })}
                  className="mt-1 w-full rounded border p-2 text-gray-700"
                />
              </label>
            </div>
          ) : (
            <label className="block">
              <span className="text-gray-700 font-semibold">Importe</span>
              <input
                type="number"
                step="0.01"
                value={form.importe}
                onChange={(e) => setForm({ ...form, importe: e.target.value })}
                className="mt-1 w-full rounded border p-2 text-gray-700"
              />
            </label>
          )}

          {/* Payment method */}
          <div>
            <label className="block">
              <span className="text-gray-700 font-semibold">Forma de pago</span>
              <select
                value={form.payment}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment: e.target.value,
                    tarjeta_ultimos_digitos: "",
                    tarjeta_banco: "",
                  })
                }
                className="mt-1 w-full rounded border p-2 text-gray-700"
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </label>
          </div>

          {/* Card details - shown if tarjeta selected */}
          {form.payment === "tarjeta" && (
            <div className="grid gap-4 sm:grid-cols-2 bg-blue-50 p-4 rounded border border-blue-200">
              <label className="block">
                <span className="text-gray-700 font-semibold">Últimos 4 dígitos</span>
                <input
                  type="text"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={form.tarjeta_ultimos_digitos}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tarjeta_ultimos_digitos: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="mt-1 w-full rounded border p-2 text-gray-700"
                  required
                />
              </label>
              <label className="block">
                <span className="text-gray-700 font-semibold">Banco</span>
                <input
                  type="text"
                  value={form.tarjeta_banco}
                  onChange={(e) =>
                    setForm({ ...form, tarjeta_banco: e.target.value })
                  }
                  className="mt-1 w-full rounded border p-2 text-gray-700"
                  required
                />
              </label>
            </div>
          )}

          {/* File upload */}
          <label className="block">
            <span className="text-gray-700 font-semibold">PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full cursor-pointer rounded border p-2 file:cursor-pointer text-gray-700"
            />
          </label>

          {/* Error message */}
          {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}

          {/* Submit button */}
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="cursor-pointer rounded bg-blue-950 px-5 py-2 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar ticket"}
          </button>
        </section>
      </main>

      {/* Provider modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[80vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-6"
          >
            <button
              aria-label="Cerrar"
              type="button"
              onClick={() => setModal(false)}
              className="absolute right-3 top-2 cursor-pointer text-3xl hover:text-blue-700"
            >
              ×
            </button>
            <h2 className="mb-4 text-lg font-semibold text-blue-950">
              Seleccionar proveedor
            </h2>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="mb-3 w-full rounded border p-2 text-gray-700"
            />
            <div className="space-y-2">
              {filtered.map((p) => (
                <button
                  key={p.id_proveedor}
                  type="button"
                  onClick={() => {
                    setProvider(p);
                    setModal(false);
                  }}
                  className="block w-full cursor-pointer rounded border p-3 text-left transition hover:bg-blue-50 text-gray-700"
                >
                  {p.nombre_proveedor} · {p.id_proveedor}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
