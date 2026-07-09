"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { AgenteService } from "@/app/service/AgenteService";
import { CuentaService } from "@/app/service/CuentaService";
import paises from "@/app/data/paises.json";

type Agente = {
  id_agente: string;
  nombre_completo_agente: string;
  rol_agente: string;
  estado_agente: string;
};

type CuentaForm = {
  id_cuenta: string;
  nombre_empresa: string;
  id_agente: string;
  pais_cuenta: string;
  website: string;
  identificador_fiscal_tipo: "cif" | "vat_code";
  cif: string;
  vat_code: string;
  nombre_fiscal: string;
  pais_facturacion: string;
  direccion_facturacion: string;
  poblacion_facturacion: string;
  cp_facturacion: string;
  mail_contabilidad: string;
  detalles_facturacion: string;
  correo_principal: string;
  telefono_principal: string;
};

const initialForm = (): CuentaForm => ({
  id_cuenta: `cuenta_${Date.now().toString(36)}`,
  nombre_empresa: "",
  id_agente: "",
  pais_cuenta: "",
  website: "",
  identificador_fiscal_tipo: "cif",
  cif: "",
  vat_code: "",
  nombre_fiscal: "",
  pais_facturacion: "",
  direccion_facturacion: "",
  poblacion_facturacion: "",
  cp_facturacion: "",
  mail_contabilidad: "",
  detalles_facturacion: "",
  correo_principal: "",
  telefono_principal: "",
});

