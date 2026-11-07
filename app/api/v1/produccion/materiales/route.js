import { NextResponse } from "next/server";
import { getMateriales } from "../../../../../server/features/material/MaterialRepository.js";

export const runtime = "nodejs";
export async function GET() {
  try { return NextResponse.json(await getMateriales()); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 500 }); }
}
export async function POST(){return NextResponse.json({message:'Aporta los materiales desde la ficha de su contenido.'},{status:405,headers:{Allow:'GET'}});}
