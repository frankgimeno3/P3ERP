'use client';
import { useEffect, useState } from 'react';
export default function LastTigerUpdate({ type }: { type: 'cuentas'|'contactos' }) {
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/v1/operaciones/tiger/historial?tipo=${type}`).then(r=>r.ok?r.json():[]).then(data=>setDate(data[0]?.fecha_hora || null)).catch(()=>setDate(null)); }, [type]);
  const formatted = date ? new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(date)).replace(',', ' -') : 'SIN ACTUALIZACIONES';
  return <p className="text-right text-xs font-semibold text-gray-500">ÚLTIMA ACTUALIZACIÓN CON TIGER {formatted}</p>;
}
