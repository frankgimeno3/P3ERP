'use client';
import { useEffect } from 'react';
import { request } from '@/app/lib/request';
import type { Dispatch, SetStateAction } from 'react';

export function useReviewResources(setData: Dispatch<SetStateAction<any>>, setDrafts: Dispatch<SetStateAction<any>>, setReady: (value: boolean) => void, setError: (value: string) => void, setLoading: (value: boolean) => void) {
  useEffect(() => {
    const controller = new AbortController();
    const urls = ['/api/v1/admin/proveedores','/api/v1/comercial/cuentas','/api/v1/direccion/laboral/empleados','/api/v1/direccion/cargos-recurrentes','/api/v1/direccion/laboral/nominas','/api/v1/direccion/laboral/anticipos','/api/v1/direccion/ordenes-cobro','/api/v1/direccion/prevision-gastos','/api/v1/direccion/prevision-ingresos?tipo=remesas'];
    Promise.all(urls.map(url => request(url, { signal: controller.signal, cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok || !Array.isArray(d)) throw new Error(d.message || 'No se pudieron cargar los datos de revisión.'); return d; })))
      .then(([providers, clients, employees, charges, payrolls, advances, orders, forecasts, remesas]) => {setData({ providers, clients, employees, charges, payrolls, advances, orders, forecasts, remesas });setDrafts((current:any)=>Object.fromEntries(Object.entries(current).map(([id,d]:any)=>[id,!d.entityId && charges.some((c:any)=>String(c.id_cargo_recurrente)===d.chargeId&&c.tipo_cargo==='otro')?{...d,entityType:'otro'}:d])));setReady(true);})
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [setData, setDrafts, setReady, setError, setLoading]);
}
