import { NextResponse } from "next/server";
import { getJuanLiquidity } from "../../../../../server/features/prevision/JuanRepository.js";
import {ensureJuanYears} from '../../../../../server/features/prevision/JuanAnnual.js';
import {getPgPool} from '../../../../../server/database/pgClient.js';
import {parseImportDate} from '../../../../../server/features/prevision/ReceiptExcel.js';
export const runtime="nodejs";
export async function GET(request) {
  try {
    const params=new URL(request.url).searchParams;
    const date=parseImportDate(params.get('fecha'));if(!date)return NextResponse.json({message:'Indica una fecha válida.'},{status:400});await ensureJuanYears(getPgPool());
    const result=await getJuanLiquidity(date);
    return NextResponse.json({...result,total:Math.round((result.Sabadell+result.Santander)*100)/100,'Sin asignar':-result.unassignedPayments.reduce((sum,p)=>sum+Number(p.total_pago||0),0)});
  } catch (error) {
    return NextResponse.json({message:"Error al calcular la previsión",detail:error.message},{status:error.status || 500});
  }
}
