import {NextResponse} from 'next/server';
import {getJuanWorkbook,editJuanCell,applyJuanMovement} from '../../../../../../server/features/prevision/JuanRepository.js';
import {ensureJuanYears,juanYear} from '../../../../../../server/features/prevision/JuanAnnual.js';
import {getPgPool} from '../../../../../../server/database/pgClient.js';
import {closeJuanMonth,monthlyJuanReview} from '../../../../../../server/features/prevision/JuanMonthly.js';
export const runtime='nodejs';
export async function GET(request) {
  try{const year=juanYear(new URL(request.url).searchParams.get('year'));const years=await ensureJuanYears(getPgPool());const book=await getJuanWorkbook(getPgPool(),year);return NextResponse.json({...book,years,currentYear:juanYear(),monthlyReview:monthlyJuanReview(book)});}
  catch(error){return NextResponse.json({message:error.message},{status:error.status || 500});}
}
export async function PATCH(request) {
  try{return NextResponse.json(await editJuanCell(await request.json()));}
  catch(error){return NextResponse.json({message:error.message},{status:error.status || 500});}
}
export async function POST(request) {
  try{const body=await request.json();return NextResponse.json(await (['close-month','reopen-month'].includes(body.action)?closeJuanMonth(body):applyJuanMovement(body)));}
  catch(error){return NextResponse.json({message:error.message},{status:error.status || 500});}
}
