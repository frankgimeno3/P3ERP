import { reviewPayrollMovement } from '../../../../../../../server/features/prevision/PayrollReviewRepository.js';
export const runtime = 'nodejs';
export async function POST(request,{params}) {
  try { return Response.json(await reviewPayrollMovement((await params).id_linea_banco,await request.json())); }
  catch(error) { return Response.json({message:error.message || 'No se pudo revisar la nómina.'},{status:error.status || 500}); }
}
