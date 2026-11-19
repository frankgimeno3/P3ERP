'use client';

import { useId, useState, type ReactNode } from "react";
import CountryFlag from "@/app/components/CountryFlag";
import CountrySelect from "@/app/components/CountrySelect";
import { isCommercialAgent } from "@/app/config/commercialAgents";
import accountCountries from "@/app/dashboard/comercial/contactos/crear/fases/fasescomponents/countries.json";

type Agent = { id_agente: string; nombre_completo_agente: string; nombre_agente?: string; apellidos_agente?: string; email_agente?: string };
const accountCountryNames = accountCountries.map(country => country.name);

const potencialActualOptions = [
  "Cliente", "Altas Posibilidades - buena relación con el responsable", "Propuesta desestimada o silencio",
  "Neutral - Intentando contactar con responsable", "Neutral - buscando persona de contacto",
  "Bajas posibilidades - responsable actualmente no interesado", "No contactar - Responsable adverso",
  "Relacionado - se lleva por agencia",
];
const potencialFuturoOptions = [
  "Máximo - Cliente nuestro y-o anunciante competencia", "Alto - Encaja por sector y por mercado",
  "Neutral - no es anunciante habitual", "Neutral - no determinado",
  "Bajo - Encaja por producto pero no por mercado", "Nulo - Es y será otro sector y mercado",
];

const cardField = "block min-w-0 w-full rounded text-left border border-white bg-transparent px-2 py-1.5 font-normal text-white outline-none placeholder:text-gray-200 focus-visible:ring-2 focus-visible:ring-white";
const cardSelect = `${cardField} cursor-pointer transition-colors hover:bg-white/10 [&>option]:bg-white [&>option]:text-gray-900`;
const agentSelect = "block w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 transition-colors hover:border-blue-800";

