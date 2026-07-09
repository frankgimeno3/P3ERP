'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { ContenidoService } from '@/app/service/ContenidoService';

interface ContenidoCuentaProps {
  id_cuenta: string;
}

const estadoTabs = [
  { key: 'pendiente', label: 'Pendiente', estado: 'Pendiente' },
  { key: 'publicado', label: 'Publicado', estado: 'Publicado' },
];

const valorTabs = [
  { key: 'todo', label: 'Todo', tipo_valor: '' },
  { key: 'de_pago', label: 'De pago', tipo_valor: 'de_pago' },
  { key: 'gratuito', label: 'Gratuito', tipo_valor: 'gratuito' },
];

const ContenidoCuenta: FC<ContenidoCuentaProps> = ({ id_cuenta }) => {
  const router = useRouter();
  const [estadoTab, setEstadoTab] = useState<'pendiente' | 'publicado'>('pendiente');
  const [valorTab, setValorTab] = useState<'todo' | 'de_pago' | 'gratuito'>('todo');
  const [query, setQuery] = useState('');
  const [medio, setMedio] = useState('');
  const [contenidos, setContenidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const estado = estadoTabs.find((tab) => tab.key === estadoTab)?.estado || '';
    const tipo_valor = valorTabs.find((tab) => tab.key === valorTab)?.tipo_valor || '';

    setLoading(true);
    setError('');
    ContenidoService.getContenidos({ id_cuenta, estado, tipo_valor })
      .then((data) => setContenidos(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error('Error fetching contenidos de cuenta:', error);
        setError(error?.message || 'No se han podido cargar los contenidos.');
        setContenidos([]);
      })
      .finally(() => setLoading(false));
  }, [estadoTab, id_cuenta, valorTab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contenidos.filter((contenido) => {
      const matchQuery = !q || [
        contenido.id_contenido,
        contenido.contenido,
        contenido.medio,
        contenido.producto,
        contenido.publicacion,
      ].some((value) => String(value || '').toLowerCase().includes(q));
      const matchMedio = !medio || String(contenido.medio || '').toLowerCase() === medio;
      return matchQuery && matchMedio;
    });
  }, [contenidos, medio, query]);

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, idContenido: string) => {
    const href = `/dashboard/produccion/hoja_produccion/contenidos/${idContenido}`;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      window.open(href, '_blank');
      return;
    }
    router.push(href);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Contenidos</h2>
        <Link
          href={`/dashboard/produccion/hoja_produccion/crear?id_cuenta=${id_cuenta}&origen=cuenta`}
          className="rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
        >
          Agregar contenido no asociado a campaña
        </Link>
      </div>

      <div className="flex">
        {estadoTabs.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setEstadoTab(tab.key as typeof estadoTab)}
            className={`w-44 rounded-tr-lg p-3 text-sm ${
              estadoTab === tab.key ? 'z-20 rounded-tl-lg bg-blue-950 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            style={{ marginLeft: index === 0 ? 0 : -5 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded bg-gray-50 p-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Buscar</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Medio</span>
          <select value={medio} onChange={(event) => setMedio(event.target.value)} className="rounded border border-gray-300 px-3 py-2">
            <option value="">Todos</option>
            <option value="revista">Revista</option>
            <option value="newsletter">Newsletter</option>
            <option value="vidrioperfil">Vidrioperfil</option>
          </select>
        </label>
      </div>

      <div className="flex">
        {valorTabs.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setValorTab(tab.key as typeof valorTab)}
            className={`w-36 rounded-tr-lg p-2 text-xs ${
              valorTab === tab.key ? 'z-20 rounded-tl-lg bg-blue-950 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={{ marginLeft: index === 0 ? 0 : -5 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Contenido</th>
              <th className="p-2 text-left">Medio</th>
              <th className="p-2 text-left">Producto</th>
              <th className="p-2 text-left">Publicación</th>
              <th className="p-2 text-left">Precio</th>
              <th className="p-2 text-left">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-4 text-gray-500">Cargando contenidos...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-gray-500">No hay contenidos para mostrar.</td>
              </tr>
            )}
            {!loading && filtered.map((contenido) => (
              <tr
                key={contenido.id_contenido}
                onClick={(event) => handleRowClick(event, contenido.id_contenido)}
                className="cursor-pointer border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="p-2 font-medium text-blue-950">{contenido.id_contenido}</td>
                <td className="p-2">{contenido.contenido || '-'}</td>
                <td className="p-2">{contenido.medio || '-'}</td>
                <td className="p-2">{contenido.producto || '-'}</td>
                <td className="p-2">{contenido.publicacion || '-'}</td>
                <td className="p-2">{contenido.precio_producto ? `${Number(contenido.precio_producto).toLocaleString('es-ES')} €` : 'Gratuito'}</td>
                <td className="p-2">{contenido.fecha_publicacion_publicacion || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContenidoCuenta;
