import { settleCard,getCardSettlement } from '@/server/features/proveedor/CardSettlementRepository.js';
import { adminError,ProveedorError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime='nodejs';
export async function GET(request){try{return Response.json(await getCardSettlement(new URL(request.url).searchParams.get('id')));}catch(e){return adminError(e);}}
export async function POST(request){try{const body=await request.json();if(body.action!=='preview')throw new ProveedorError('Completa la revisión del PDF y los justificantes en Administración → Liquidaciones antes de cerrar.',409);return Response.json(await settleCard(body.id_tarjeta,body,requestActor(request)));}catch(e){return adminError(e);}}
