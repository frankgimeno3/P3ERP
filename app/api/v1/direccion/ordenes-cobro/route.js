import { getOrdenesAdministrativas } from '@/server/features/orden/OrdenRepository.js';
export const runtime = 'nodejs';
export async function GET() {
  try { return Response.json(await getOrdenesAdministrativas({ canceladas: false })); }
  catch { return Response.json({ message: 'No se pudieron cargar las órdenes de cobro.' }, { status: 500 }); }
}
