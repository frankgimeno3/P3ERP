import { NextResponse } from "next/server";
import { getJuanLiquidity } from "../../../../../server/features/prevision/JuanRepository.js";
import {ensureJuanYears,juanYear} from '../../../../../server/features/prevision/JuanAnnual.js';
import {syncJuanOperationalRows} from '../../../../../server/features/prevision/JuanOperationalSync.js';
import {getPgPool} from '../../../../../server/database/pgClient.js';
import {parseImportDate} from '../../../../../server/features/prevision/ReceiptExcel.js';
export const runtime="nodejs";
export async function GET(request) {
  try {
    const params=new URL(request.url).searchParams;
    const date=parseImportDate(params.get('fecha'));if(!date)throw Error('Indica una fecha válida.');await ensureJuanYears(getPgPool());
    await syncJuanOperationalRows(juanYear(date.slice(-4)));
    const result=await getJuanLiquidity(date);
    return NextResponse.json({...result,total:Math.round((result.Sabadell+result.Santander)*100)/100,'Sin asignar':0});
  } catch (error) {
    return NextResponse.json({message:"Error al calcular la previsión",detail:error.message},{status:400});
  }
}
