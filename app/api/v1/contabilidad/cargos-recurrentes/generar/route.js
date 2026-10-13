import { NextResponse } from 'next/server';
import { extendRecurringCharges } from '../../../../../../server/features/prevision/RecurringChargeRepository.js';
export const runtime = 'nodejs';
export async function POST() {
  try { return NextResponse.json(await extendRecurringCharges()); }
  catch (error) { return NextResponse.json({ message: error.message || 'No se han podido ampliar los cargos.' }, { status: error.status || 500 }); }
}
