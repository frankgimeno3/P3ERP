import { NextResponse } from 'next/server';
import { createDirectContract } from '../../../../../../server/features/contrato/DirectContract.js';
import { requestActor } from '../../../../../../server/features/comentario/AccountActivity.js';

export const runtime='nodejs';
export async function POST(request) {
  try {
    return NextResponse.json(await createDirectContract(await request.json(),requestActor(request)),{status:201});
  } catch(error) {
    return NextResponse.json({message:error.status ? error.message : 'No se ha creado el contrato.'},{status:error.status || 500});
  }
}