function websiteValida(value: string) {
  const text = value.trim().replace(/^https?:\/\//i, "");
  return /^www\.[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(text);
}

export default function CrearCuenta() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CuentaForm>(() => initialForm());
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [paisQuery, setPaisQuery] = useState("");
  const [paisOpen, setPaisOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    AgenteService.getAgentes()
      .then((data) => setAgentes(Array.isArray(data) ? data : []))
      .catch(() => setAgentes([]));
  }, []);

  const filteredCountries = useMemo(() => {
    const term = paisQuery.trim().toLowerCase();
    return (paises as string[])
      .filter((pais) => !term || pais.toLowerCase().includes(term))
      .slice(0, 12);
  }, [paisQuery]);

  const agenteNombre = agentes.find((agente) => agente.id_agente === form.id_agente)?.nombre_completo_agente || "";
  const step1Valid = Boolean(form.nombre_empresa.trim() && form.id_agente && form.pais_cuenta && websiteValida(form.website));
  const step3Valid = Boolean(form.correo_principal.trim() && form.telefono_principal.trim());

  const update = (patch: Partial<CuentaForm>) => setForm((current) => ({ ...current, ...patch }));

  const goNext = () => {
    if (step === 1 && !step1Valid) return;
    if (step === 3 && !step3Valid) return;
    setStep((current) => Math.min(4, current + 1));
  };

  const createCuenta = async () => {
    try {
      setSubmitting(true);
      setError("");
      const payload = {
        id_cuenta: form.id_cuenta,
        nombre_empresa: form.nombre_empresa.trim(),
        pais_cuenta: form.pais_cuenta,
        id_agente: form.id_agente,
        website: form.website.trim(),
        identificador_fiscal_tipo: form.identificador_fiscal_tipo,
        cif: form.identificador_fiscal_tipo === "cif" ? form.cif.trim() : "",
        vat_code: form.identificador_fiscal_tipo === "vat_code" ? form.vat_code.trim() : "",
        nombre_fiscal: form.nombre_fiscal.trim(),
        pais_facturacion: form.pais_facturacion.trim(),
        direccion_facturacion: form.direccion_facturacion.trim(),
        poblacion_facturacion: form.poblacion_facturacion.trim(),
        cp_facturacion: form.cp_facturacion.trim(),
        mail_contabilidad: form.mail_contabilidad.trim(),
        detalles_facturacion: form.detalles_facturacion.trim(),
        correo_principal: form.correo_principal.trim(),
        datos_comerciales: {
          telefono_principal_cuenta: form.telefono_principal.trim(),
          ciudad_principal_cuenta: form.poblacion_facturacion.trim(),
          resumen_actividad_cuenta: "",
        },
        array_direcciones_cuenta: form.direccion_facturacion || form.pais_facturacion ? [{
          nombre_direccion: "Direccion fiscal",
          pais_direccion: form.pais_facturacion,
          ciudad_direccion: form.poblacion_facturacion,
          codigo_postal: form.cp_facturacion,
          direccion_completa: form.direccion_facturacion,
          telefono_direccion: form.telefono_principal,
        }] : [],
      };

      const created = await CuentaService.createCuenta(payload);
      router.push(`/dashboard/comercial/cuentas/${created.id_cuenta || form.id_cuenta}`);
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || "No se ha podido crear la cuenta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col text-gray-700">
      <MiddleNav tituloprincipal="Crear cuenta" />
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-6xl">
          <StepHeader current={step} />
          <div className="mt-8 rounded border border-gray-200 bg-white p-8 shadow-sm">
            {error && <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            {step === 1 && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-blue-950">Datos obligatorios</h2>
                  <p className="mt-1 text-sm text-gray-500">Informacion basica para identificar la cuenta.</p>
                </div>
                <TextField label="ID de cuenta (solo lectura)" value={form.id_cuenta} readOnly />
                <TextField label="Nombre de la cuenta" required value={form.nombre_empresa} onChange={(value) => update({ nombre_empresa: value })} placeholder="Empresa o nombre de la cuenta" />
                <CountryField
                  value={form.pais_cuenta}
                  query={paisQuery}
                  open={paisOpen}
                  options={filteredCountries}
                  onFocus={() => {
                    setPaisOpen(true);
                    setPaisQuery(form.pais_cuenta);
                  }}
                  onQueryChange={(value) => {
                    setPaisQuery(value);
                    update({ pais_cuenta: "" });
                    setPaisOpen(true);
                  }}
                  onSelect={(pais) => {
                    update({ pais_cuenta: pais });
                    setPaisQuery(pais);
                    setPaisOpen(false);
                  }}
                />
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Agente <span className="text-red-600">*</span></span>
                  <select value={form.id_agente} onChange={(event) => update({ id_agente: event.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-3 text-sm hover:border-blue-950">
                    <option value="">Seleccionar agente</option>
                    {agentes.map((agente) => (
                      <option key={agente.id_agente} value={agente.id_agente}>
                        {agente.nombre_completo_agente || agente.id_agente}{agente.rol_agente ? ` (${agente.rol_agente})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <TextField label="Website" required value={form.website} onChange={(value) => update({ website: value })} placeholder="www.empresa.com" />
                {form.website && !websiteValida(form.website) && <p className="text-sm text-red-600">La web debe tener formato www.nombre.dominio. Puede incluir http o https si lo necesitas.</p>}
              </section>
            )}

            {step === 2 && (
              <section className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-blue-950">Informacion fiscal</h2>
                    <p className="mt-1 text-sm text-gray-500">Esta fase es opcional y se puede completar despues.</p>
                  </div>
                  <button type="button" onClick={() => setStep(3)} className="rounded border border-blue-950 px-4 py-2 text-sm text-blue-950 hover:bg-blue-50">Saltar fase</button>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Tipo de identificador</span>
                  <select value={form.identificador_fiscal_tipo} onChange={(event) => update({ identificador_fiscal_tipo: event.target.value as CuentaForm["identificador_fiscal_tipo"] })} className="w-full rounded border border-gray-300 px-3 py-3 text-sm hover:border-blue-950">
                    <option value="cif">CIF</option>
                    <option value="vat_code">VAT code</option>
                  </select>
                </label>
                {form.identificador_fiscal_tipo === "cif" ? (
                  <TextField label="CIF" value={form.cif} onChange={(value) => update({ cif: value })} />
                ) : (
                  <TextField label="VAT code" value={form.vat_code} onChange={(value) => update({ vat_code: value })} />
                )}
                <TextField label="Nombre fiscal" value={form.nombre_fiscal} onChange={(value) => update({ nombre_fiscal: value })} />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Pais de facturacion" value={form.pais_facturacion} onChange={(value) => update({ pais_facturacion: value })} />
                  <TextField label="Mail contabilidad" value={form.mail_contabilidad} onChange={(value) => update({ mail_contabilidad: value })} />
                </div>
                <TextField label="Direccion de facturacion" value={form.direccion_facturacion} onChange={(value) => update({ direccion_facturacion: value })} />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Poblacion" value={form.poblacion_facturacion} onChange={(value) => update({ poblacion_facturacion: value })} />
                  <TextField label="Codigo postal" value={form.cp_facturacion} onChange={(value) => update({ cp_facturacion: value })} />
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Detalles de facturacion</span>
                  <textarea value={form.detalles_facturacion} onChange={(event) => update({ detalles_facturacion: event.target.value })} className="min-h-24 w-full rounded border border-gray-300 px-3 py-3 text-sm" />
                </label>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-blue-950">Informacion de contacto</h2>
                  <p className="mt-1 text-sm text-gray-500">Email y telefono generales de la cuenta. No crea un contacto nuevo.</p>
                </div>
                <TextField label="Email principal" required value={form.correo_principal} onChange={(value) => update({ correo_principal: value })} placeholder="info@empresa.com" />
                <TextField label="Telefono principal" required value={form.telefono_principal} onChange={(value) => update({ telefono_principal: value })} placeholder="+34 900 000 000" />
              </section>
            )}

            {step === 4 && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-blue-950">Previsualizacion</h2>
                  <p className="mt-1 text-sm text-gray-500">Revisa los datos antes de cargar la cuenta.</p>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <Preview label="ID" value={form.id_cuenta} />
                  <Preview label="Cuenta" value={form.nombre_empresa} />
                  <Preview label="Agente" value={agenteNombre || form.id_agente} />
                  <Preview label="Pais" value={form.pais_cuenta} />
                  <Preview label="Website" value={form.website} />
                  <Preview label="Identificador fiscal" value={form.identificador_fiscal_tipo === "cif" ? form.cif : form.vat_code} />
                  <Preview label="Nombre fiscal" value={form.nombre_fiscal} />
                  <Preview label="Email principal" value={form.correo_principal} />
                  <Preview label="Telefono principal" value={form.telefono_principal} />
                </div>
              </section>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button type="button" disabled={step === 1 || submitting} onClick={() => setStep((current) => Math.max(1, current - 1))} className="rounded border border-gray-300 px-5 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400">Anterior</button>
              {step < 4 ? (
                <button type="button" disabled={(step === 1 && !step1Valid) || (step === 3 && !step3Valid)} onClick={goNext} className="rounded bg-blue-950 px-5 py-2 text-sm text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-400">Siguiente</button>
              ) : (
                <button type="button" disabled={submitting} onClick={createCuenta} className="rounded bg-blue-950 px-5 py-2 text-sm text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-400">
                  {submitting ? "Creando..." : "Crear cuenta"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHeader({ current }: { current: number }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-7">
        {[1, 2, 3, 4].map((step, index) => (
          <div key={step} className="flex items-center gap-7">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold ${step === current ? "bg-blue-600 text-white" : step < current ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
              {step}
            </div>
            {index < 3 && <div className="h-1 w-14 bg-gray-300" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = "", required = false, readOnly = false }: { label: string; value: string; onChange?: (value: string) => void; placeholder?: string; required?: boolean; readOnly?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label} {required && <span className="text-red-600">*</span>}</span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded border border-gray-300 px-3 py-3 text-sm ${readOnly ? "bg-gray-100 text-gray-600" : "bg-white hover:border-blue-950"}`}
      />
    </label>
  );
}

function CountryField({
  value,
  query,
  open,
  options,
  onFocus,
  onQueryChange,
  onSelect,
}: {
  value: string;
  query: string;
  open: boolean;
  options: string[];
  onFocus: () => void;
  onQueryChange: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="relative text-sm">
      <label className="block">
        <span className="mb-1 block font-medium">Pais <span className="text-red-600">*</span></span>
        <input value={open ? query : value} onFocus={onFocus} onChange={(event) => onQueryChange(event.target.value)} placeholder="Escribe para filtrar paises" className="w-full rounded border border-gray-300 px-3 py-3 text-sm hover:border-blue-950" />
      </label>
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto border border-gray-200 bg-white shadow-lg">
          {options.map((pais) => (
            <button key={pais} type="button" onClick={() => onSelect(pais)} className="block w-full px-3 py-2 text-left hover:bg-blue-50">
              {pais}
            </button>
          ))}
          {options.length === 0 && <p className="px-3 py-2 text-gray-500">Sin resultados.</p>}
        </div>
      )}
    </div>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-blue-950">{value || "-"}</p>
    </div>
  );
}
