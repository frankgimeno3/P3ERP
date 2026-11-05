export type Property = {
 id_propiedad:string; tipo:'parking'|'vehiculo'|'otros'; nombre:string; identificador:string;
 direccion:string; referencia_catastral:string; marca:string; modelo:string; notas:string;
 activo:boolean; updated_at:string; cargos_vigentes?:number;
 conjunto?:string;plaza?:string;direccion_catastral?:string;
};
export type ChargeRule = {id_regla:string;descripcion?:string;total_iva:number;cada?:number;unidad?:string;dia?:number;mes?:number;anio?:number};
export type Charge = {id_cargo_recurrente:string;nombre_proveedor?:string;programacion:ChargeRule[];activo:boolean;tipo_cargo:string};
export type LinkedCharge = Charge & {estado:'vigente'|'historico';notas:string;id_regla:string;propiedades_vinculadas:number;banco_pago?:string;tipo_programacion:string;termina_planificacion:boolean};
export type Catalog = {cargos:Charge[];proveedores:{id_proveedor:string;nombre_proveedor:string}[]};
export type Detail = {
 propiedad:Property;cargos:LinkedCharge[];
 movimientos:{id_linea_banco:string;banco:string;fecha_operativa:string;fecha_valor:string;concepto:string;importe:number;estado_revision:boolean;relacion:string;notas:string}[];
};
export const propertyTypes={parking:'Parking',vehiculo:'Vehículo',otros:'Otros'};
export const euros=(value:number)=>Number(value).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
export const button='cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition enabled:hover:bg-blue-50 disabled:cursor-default disabled:opacity-40';
export const input='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-900 disabled:bg-slate-100 [&:is(select):enabled]:cursor-pointer [&:is(select):enabled:hover]:border-blue-900';
