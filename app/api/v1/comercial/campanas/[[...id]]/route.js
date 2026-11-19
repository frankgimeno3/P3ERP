import { NextResponse } from 'next/server';
import { taskIdentity } from '@/server/features/laboral/TaskAccess.js';
import { addCampaignTask, commercialCampaigns, saveCommercialCampaign } from '@/server/features/cuenta/CommercialCampaignRepository.js';

export const runtime = 'nodejs';

async function handle(request, context) {
  try {
    const { id = [] } = await context.params;
    if (id.length > 1) return NextResponse.json({ message: 'Campaña no encontrada.' }, { status: 404 });
    const actor = taskIdentity(request);
    if (request.method === 'GET') {
      const accountId = new URL(request.url).searchParams.get('cuenta');
      return NextResponse.json(await commercialCampaigns(actor, { id: id[0], accountId }));
    }
    if (request.method === 'POST' && id[0]) return NextResponse.json(await addCampaignTask(actor, id[0], await request.json()), { status: 201 });
    if ((request.method === 'PUT') !== Boolean(id[0])) return NextResponse.json({ message: 'Ruta no válida.' }, { status: 405 });
    return NextResponse.json(await saveCommercialCampaign(actor, id[0], await request.json()), { status: id[0] ? 200 : 201 });
  } catch (error) {
    if (!error.status) console.error('Error en campañas comerciales:', error);
    return NextResponse.json({ message: error.status ? error.message : 'No se pudo completar la operación de campaña.' }, { status: error.status || 500 });
  }
}

export { handle as GET, handle as POST, handle as PUT };
