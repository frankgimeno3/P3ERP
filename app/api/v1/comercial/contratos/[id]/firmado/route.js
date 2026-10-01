import { NextResponse } from 'next/server';
import { getSignedContract, presignSignedContract, registerSignedContract, signedContractDownload } from '@/server/features/contrato/SignedContract.js';
export const runtime = 'nodejs';
export async function GET(request,{params}) {
  try {
    const {id}=await params;
    if (new URL(request.url).searchParams.has('descarga')) {
      const url=await signedContractDownload(id);
      return url?NextResponse.json({url}):NextResponse.json({message:'Archivo no encontrado'},{status:404});
    }
    const result=await getSignedContract(id);
    return result?NextResponse.json(result):NextResponse.json({message:'Contrato no encontrado'},{status:404});
  } catch(error) {return NextResponse.json({message:error.message},{status:400});}
}
export async function POST(request,{params}) {
  try {const {id}=await params;return NextResponse.json(await presignSignedContract(id,(await request.json()).contentType));}
  catch(error) {return NextResponse.json({message:error.message},{status:400});}
}
export async function PUT(request,{params}) {
  try {const {id}=await params;return NextResponse.json(await registerSignedContract(id,await request.json()));}
  catch(error) {return NextResponse.json({message:error.message},{status:400});}
}
