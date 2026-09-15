import { NextResponse } from "next/server";
import { getLiquidityForecast } from "../../../../../server/features/prevision/LiquidityRepository.js";
export const runtime="nodejs";
export async function GET(request) {
  try {
    return NextResponse.json(await getLiquidityForecast(new URL(request.url).searchParams.get("fecha")));
  } catch (error) {
    return NextResponse.json({message:"Error al calcular la previsión",detail:error.message},{status:400});
  }
}
