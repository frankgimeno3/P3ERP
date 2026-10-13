import assert from 'node:assert/strict';
import {getPgPool} from '../server/database/pgClient.js';
import {updateTicket} from '../server/features/proveedor/TicketDetailRepository.js';
const pool=getPgPool(),original=pool.connect.bind(pool),stamp='2026-10-13T10:00:00.000Z';
let ticket,updated=false;
const client={release(){},query:async(sql,params=[])=>{
 if(sql.startsWith('SELECT * FROM administracion_tickets'))return {rows:[ticket],rowCount:1};
 if(sql.startsWith('SELECT t.*'))return {rows:[{...ticket,fecha:'2026-03-25'}],rowCount:1};
 if(sql.startsWith('UPDATE administracion_tickets')){updated=true;assert.equal(params[2],ticket.expectedAmount);return {rows:[],rowCount:1};}
 return {rows:[],rowCount:0};
}};
pool.connect=async()=>client;
const seed=()=>{ticket={id_ticket:1,fecha_ticket:'25/03/2026',forma_pago:'efectivo',ambito:'P3',nombre_personalizado_proveedor:'Proveedor original',estado_revision:'pendiente',clasificacion:'asociable',updated_at:stamp,documento_src:'/api/v1/admin/tickets/1/archivo',datos_importacion:{moneda:'USD'},expectedAmount:null};updated=false;};
const body=()=>({version:stamp,fecha:'2026-03-25',importe_total:null,base_imponible:null,forma_pago:'efectivo',estado_revision:'pendiente',clasificacion:'asociable',comentarios:'Original',feria:'CHINAGLASS 2026'});
try{
 seed();await updateTicket(1,body());assert(updated,'Guardar un borrador no inventa cero euros ni IVA.');
 seed();await assert.rejects(()=>updateTicket(1,{...body(),estado_revision:'punteado'}),error=>error.status===409);assert(!updated);
 seed();ticket.datos_importacion.moneda='EUR';ticket.expectedAmount=-49.95;await updateTicket(1,{...body(),importe_total:-49.95,base_imponible:-41.28});assert(updated,'Las devoluciones conservan su signo.');
 seed();ticket.documento_src='';await assert.rejects(()=>updateTicket(1,{...body(),importe_total:21,base_imponible:20,estado_revision:'punteado'}),error=>error.status===409);assert(!updated);
 seed();await assert.rejects(()=>updateTicket(1,{...body(),importe_total:0}),error=>error.status===409);
 console.log('PASS: borradores con divisa o IVA desconocidos, devolución negativa y bloqueo de revisión sin importe o justificante.');
}finally{pool.connect=original;await pool.end();}
