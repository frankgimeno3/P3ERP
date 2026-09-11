import { NextResponse } from 'next/server';
import { createRecurringCharge, listRecurringCharges } from '../../../../../server/features/prevision/RecurringChargeRepository.js';
export const runtime = 'nodejs';
const failure = error => NextResponse.json({ message: error.message || 'No se pudo guardar el cargo previsto.' }, { status: error.status || (['23505','23503'].includes(error.code) ? 409 : 500) });
export async function GET() {
  try { return NextResponse.json(await listRecurringCharges()); }
  catch (error) { return failure(error); }
}
export async function POST(request) {
  try { return NextResponse.json(await createRecurringCharge(await request.json()), { status: 201 }); }
  catch (error) { return failure(error); }
}
