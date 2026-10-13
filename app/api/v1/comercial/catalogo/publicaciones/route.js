import {getMagazineList} from '@/server/features/produccion/GestionesProduccionRepository.js';
export const runtime='nodejs';
export async function GET() {
  try{const data=await getMagazineList();return Response.json({publicaciones:data.publicaciones||[]});}
  catch{return Response.json({message:'No se pudo cargar el calendario de publicaciones.'},{status:500});}
}
