import {saveJuanRow} from '../../../../../../../server/features/prevision/JuanRowsRepository.js';
import {adminError} from '../../../../../../../server/features/proveedor/SupplierAdminRepository.js';
import {getPgPool} from '../../../../../../../server/database/pgClient.js';
export const runtime='nodejs';
export async function POST(request){try{return Response.json(await saveJuanRow(await request.json()));}catch(error){return adminError(error);}}
export async function GET(){try{return Response.json((await getPgPool().query("SELECT id_agente,COALESCE(NULLIF(nombre_completo_agente,''),trim(concat_ws(' ',nombre_agente,apellidos_agente))) nombre FROM agentes_db WHERE is_empleado_account=TRUE AND estado_agente='activo' ORDER BY nombre_agente")).rows);}catch(error){return adminError(error);}}
