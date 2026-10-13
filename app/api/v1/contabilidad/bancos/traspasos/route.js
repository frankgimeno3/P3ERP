import {NextResponse} from 'next/server';
import {readInternalTransfers,transferReviewOptions,saveInternalTransfer} from '@/server/features/banco/InternalTransfers.js';
import {requestActor} from '@/server/features/comentario/AccountActivity.js';
export const runtime='nodejs';
export async function GET(request) {
  try {const id=new URL(request.url).searchParams.get('id');return NextResponse.json(id?await transferReviewOptions(id):await readInternalTransfers());}
  catch(error){return NextResponse.json({message:error.message},{status:error.status||400});}
}
export async function POST(request) {
  try{return NextResponse.json(await saveInternalTransfer(await request.json(),requestActor(request)));}
  catch(error){return NextResponse.json({message:error.message},{status:error.status||400});}
}
