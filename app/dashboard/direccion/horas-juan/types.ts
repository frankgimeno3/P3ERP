export type InformeTipo = 'normal' | 'informativa' | 'anticipo';
export interface InformeJuan {
  id_horas_juan: number; mes: number; anio: number; nombre: string; tipo: InformeTipo;
  horas: number | null; horas_enteras: number | null; minutos: number | null; precio_hora: number;
  importe_generado: number | null; importe_anticipo: number | null; importe_ajuste: number;
  importe_pagar: number | null; saldo_pendiente: number; fecha: string; compensado_en_id: number | null;
  motivo_ajuste?: string | null; compensaciones?: InformeJuan[]; deudor?: string; importe_deuda?: number;
}
export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const euros = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
export const fechaEs = (value: string) => { const [y,m,d] = value.slice(0,10).split('-'); return `${d}.${m}.${y}`; };
