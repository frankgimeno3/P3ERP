'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ContactoService } from '@/app/service/ContactoService';

type Contact = { id_contacto: string; nombre_completo_contacto: string; cargo_contacto?: string; email_contacto?: string };

export default function OtherAccountContacts({ accountId, contactId }: { accountId: string; contactId: string }) {
  const [rows, setRows] = useState<Contact[]>();
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    ContactoService.getContactos({ id_cuenta: accountId }, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setRows(data.filter((row: Contact) => row.id_contacto !== contactId)); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [accountId, contactId]);
  if (!accountId) return <p>Este contacto no está asociado a una cuenta.</p>;
  if (error) return <p role="alert" className="text-red-700">No se pudieron cargar los contactos de la cuenta.</p>;
  if (!rows) return <p role="status">Cargando contactos…</p>;
  if (!rows.length) return <p>No hay otros contactos en esta cuenta.</p>;
  return <ul className="space-y-2">
    {rows.map(row => <li key={row.id_contacto}>
      <Link href={`/dashboard/comercial/contactos/${encodeURIComponent(row.id_contacto)}`} className="block cursor-pointer rounded-lg border p-3 hover:bg-blue-50">
        <span className="font-semibold">{row.nombre_completo_contacto || row.id_contacto}</span>
        {(row.cargo_contacto || row.email_contacto) && <span className="block text-sm text-gray-600">{[row.cargo_contacto, row.email_contacto].filter(Boolean).join(' · ')}</span>}
      </Link>
    </li>)}
  </ul>;
}
