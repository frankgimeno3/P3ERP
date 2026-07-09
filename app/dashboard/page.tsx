"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { AgenteService } from "@/app/service/AgenteService";
import { CuentaService } from "@/app/service/CuentaService";
import TaskBoard from "./direccion/tareas/TaskBoard";

const tabs = [
  { key: "campanas", label: "Mis campañas" },
  { key: "contenidos", label: "Mis contenidos" },
  { key: "clientes", label: "Mis cuentas" },
  { key: "tareas", label: "Mis tareas" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("campanas");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [agente, setAgente] = useState<any | null>(null);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cuentasLoading, setCuentasLoading] = useState(false);
  const [cuentasError, setCuentasError] = useState("");
  const [clienteFilters, setClienteFilters] = useState<Record<string, string>>({});
  const [userIdentity, setUserIdentity] = useState<any>({});

  useEffect(() => {
    let payload: any = {};
    try {
      payload = JSON.parse(localStorage.getItem("userPayload") || "{}");
      const payloadRoles = payload?.["cognito:groups"] || payload?.roles || [];
      setEmail(payload?.email || payload?.username || "");
      setRoles(Array.isArray(payloadRoles) ? payloadRoles : [String(payloadRoles)]);
      setUserIdentity(payload || {});
    } catch (error) {
      console.error("Error leyendo payload del usuario:", error);
    }

    AgenteService.getAgentes()
      .then((data) => {
        const agentes = Array.isArray(data) ? data : [];
        setAgentes(agentes);
        const current = agentes.find((item) => item.email_agente && item.email_agente === payload?.email);
        setAgente(current || null);
      })
      .catch((error) => {
        console.error("Error fetching agente actual:", error);
        setAgente(null);
      });
  }, []);

  useEffect(() => {
    if (activeTab !== "clientes" || !agente?.id_agente) return;

    setCuentasLoading(true);
    setCuentasError("");
    CuentaService.getCuentas()
      .then((data) => setCuentas(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("Error fetching mis clientes:", error);
        setCuentasError(error?.message || "No se han podido cargar tus clientes.");
        setCuentas([]);
      })
      .finally(() => setCuentasLoading(false));
  }, [activeTab, agente?.id_agente]);

  const agenteLabel = agente?.nombre_completo_agente || agente?.nombre_agente || email || "Agente";
  const rolLabel = agente?.rol_agente || roles.join(", ") || "Sin rol asignado";
  const middleTitle = `${agenteLabel} - ${rolLabel}`;
  const currentTab = useMemo(() => tabs.find((tab) => tab.key === activeTab), [activeTab]);
  const relatedAgentIds = useMemo(() => {
    if (!agente) return new Set<string>();
    const ids = new Set<string>([agente.id_agente]);
    const payloadEmail = String(userIdentity?.email || "").toLowerCase();
    const payloadUsername = String(userIdentity?.username || "").toLowerCase();
    const roleText = String(agente.rol_agente || roles.join(" ")).toLowerCase();

    agentes.forEach((item) => {
      const itemEmail = String(item.email_agente || "").toLowerCase();
      if (itemEmail && (itemEmail === payloadEmail || itemEmail === payloadUsername)) ids.add(item.id_agente);
      if (roleText.includes("superadmin") && String(item.rol_agente || "").toLowerCase().includes("superadmin")) {
        ids.add(item.id_agente);
      }
    });

    return ids;
  }, [agente, agentes, roles, userIdentity]);

  const cuentasPropias = useMemo(() => {
    const identityValues = [
      email,
      userIdentity?.email,
      userIdentity?.username,
      agente?.email_agente,
      agente?.nombre_completo_agente,
      agente?.nombre_agente,
    ].filter(Boolean).map((value) => String(value).toLowerCase());

    return cuentas.filter((cuenta) => {
      if (relatedAgentIds.has(cuenta.id_agente)) return true;
      const asignado = String(cuenta.asignado_a || "").toLowerCase();
      return Boolean(asignado && identityValues.some((value) => asignado.includes(value)));
    });
  }, [agente, cuentas, email, relatedAgentIds, userIdentity]);

  const cuentasFiltradas = useMemo(() => {
    return cuentasPropias.filter((cuenta) => {
      const values: Record<string, string> = {
        id_cuenta: cuenta.id_cuenta || "",
        nombre_empresa: cuenta.nombre_empresa || "",
        pais_cuenta: cuenta.pais_cuenta || "",
        correo_principal: cuenta.correo_principal || "",
        tipo_cuenta: cuenta.tipo_cuenta || "",
        estado_leads_frios: cuenta.estado_leads_frios || "",
      };

      return Object.entries(clienteFilters).every(([field, filter]) =>
        !filter.trim() || String(values[field] || "").toLowerCase().includes(filter.trim().toLowerCase()),
      );
    });
  }, [clienteFilters, cuentasPropias]);

  const setColumnFilter = (field: string, value: string) => {
    setClienteFilters((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal={middleTitle} />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-10 text-gray-600">
        <div className="mb-4 flex flex-row">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`w-48 cursor-pointer rounded-tr-lg p-3 text-center text-sm transition-all duration-300 ${
                activeTab === tab.key ? "z-30 rounded-tl-lg bg-blue-950 text-white" : "z-10 bg-white text-gray-700 hover:bg-gray-200"
              }`}
              style={{ marginLeft: index === 0 ? "0px" : "-5px" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== "clientes" && activeTab !== "contenidos" && activeTab !== "tareas" && (
          <div className="bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-blue-950">{currentTab?.label}</h2>
            <p className="mt-2 text-sm text-gray-500">Sin datos para mostrar.</p>
          </div>
        )}

        {activeTab === "contenidos" && (
          <div className="bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-blue-950">Mis contenidos</h2>
                <p className="mt-1 text-sm text-gray-500">Contenidos asociados a tu actividad.</p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/produccion/hoja_produccion/crear")}
                className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
              >
                Agregar contenido
              </button>
            </div>
          </div>
        )}

        {activeTab === "tareas" && (
          <div className="bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-blue-950">Mis tareas</h2>
              <p className="mt-1 text-sm text-gray-500">
                {agente?.id_agente ? `Tareas de ${agenteLabel}` : "No se ha encontrado un agente asociado a tu usuario."}
              </p>
            </div>
            {agente?.id_agente ? <TaskBoard agenteId={agente.id_agente} embedded /> : null}
          </div>
        )}

        {activeTab === "clientes" && (
          <div className="bg-white p-6 shadow-sm">
            <div className="mb-5">
              <div>
                <h2 className="text-lg font-semibold text-blue-950">Mis cuentas</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {agente?.id_agente ? `Cuentas asignadas a ${agenteLabel}` : "No se ha encontrado un agente asociado a tu usuario."}
                </p>
              </div>
            </div>

            {cuentasError && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{cuentasError}</div>}

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["id_cuenta", "Codigo"],
                ["nombre_empresa", "Empresa"],
                ["pais_cuenta", "Pais"],
                ["correo_principal", "Email"],
              ].map(([field, label]) => (
                <label key={field} className="text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span>
                  <input
                    type="search"
                    value={clienteFilters[field] || ""}
                    onChange={(event) => setColumnFilter(field, event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-950"
                  />
                </label>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-950 text-white">
                  <tr>
                    <th className="p-2 text-left">Codigo</th>
                    <th className="p-2 text-left">Empresa</th>
                    <th className="p-2 text-left">Pais</th>
                    <th className="p-2 text-left">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasLoading && (
                    <tr>
                      <td colSpan={4} className="p-4 text-gray-500">Cargando tus cuentas...</td>
                    </tr>
                  )}
                  {!cuentasLoading && cuentasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-gray-500">No hay cuentas para mostrar.</td>
                    </tr>
                  )}
                  {!cuentasLoading && cuentasFiltradas.map((cuenta) => (
                    <tr
                      key={cuenta.id_cuenta}
                      onClick={() => router.push(`/dashboard/comercial/cuentas/${cuenta.id_cuenta}`)}
                      className="cursor-pointer border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="p-2 font-medium text-blue-950">{cuenta.id_cuenta}</td>
                      <td className="p-2">{cuenta.nombre_empresa || "-"}</td>
                      <td className="p-2">{cuenta.pais_cuenta || "-"}</td>
                      <td className="p-2">{cuenta.correo_principal || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
