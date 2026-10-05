'use client';
import type { ReactNode } from 'react';
export default function TableFilters({ children }: { children: ReactNode }) {
  return <details className="mb-4 rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm">
    <summary className="cursor-pointer rounded-lg px-4 py-3 text-sm font-medium transition hover:bg-blue-50 focus-visible:outline-blue-900">Filtros</summary>
    <div className="grid gap-4 border-t border-gray-100 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&_label]:!font-extralight [&_label>span]:!font-extralight [&_legend]:!font-extralight [&_input]:!font-normal [&_select]:!font-normal [&_select:enabled]:cursor-pointer [&_select:enabled]:hover:border-blue-900">{children}</div>
  </details>;
}
