'use client';
import SortableTable from '@/app/components/SortableTable';
import TableFilters from '@/app/components/TableFilters';
import TableColumnFilter from '@/app/components/TableColumnFilter';


import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { FC, useEffect, useState } from 'react';
import apiClient from '@/app/apiClient';
import { ContactoService } from '@/app/service/ContactoService';

interface Contacto {
  id_contacto: string;
  es_principal?: boolean;
  es_contacto_administrativo?: boolean;
  es_receptor_digital?: boolean;
  tipos_contacto?: string[];
  nombre_completo_contacto: string;
  cargo_contacto?: string;
  email_contacto?: string;
}

const flags = [
  ['es_contacto_administrativo', 'Contacto administrativo', 'A'],
  ['es_receptor_digital', 'Receptor digital', 'D'],
] as const;
const textFields = [['nombre_completo_contacto','Nombre y apellidos'], ['cargo_contacto','Cargo'], ['email_contacto','Correo electrónico']] as const;
const badgeFilters = [['es_principal','Contacto principal'], ...flags] as const;

function Info({ label }: { label: string }) {
  return <span tabIndex={0} aria-label={label} className="group relative inline-flex">
    <span aria-hidden="true" className="inline-grid size-5 place-items-center rounded-full border text-xs font-bold">i</span>
    <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-20 hidden w-48 rounded bg-slate-900 p-2 text-xs text-white shadow-lg group-hover:block group-focus:block">{label}</span>
  </span>;
}

interface ContenidoContactosEmpresaProps {
  id_cuenta: string;
  onPrincipalChange: (id: string) => void;
}

