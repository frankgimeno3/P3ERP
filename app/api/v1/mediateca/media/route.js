import { NextResponse } from "next/server";
import { createMedia, getMedia } from "../../../../../server/features/mediateca/MediatecaRepository.js";
import {assertMediatecaAccess} from '@/server/features/mediateca/MediatecaAccess.js';

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const {roles}=await assertMediatecaAccess(request,{folderId:params.get('folderId'),path:params.get('folderPath')||''});
    const media=await getMedia({
      folderPath: params.get("folderPath") || "",
      folderId: params.get("folderId") || "",
      search: params.get("search") || "",
    });return NextResponse.json(media.map(item=>({...item,effectiveRoles:roles})));
  } catch (error) {
    return NextResponse.json({ message: "Error al cargar archivos", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await createMedia(body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Error al registrar archivo" }, { status: 400 });
  }
}
