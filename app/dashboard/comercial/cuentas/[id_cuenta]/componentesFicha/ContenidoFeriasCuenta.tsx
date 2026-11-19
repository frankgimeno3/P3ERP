'use client';

import { useEffect, useState } from "react";
import { FeriaService } from "@/app/service/FeriaService";
import FairStands, { type FairEdition, type FairStand } from "./FairStands";
import CountryFlag from "@/app/components/CountryFlag";

type Feria = FairEdition & { ciudad: string; pais: string; id_cuenta_feria: string; id_cuenta_gestion: string };

function nombreEdicion(feria: Feria) {
  return feria.titulo_especifico_edicion || feria.nombre_feria || feria.id_feria;
}

export default function ContenidoFeriasCuenta({ idCuenta, seleccionadas, stands, legacyStands, onFeriasChange, onStandsChange }: {
  idCuenta: string;
  seleccionadas: string[];
  stands: FairStand[];
  legacyStands: string;
  onFeriasChange: (ids: string[]) => void;
  onStandsChange: (stands: FairStand[]) => void;
}) {
  const [ferias, setFerias] = useState<Feria[]>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    FeriaService.getFerias()
      .then(data => { if (mounted) setFerias(data); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);

  const ids = new Set(seleccionadas);
  const asociadas = (ferias ?? []).filter(feria =>
    ids.has(feria.id_feria) || feria.id_cuenta_feria === idCuenta || feria.id_cuenta_gestion === idCuenta);
  const conocidas = new Set((ferias ?? []).map(feria => feria.id_feria));
  const sinEdicion = ferias ? seleccionadas.filter(id => !conocidas.has(id)) : seleccionadas;

  const toggle = (id: string) => onFeriasChange(ids.has(id) ? seleccionadas.filter(item => item !== id) : [...seleccionadas, id]);

  return (
    <section className="space-y-5 text-sm">
      <h2 className="text-xl font-semibold text-blue-950">Ferias</h2>
      {ferias && (
        <details className="rounded-lg border border-gray-200">
          <summary className="cursor-pointer rounded-lg px-4 py-3 font-medium hover:bg-gray-50">Ferias en las que esta empresa ha sido expositora</summary>
          <div className="grid gap-2 border-t border-gray-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {ferias.map(feria => (
              <label key={feria.id_feria} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-blue-50">
                <input type="checkbox" className="cursor-pointer accent-blue-950" checked={ids.has(feria.id_feria)}
                  onChange={() => toggle(feria.id_feria)} />
                {nombreEdicion(feria)}
              </label>
            ))}
            {sinEdicion.map(id => (
              <label key={id} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-blue-50">
                <input type="checkbox" className="cursor-pointer accent-blue-950" checked onChange={() => toggle(id)} />
                {id}
              </label>
            ))}
            {!ferias.length && !sinEdicion.length && <p>No hay ferias disponibles.</p>}
          </div>
        </details>
      )}

      <section className="space-y-2">
        <h3 className="font-medium">Ediciones vinculadas a la cuenta</h3>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {asociadas.map(feria => {
            const fecha = feria.fecha_inicio
              ? feria.fecha_inicio.slice(0, 10).split("-").reverse().join("/")
              : feria.fecha_incio;
            return (
              <li key={feria.id_feria} className="rounded-md border border-gray-200 px-3 py-2">
                <p className="font-medium">{nombreEdicion(feria)}</p>
                {(feria.ciudad || feria.pais || fecha) && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-600">
                    {feria.ciudad && <span>{feria.ciudad}</span>}
                    {feria.pais && <span className="inline-flex items-center gap-1"><CountryFlag country={feria.pais} />{feria.pais}</span>}
                    {fecha && <span>{fecha}</span>}
                  </p>
                )}
                {feria.id_cuenta_feria === idCuenta && <p className="mt-1 text-xs text-gray-600">Cuenta de la feria</p>}
                {feria.id_cuenta_gestion === idCuenta && <p className="mt-1 text-xs text-gray-600">Cuenta de gestión</p>}
              </li>
            );
          })}
          {sinEdicion.map(id => <li key={id} className="rounded-md border border-gray-200 px-3 py-2">{id}</li>)}
        </ul>
        {ferias && !asociadas.length && !sinEdicion.length && <p className="text-gray-600">La cuenta no tiene ferias vinculadas.</p>}
        {error && <p role="alert" className="text-red-700">No se pudo cargar el catálogo de ferias.</p>}
        {!ferias && !error && <p role="status" className="text-gray-600">Cargando ferias…</p>}
      </section>
      <FairStands editions={ferias ?? []} stands={stands} legacy={legacyStands} onChange={onStandsChange} />
    </section>
  );
}
