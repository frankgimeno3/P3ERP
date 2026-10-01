import {NextResponse} from 'next/server';
import {replaceContractOrders} from '../../../../../../../../server/features/contrato/ReplaceContractOrders.js';
import {requestActor} from '../../../../../../../../server/features/comentario/AccountActivity.js';
export const runtime='nodejs';
export async function POST(request,{params}){try{const {id}=await params,body=await request.json();return NextResponse.json(await replaceContractOrders(id,body.ordenes,body.nuevas,requestActor(request)));}catch(error){return NextResponse.json({message:'No se pudieron reemplazar las órdenes',detail:error.message},{status:400});}}