const ContenidoContactosEmpresa: FC<ContenidoContactosEmpresaProps> = ({ id_cuenta, onPrincipalChange }) => {
  const router = useRouter();
  const [contactosFiltrados, setContactosFiltrados] = useState<Contacto[]>([]);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<Contacto | null>(null);
  const [desvincularCuenta, setDesvincularCuenta] = useState(false);
  const [borrarContacto, setBorrarContacto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string,string>>({});
  const types = [...new Set(contactosFiltrados.flatMap(row => row.tipos_contacto || []))].sort((a,b) => a.localeCompare(b,'es'));
  const shown = contactosFiltrados.filter(row => (!filters.tipo || row.tipos_contacto?.includes(filters.tipo)) &&
    textFields.every(([key]) => (row[key] || '').toLocaleLowerCase('es').includes((filters[key] || '').trim().toLocaleLowerCase('es'))) &&
    badgeFilters.every(([key]) => !filters[key] || Boolean(row[key]) === (filters[key] === 'si')));
  const filter = (key: string, value: string) => setFilters(previous => ({ ...previous, [key]: value }));

  async function toggle(contact: Contacto, campo: typeof flags[number][0]) {
    if (procesando) return;
    setProcesando(true);
    setError(null);
    try {
      const {data} = await apiClient.patch('/api/v1/comercial/cuentas/' + encodeURIComponent(id_cuenta) + '/distintivos-contacto',
        { id_contacto: contact.id_contacto, campo, valor: !contact[campo] });
      setContactosFiltrados(rows => rows.map(row => row.id_contacto === contact.id_contacto ? { ...row, ...data } : row));
    } catch {
      setError('No se pudo guardar el distintivo del contacto.');
    } finally {
      setProcesando(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    ContactoService.getContactos({ id_cuenta }, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      const rows: Contacto[] = Array.isArray(data) ? data : [];
      setContactosFiltrados(rows);
      onPrincipalChange(rows.find(row => row.es_principal)?.id_contacto || '');
    }).catch(() => {
      if (!controller.signal.aborted) setError('No se pudieron cargar los contactos.');
    });
    return () => controller.abort();
  }, [id_cuenta, onPrincipalChange]);

  const elegirPrincipal = async (contacto: Contacto) => {
    if (procesando || contacto.es_principal) return;
    setProcesando(true);
    setError(null);
    try {
      await apiClient.put('/api/v1/comercial/cuentas/' + encodeURIComponent(id_cuenta) + '/contacto-principal', {
        id_contacto: contacto.id_contacto,
      });
      setContactosFiltrados(rows => rows.map(row => ({ ...row, es_principal: row.id_contacto === contacto.id_contacto })));
      onPrincipalChange(contacto.id_contacto);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cambiar el contacto principal.');
    } finally {
      setProcesando(false);
    }
  };

  useEffect(() => {
    if (!contactoSeleccionado) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {setContactoSeleccionado(null);setDesvincularCuenta(false);setBorrarContacto(false);setError(null);}
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [contactoSeleccionado]);

  const abrirModal = (contacto: Contacto) => {
    setContactoSeleccionado(contacto);
    setDesvincularCuenta(false);
    setBorrarContacto(false);
    setError(null);
  };

  const cerrarModal = () => {
    if (procesando) return;
    setContactoSeleccionado(null);
    setDesvincularCuenta(false);
    setBorrarContacto(false);
    setError(null);
  };

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, href: string) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  const confirmarAccion = async () => {
    if (!contactoSeleccionado || (!desvincularCuenta && !borrarContacto)) return;

    try {
      setProcesando(true);
      setError(null);

      if (borrarContacto) {
        await ContactoService.deleteContacto(contactoSeleccionado.id_contacto);
      } else {
        await ContactoService.unlinkContactoFromCuenta(contactoSeleccionado.id_contacto, id_cuenta);
      }

      if (contactoSeleccionado.es_principal) onPrincipalChange('');
      setContactosFiltrados((prev) =>
        prev.filter((contacto) => contacto.id_contacto !== contactoSeleccionado.id_contacto),
      );
      setContactoSeleccionado(null);
      setDesvincularCuenta(false);
      setBorrarContacto(false);
    } catch (error: any) {
      setError(error?.message || 'No se pudo completar la acción.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold mb-4">Contactos de la Empresa</h2>

        <Link
          href="/dashboard/comercial/contactos/crear"
          className="p-2 px-4 text-sm mb-2 rounded-lg shadow-xl bg-blue-950/80 hover:bg-blue-950/70 text-white cursor-pointer"
        >
          Añadir contacto
        </Link>
      </div>

      {error && !contactoSeleccionado && <p role="alert" className="mb-3 text-red-700">{error}</p>}
      <TableFilters>
        {textFields.map(([key,label]) => <TableColumnFilter key={key} label={label} value={filters[key] || ''} onChange={value => filter(key,value)} />)}
        <label className="text-xs text-gray-600">Tipo
          <select className="mt-1 block w-full rounded border p-2 text-sm" value={filters.tipo || ''} onChange={event => filter('tipo',event.target.value)}>
            <option value="">Todos</option>
            {types.map(type => <option key={type}>{type}</option>)}
          </select>
        </label>
        {badgeFilters.map(([key,label]) => <label key={key} className="text-xs text-gray-600">{label}
          <select className="mt-1 block w-full rounded border p-2 text-sm" value={filters[key] || ''} onChange={event => filter(key,event.target.value)}>
            <option value="">Todos</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </label>)}
      </TableFilters>
      {shown.length === 0 ? (
        <p className="text-gray-600">{contactosFiltrados.length ? 'No hay contactos que coincidan con los filtros.' : 'No hay contactos disponibles para esta cuenta.'}</p>
      ) : (
        <SortableTable className="min-w-full">
          <thead className="bg-blue-950/80 text-white">
            <tr>
              <th scope="col" aria-label="Contacto principal" className="w-16 p-2"><Info label="Corona · Contacto principal de la cuenta" /></th>
              {flags.map(([field,label,letter]) => <th key={field} scope="col" aria-label={label} className="w-16 p-2"><Info label={letter + ' · ' + label} /></th>)}
              <th className="text-left p-2 font-light">Nombre y apellidos</th>
              <th className="text-left p-2 font-light">Cargo</th>
              <th className="text-left p-2 font-light">Tipo</th>
              <th className="text-left p-2 font-light">Correo electrónico</th>
              <th className="text-left p-2 font-light">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((contacto) => (
              <tr
                key={contacto.id_contacto}
                onClick={(e) => handleRowClick(e, `/dashboard/comercial/contactos/${contacto.id_contacto}`)}
                className="border-t border-gray-200 hover:bg-gray-100/30 cursor-pointer"
              >
                <td data-sort-value={contacto.es_principal ? '1' : '0'} className="p-2 border-b border-gray-200" onClick={event => event.stopPropagation()}>
                  <button type="button" aria-label={`Contacto principal: ${contacto.nombre_completo_contacto}`}
                    aria-pressed={Boolean(contacto.es_principal)} disabled={procesando || contacto.es_principal}
                    onClick={() => void elegirPrincipal(contacto)}
                    className={`rounded p-1 transition-colors enabled:cursor-pointer enabled:hover:text-orange-300 ${contacto.es_principal ? "text-yellow-500" : "text-gray-400"}`}>
                    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill={contacto.es_principal ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
                      <path d="m2 6 5 4 5-7 5 7 5-4-2.5 12h-15L2 6ZM5 21h14" />
                    </svg>
                  </button>
                </td>
                {flags.map(([field,label,letter]) => <td key={field} data-sort-value={contacto[field] ? '1' : '0'} className="border-b border-gray-200 p-2" onClick={event => event.stopPropagation()}>
                  <button type="button" aria-label={label + ': ' + contacto.nombre_completo_contacto} aria-pressed={Boolean(contacto[field])}
                    disabled={procesando} onClick={() => void toggle(contacto, field)}
                    className={('rounded p-1 enabled:cursor-pointer enabled:hover:bg-blue-100 enabled:hover:text-blue-950 ' + (contacto[field] ? 'bg-blue-50 text-blue-950' : 'text-gray-400'))}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                      {letter === 'A' ? <path d="M5 2.75h10l4 4v14.5H5zM15 2.75v4h4M8 18h8" /> : <path d="M2.75 5h18.5v14H2.75zM2.75 6l5.5 4M21.25 6l-5.5 4" />}
                      <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="bold" stroke="none" fill="currentColor">{letter}</text>
                    </svg>
                  </button>
                </td>)}
                <td className="p-2 border-b border-gray-200">{contacto.nombre_completo_contacto}</td>
                <td className="p-2 border-b border-gray-200">{contacto.cargo_contacto || '-'}</td>
                <td className="p-2 border-b border-gray-200">{contacto.tipos_contacto?.join(', ') || '—'}</td>
                <td className="p-2 border-b border-gray-200">{contacto.email_contacto || '-'}</td>
                <td className="p-2 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirModal(contacto);
                    }}
                    className="text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded px-3 py-1.5 cursor-pointer"
                  >
                    Desvincular
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </SortableTable>
      )}

      {contactoSeleccionado && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[520px] p-6 relative">
            <button
              type="button"
              onClick={cerrarModal}
              className="absolute top-2 right-3 cursor-pointer text-gray-500 hover:text-gray-800 text-xl"
              aria-label="Cerrar modal"
            >
              ×
            </button>

            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-800 pr-6">
                Deseas desvincular el contacto {contactoSeleccionado.nombre_completo_contacto || contactoSeleccionado.id_contacto} de la cuenta?
              </h2>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={desvincularCuenta}
                  onChange={(e) => setDesvincularCuenta(e.target.checked)}
                  className="h-4 w-4"
                />
                Sí, desvincular de la cuenta
              </label>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={borrarContacto}
                  onChange={(e) => setBorrarContacto(e.target.checked)}
                  className="h-4 w-4"
                />
                Desvincular y borrar contacto
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={procesando}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-60 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarAccion}
                  disabled={procesando || (!desvincularCuenta && !borrarContacto)}
                  className="px-4 py-2 rounded-lg bg-blue-950 text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContenidoContactosEmpresa;
