"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { ContactoService } from "@/app/service/ContactoService";
import { CuentaService } from "@/app/service/CuentaService";
import paises from "@/app/data/paises.json";

type Cuenta = {
  id_cuenta: string;
  nombre_empresa: string;
  pais_cuenta: string;
  cif?: string;
  vat_code?: string;
  correo_principal?: string;
};

type ContactForm = {
  id_contacto: string;
  id_cuenta: string;
  nombre_empresa: string;
  nombre_contacto: string;
  apellidos_contacto: string;
  email_contacto: string;
  telefono_contacto: string;
  cargo_contacto: string;
  linkedin_cuenta: string;
  url_contacto: string;
  pais_contacto: string;
};

const initialForm = (): ContactForm => ({
  id_contacto: `cont_${Date.now().toString(36)}`,
  id_cuenta: "",
  nombre_empresa: "",
  nombre_contacto: "",
  apellidos_contacto: "",
  email_contacto: "",
  telefono_contacto: "",
  cargo_contacto: "",
  linkedin_cuenta: "",
  url_contacto: "",
  pais_contacto: "",
});

function emailValido(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function CrearContacto() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ContactForm>(() => initialForm());
  const [linked, setLinked] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [paisQuery, setPaisQuery] = useState("");
  const [paisOpen, setPaisOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    CuentaService.getCuentas()
      .then((data) => setCuentas(Array.isArray(data) ? data : []))
      .catch(() => setCuentas([]));
  }, []);

  const update = (patch: Partial<ContactForm>) => setForm((current) => ({ ...current, ...patch }));
  const selectedAccount = cuentas.find((cuenta) => cuenta.id_cuenta === form.id_cuenta);
  const requiredValid = Boolean(form.nombre_contacto.trim() && form.email_contacto.trim() && emailValido(form.email_contacto));
  const filteredCountries = useMemo(() => {
    const term = paisQuery.trim().toLowerCase();
    return (paises as string[]).filter((pais) => !term || pais.toLowerCase().includes(term)).slice(0, 12);
  }, [paisQuery]);

  const next = () => {
    if (step === 1 && linked && !form.id_cuenta) return;
    if (step === 2 && !requiredValid) return;
    setStep((current) => Math.min(4, current + 1));
  };

  const createContacto = async () => {
    try {
      setSubmitting(true);
      setError("");
      const created = await ContactoService.createContacto({
        id_contacto: form.id_contacto,
        id_cuenta: linked ? form.id_cuenta : "",
        nombre_empresa: linked ? form.nombre_empresa : "",
        nombre_contacto: form.nombre_contacto.trim(),
        apellidos_contacto: form.apellidos_contacto.trim(),
        nombre_completo_contacto: `${form.nombre_contacto} ${form.apellidos_contacto}`.trim(),
        email_contacto: form.email_contacto.trim(),
        telefono_contacto: form.telefono_contacto.trim(),
        cargo_contacto: form.cargo_contacto.trim(),
        linkedin_cuenta: form.linkedin_cuenta.trim(),
        url_contacto: form.url_contacto.trim(),
        pais_contacto: form.pais_contacto.trim(),
      });
      router.push(`/dashboard/comercial/contactos/${created.id_contacto || form.id_contacto}`);
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || "No se ha podido crear el contacto.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-700">
      <MiddleNav tituloprincipal="Crear contacto" />
      <main className="px-8 py-8">
        <StepHeader current={step} labels={["Vincular cuenta", "Datos obligatorios", "Datos opcionales", "Preview"]} />
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          {error && <div className="mb-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {step === 1 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">¿Este contacto va a estar asociado a una cuenta?</h2>
                <div className="mt-4 flex items-center gap-4">
                  <Toggle checked={linked} onChange={(value) => {
                    setLinked(value);
                    if (!value) update({ id_cuenta: "", nombre_empresa: "" });
                  }} />
                  <span className="text-lg font-medium">{linked ? "Si" : "No"}</span>
                </div>
              </div>

              {linked && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Cuenta asociada <span className="text-red-600">*</span></label>
                  <button
                    type="button"
                    onClick={() => setAccountModalOpen(true)}
                    className="flex min-h-14 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center font-semibold text-slate-700 hover:border-blue-600 hover:bg-blue-50"
                  >
                    {selectedAccount ? `${selectedAccount.nombre_empresa} (${selectedAccount.id_cuenta})` : "Seleccionar cuenta"}
                  </button>
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800">Datos obligatorios</h2>
              <TextField label="ID contacto (solo lectura)" value={form.id_contacto} readOnly />
              {linked && <TextField label="ID cuenta (solo lectura)" value={form.id_cuenta} readOnly />}
              <TextField label="Nombre" required value={form.nombre_contacto} onChange={(value) => update({ nombre_contacto: value })} placeholder="Nombre" />
              <TextField label="Apellidos" value={form.apellidos_contacto} onChange={(value) => update({ apellidos_contacto: value })} placeholder="Apellidos" />
              <TextField label="Cargo" value={form.cargo_contacto} onChange={(value) => update({ cargo_contacto: value })} placeholder="Director comercial" />
              <TextField label="Email" required value={form.email_contacto} onChange={(value) => update({ email_contacto: value })} placeholder="email@empresa.com" />
              {form.email_contacto && !emailValido(form.email_contacto) && <p className="text-sm text-red-600">El email debe tener formato nombre@dominio.ext.</p>}
              <TextField label="Telefono" value={form.telefono_contacto} onChange={(value) => update({ telefono_contacto: value })} placeholder="+34 900 000 000" />
              {linked && <TextField label="Cuenta vinculada" value={form.nombre_empresa} readOnly />}
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Datos opcionales</h2>
                  <p className="mt-1 text-sm text-slate-500">Puedes completarlos ahora o editar la ficha mas adelante.</p>
                </div>
                <button type="button" onClick={() => setStep(4)} className="rounded-lg border border-blue-950 px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-50">Saltar fase</button>
              </div>
              <TextField label="Cuenta de LinkedIn" value={form.linkedin_cuenta} onChange={(value) => update({ linkedin_cuenta: value })} placeholder="@persona" />
              <TextField label="URL" value={form.url_contacto} onChange={(value) => update({ url_contacto: value })} placeholder="https://www.linkedin.com/in/..." />
              <CountryField
                value={form.pais_contacto}
                query={paisQuery}
                open={paisOpen}
                options={filteredCountries}
                onFocus={() => {
                  setPaisOpen(true);
                  setPaisQuery(form.pais_contacto);
                }}
                onQueryChange={(value) => {
                  setPaisQuery(value);
                  update({ pais_contacto: "" });
                  setPaisOpen(true);
                }}
                onSelect={(pais) => {
                  update({ pais_contacto: pais });
                  setPaisQuery(pais);
                  setPaisOpen(false);
                }}
              />
            </section>
          )}

          {step === 4 && (
            <section className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800">Preview</h2>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <Preview label="ID contacto" value={form.id_contacto} />
                <Preview label="Cuenta" value={linked ? `${form.nombre_empresa} (${form.id_cuenta})` : "No asociada"} />
                <Preview label="Nombre" value={`${form.nombre_contacto} ${form.apellidos_contacto}`.trim()} />
                <Preview label="Cargo" value={form.cargo_contacto} />
                <Preview label="Email" value={form.email_contacto} />
                <Preview label="Telefono" value={form.telefono_contacto} />
                <Preview label="LinkedIn" value={form.linkedin_cuenta} />
                <Preview label="URL" value={form.url_contacto} />
                <Preview label="Pais" value={form.pais_contacto} />
              </div>
            </section>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" disabled={step === 1 || submitting} onClick={() => setStep((current) => Math.max(1, current - 1))} className="rounded-lg bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">Atras</button>
            {step < 4 ? (
              <button type="button" disabled={(step === 1 && linked && !form.id_cuenta) || (step === 2 && !requiredValid)} onClick={next} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                Siguiente
              </button>
            ) : (
              <button type="button" disabled={submitting} onClick={createContacto} className="rounded-lg bg-blue-950 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-300">
                {submitting ? "Creando..." : "Crear contacto"}
              </button>
            )}
          </div>
        </div>
      </main>

      {accountModalOpen && (
        <AccountModal
          cuentas={cuentas}
          selectedId={form.id_cuenta}
          onClose={() => setAccountModalOpen(false)}
          onSelect={(cuenta) => {
            update({ id_cuenta: cuenta.id_cuenta, nombre_empresa: cuenta.nombre_empresa });
            setAccountModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function StepHeader({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
      <div className="flex flex-wrap items-center gap-7">
        {[1, 2, 3, 4].map((step, index) => (
          <div key={step} className="flex items-center gap-7">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${step === current ? "bg-blue-600 text-white" : step < current ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
              {step}
            </div>
            {index < 3 && <div className="h-1 w-10 bg-slate-300" />}
            {step === current && <span className="hidden text-sm font-semibold text-slate-600 md:inline">{labels[index]}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-9 w-20 rounded-full p-1 transition ${checked ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <span className={`block h-7 w-7 rounded-full bg-white shadow transition ${checked ? "translate-x-11" : "translate-x-0"}`} />
    </button>
  );
}

function TextField({ label, value, onChange, placeholder = "", required = false, readOnly = false }: { label: string; value: string; onChange?: (value: string) => void; placeholder?: string; required?: boolean; readOnly?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label} {required && <span className="text-red-600">*</span>}</span>
      <input value={value} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} className={`w-full rounded-lg border px-3 py-3 text-sm ${readOnly ? "border-slate-200 bg-slate-100 text-slate-600" : "border-slate-300 bg-slate-900 text-white placeholder:text-slate-400 hover:border-blue-500"}`} />
    </label>
  );
}

function CountryField({ value, query, open, options, onFocus, onQueryChange, onSelect }: { value: string; query: string; open: boolean; options: string[]; onFocus: () => void; onQueryChange: (value: string) => void; onSelect: (value: string) => void }) {
  return (
    <div className="relative text-sm">
      <label className="block">
        <span className="mb-1 block font-medium text-slate-700">Pais del contacto</span>
        <input value={open ? query : value} onFocus={onFocus} onChange={(event) => onQueryChange(event.target.value)} placeholder="Escribe para filtrar paises" className="w-full rounded-lg border border-slate-300 bg-slate-900 px-3 py-3 text-sm text-white placeholder:text-slate-400 hover:border-blue-500" />
      </label>
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
          {options.map((pais) => <button key={pais} type="button" onClick={() => onSelect(pais)} className="block w-full px-3 py-2 text-left hover:bg-blue-50">{pais}</button>)}
          {options.length === 0 && <p className="px-3 py-2 text-slate-500">Sin resultados.</p>}
        </div>
      )}
    </div>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-slate-900">{value || "-"}</p>
    </div>
  );
}

function AccountModal({ cuentas, selectedId, onClose, onSelect }: { cuentas: Cuenta[]; selectedId: string; onClose: () => void; onSelect: (cuenta: Cuenta) => void }) {
  const [filters, setFilters] = useState({ id: "", name: "", cif: "", country: "" });
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const filtered = useMemo(() => {
    return cuentas.filter((cuenta) =>
      cuenta.id_cuenta.toLowerCase().includes(filters.id.toLowerCase()) &&
      (cuenta.nombre_empresa || "").toLowerCase().includes(filters.name.toLowerCase()) &&
      `${cuenta.cif || ""} ${cuenta.vat_code || ""}`.toLowerCase().includes(filters.cif.toLowerCase()) &&
      (cuenta.pais_cuenta || "").toLowerCase().includes(filters.country.toLowerCase())
    );
  }, [cuentas, filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-slate-900">Seleccionar cuenta</h2>
          <button type="button" onClick={onClose} className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>
        <div className="p-6">
          <p className="mb-4 text-sm text-slate-600">Filtra y selecciona una cuenta.</p>
          <div className="grid gap-3 md:grid-cols-4">
            <ModalFilter label="ID" value={filters.id} onChange={(value) => setFilters((current) => ({ ...current, id: value }))} placeholder="Buscar por ID" />
            <ModalFilter label="Nombre" value={filters.name} onChange={(value) => setFilters((current) => ({ ...current, name: value }))} placeholder="Buscar por nombre" />
            <ModalFilter label="CIF / VAT" value={filters.cif} onChange={(value) => setFilters((current) => ({ ...current, cif: value }))} placeholder="Buscar por CIF" />
            <ModalFilter label="Pais" value={filters.country} onChange={(value) => setFilters((current) => ({ ...current, country: value }))} placeholder="Buscar por pais" />
          </div>
          <div className="mt-5 overflow-x-auto rounded border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-700 text-left uppercase text-slate-200">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">CIF / VAT</th>
                  <th className="p-3">Pais</th>
                  <th className="p-3">Contacto</th>
                </tr>
              </thead>
              <tbody className="bg-slate-900 text-slate-100">
                {visible.map((cuenta) => (
                  <tr key={cuenta.id_cuenta} onClick={() => onSelect(cuenta)} className={`cursor-pointer border-t border-slate-700 hover:bg-slate-800 ${selectedId === cuenta.id_cuenta ? "bg-blue-950" : ""}`}>
                    <td className="p-3 font-mono">{cuenta.id_cuenta}</td>
                    <td className="p-3 font-semibold">{cuenta.nombre_empresa}</td>
                    <td className="p-3">{cuenta.cif || cuenta.vat_code || "-"}</td>
                    <td className="p-3">{cuenta.pais_cuenta || "-"}</td>
                    <td className="p-3">{cuenta.correo_principal || "-"}</td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={5} className="p-5 text-slate-300">No hay resultados.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">Anterior</button>
              <span className="text-sm text-slate-600">Pagina {page} de {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded border px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalFilter({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-3 text-white">
        <Search size={15} className="text-slate-400" />
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
      </div>
    </label>
  );
}