function CardInfo({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="group/info relative shrink-0 z-10 hover:z-20 focus-within:z-20">
      <button type="button" aria-label={`Información de ${title}`} aria-describedby={id}
        onClick={() => setOpen(!open)} onBlur={() => setOpen(false)} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}
        className="peer flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-sm font-bold text-white transition-colors hover:bg-white hover:text-gray-700 focus-visible:bg-white focus-visible:text-gray-700">
        i
      </button>
      <div id={id} role="tooltip"
        className={`pointer-events-none absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw_-_5rem)] rounded-lg bg-white p-3 text-left text-xs font-normal leading-relaxed text-gray-700 shadow-lg ring-1 ring-gray-200 transition-opacity before:absolute before:-top-1 before:right-2 before:h-2 before:w-2 before:rotate-45 before:bg-white group-hover/info:visible group-hover/info:opacity-100 peer-focus-visible:visible peer-focus-visible:opacity-100 ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
        {children}
      </div>
    </div>
  );
}

function DetailCard({ title, help, children, id }: { title: string; help: ReactNode; children: ReactNode; id?: string }) {
  return (
    <article id={id} className="relative min-w-0 space-y-3 rounded-xl bg-gray-700 p-4 text-sm font-normal text-white shadow-md">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <CardInfo title={title}>{help}</CardInfo>
      </div>
      {children}
    </article>
  );
}

function PotentialField({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1 text-right">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className={cardSelect}>
        <option value="">Sin definir</option>
        {value && !options.includes(value) && <option value={value}>{value}</option>}
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function agentName(agent: Agent) {
  return agent.nombre_completo_agente || `${agent.nombre_agente || ""} ${agent.apellidos_agente || ""}`.trim() || agent.id_agente;
}

type Header = { nombre_empresa: string; id_agente: string; asignado_a: string };

export function CuentaHeader({ data, agents, onChange }: {
  data: Header;
  agents: Agent[];
  onChange: (field: keyof Header, value: string) => void;
}) {
  const { nombre_empresa, id_agente, asignado_a } = data;
  const commercial = agents.filter(isCommercialAgent);
  const assignedOptions = Array.from(new Set(commercial.map(agent => agent.email_agente).filter(Boolean)));
  const [editingName, setEditingName] = useState(false);
  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <h1 className="min-w-0 flex-1 text-3xl font-bold text-blue-950 sm:text-4xl">
        {editingName ? (
          <input autoFocus aria-label="Nombre de la empresa" value={nombre_empresa} placeholder="Nombre de la empresa"
            onChange={event => onChange("nombre_empresa", event.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={event => { if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur(); }}
            className="block w-full cursor-text rounded-md border border-gray-300 bg-transparent px-1 py-1 outline-none" />
        ) : (
          <button type="button" title="Editar nombre de la empresa" onClick={() => setEditingName(true)}
            className="block w-full cursor-text rounded-md border border-transparent px-1 py-1 text-left break-words transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-blue-950">
            {nombre_empresa || "Nombre de la empresa"}
          </button>
        )}
      </h1>
      <div className="grid w-full gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm shadow-sm lg:w-72">
        <label className="space-y-1 font-medium">
          <span>Agente</span>
          <select value={id_agente} onChange={event => onChange("id_agente", event.target.value)} className={agentSelect}>
            <option value="">Sin asignar</option>
            {id_agente && !commercial.some(agent => agent.id_agente === id_agente) && (
              <option value={id_agente}>{agentName(agents.find(agent => agent.id_agente === id_agente) ?? { id_agente, nombre_completo_agente: "" })}</option>
            )}
            {commercial.map(agent => <option key={agent.id_agente} value={agent.id_agente}>{agentName(agent)}</option>)}
          </select>
        </label>
        <label className="space-y-1 font-medium">
          <span>Asignado a</span>
          <select value={asignado_a} onChange={event => onChange("asignado_a", event.target.value)} className={agentSelect}>
            <option value="">Sin asignar</option>
            {asignado_a && !assignedOptions.includes(asignado_a) && <option value={asignado_a}>{asignado_a}</option>}
            {assignedOptions.map(email => <option key={email} value={email}>{email}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

type Identity = {
  id_cuenta: string; id_edisoft: string; pais_cuenta: string;
  potencial_actual_relacion: string; potencial_futuro_encaje: string;
};

export default function IdentidadCuenta({ data, onChange, children }: {
  data: Identity;
  onChange: (field: keyof Identity, value: string) => void;
  children: ReactNode;
}) {
  const { id_cuenta, id_edisoft, pais_cuenta, potencial_actual_relacion, potencial_futuro_encaje } = data;
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-bold">Detalles de la cuenta</h2>
      <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-3">
        <DetailCard title="Identificadores" help={<>
          <p><strong>Código Vtiger.</strong> Identifica la cuenta en el CRM de origen y en P3ERP.</p>
          <p className="mt-2"><strong>Código Edisoft.</strong> Vincula la cuenta con sus registros e informes administrativos.</p>
        </>}>
          <label className="block space-y-1 text-right">
            <span>Código Vtiger</span>
            <input value={id_cuenta} disabled className={cardField} />
          </label>
          <label className="block space-y-1 text-right">
            <span>Código Edisoft</span>
            <input value={id_edisoft} onChange={event => onChange("id_edisoft", event.target.value)} className={cardField} />
          </label>
        </DetailCard>
        <DetailCard id="pais-cuenta-detalles" title="País" help="País principal de la cuenta. Se utiliza para localizarla en los filtros comerciales y se refleja en Datos comerciales.">
          <div className="flex flex-col items-center gap-3">
            <CountryFlag country={pais_cuenta} className="h-12 w-12 shrink-0" />
            <div className="w-full">
              <CountrySelect countries={accountCountryNames} flags="options" value={pais_cuenta} onChange={value => onChange("pais_cuenta", value)}
                placeholder="Selecciona un país" className={`${cardField} text-center! focus:border-white!`} />
            </div>
          </div>
        </DetailCard>
        <DetailCard title="Potencial" help={<>
          <p><strong>Potencial actual.</strong> Describe la relación comercial y el estado del contacto.</p>
          <p className="mt-2"><strong>Potencial futuro.</strong> Valora cuánto encaja la cuenta con nuestros medios y mercados.</p>
        </>}>
          <PotentialField label="Potencial actual - Relación" value={potencial_actual_relacion} options={potencialActualOptions}
            onChange={value => onChange("potencial_actual_relacion", value)} />
          <PotentialField label="Potencial futuro - Encaje con nuestros medios" value={potencial_futuro_encaje} options={potencialFuturoOptions}
            onChange={value => onChange("potencial_futuro_encaje", value)} />
        </DetailCard>
      </div>
      {children}
    </section>
  );
}
