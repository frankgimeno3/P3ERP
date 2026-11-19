'use client';

import { useEffect, useState } from "react";
import DateInputRow from "@/app/components/DateInputRow";
import { PropuestaService } from "@/app/service/PropuestaService";

export type RangoAnual = { entre: string; hasta: string };

function diaMes(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(value);
  if (!match) return null;
  const [, dd, mm] = match;
  const day = Number(dd);
  const month = Number(mm);
  const date = new Date(Date.UTC(2000, month - 1, day));
  return date.getUTCMonth() === month - 1 && day >= 1 ? { day, month } : null;
}

export function rangoAnualValido(rango?: RangoAnual) {
  return !rango || (!rango.entre && !rango.hasta) ||
    Boolean(diaMes(rango.entre) && diaMes(rango.hasta));
}

function limiteAnual(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

function FechaAnual({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [day = "", month = ""] = value.split("/");
  return (
    <fieldset>
      <legend className="mb-1">{label}</legend>
      <DateInputRow>
        {[[day, "dd"], [month, "mm"]].map(([part, placeholder], index) => (
          <input
            key={placeholder}
            aria-label={`${label} ${placeholder}`}
            aria-invalid={Boolean(value && !diaMes(value))}
            className="max-w-14 rounded border border-gray-300 px-2 py-1"
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
        ))}
      </DateInputRow>
    </fieldset>
  );
}

export default function EnvioPropuestasAnuales({ idCuenta, rango, onChange }: {
  idCuenta: string;
  rango?: RangoAnual;
  onChange: (extremo: keyof RangoAnual, value: string) => void;
}) {
  const [fechas, setFechas] = useState<(string | null)[]>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    PropuestaService.getPropuestas({ id_cuenta: idCuenta, sendDatesOnly: true })
      .then(data => {
        if (active) setFechas(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => { active = false; };
  }, [idCuenta]);

  const fin = diaMes(rango?.hasta ?? "");
  let resultado = "Indica una fecha válida en Hasta.";
  if (fin) {
    const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Madrid" }).format(new Date()));
    const desde = limiteAnual(year - 1, fin.month, fin.day);
    const hasta = limiteAnual(year, fin.month, fin.day);
    const enviada = fechas?.some(fecha => fecha !== null && fecha >= desde && fecha <= hasta);
    resultado = "Comprobando…";
    if (error) resultado = "No se pudo comprobar el envío.";
    else if (fechas) resultado = enviada ? "Sí" : "No";
  }

  return (
    <div className="grid gap-4 rounded-lg border border-gray-200 p-4 md:col-span-3 md:grid-cols-2">
      <div>
        <h3 className="mb-2 font-medium">Fecha de envío propuestas anuales</h3>
        <div className="flex flex-wrap gap-4">
          <FechaAnual label="Entre" value={rango?.entre ?? ""} onChange={value => onChange("entre", value)} />
          <FechaAnual label="Hasta" value={rango?.hasta ?? ""} onChange={value => onChange("hasta", value)} />
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-medium">¿Propuesta enviada para este ciclo?</h3>
        <output className="font-semibold">{resultado}</output>
        {resultado === "No" && fechas?.includes(null) && (
          <p className="mt-1 text-xs text-gray-600">Hay propuestas antiguas sin fecha de envío registrada.</p>
        )}
      </div>
    </div>
  );
}
