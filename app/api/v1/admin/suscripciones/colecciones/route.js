import {getSubscriptionCollections} from '@/server/features/suscripcion/SuscripcionRepository.js';
export async function GET(){try{return Response.json(await getSubscriptionCollections());}catch{return Response.json({message:'No se pudieron cargar las colecciones.'},{status:500});}}
