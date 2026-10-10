import { NextResponse } from "next/server";
import { getOrdenAdministrativaById, getOrdenesAdministrativas } from "../../../../../../server/features/orden/OrdenRepository.js";
import { updateAdministrativeOrder } from "../../../../../../server/features/factura/FacturaClienteRepository.js";
import {requestActor} from "../../../../../../server/features/comentario/AccountActivity.js";
import {previewOrderCancellation,cancelAdministrativeOrder} from "../../../../../../server/features/orden/OrderCancellation.js";

import { changeOrderCollectionClosure } from '../../../../../../server/features/orden/OrderCollectionClosure.js';

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const orden = searchParams.get('action')==='cancelacion' ? await previewOrderCancellation(id) : await getOrdenAdministrativaById(id);
      return orden ? NextResponse.json(orden) : NextResponse.json({ message: "Orden no encontrada" }, { status: 404 });
    }
    const ordenes = await getOrdenesAdministrativas({
      search: searchParams.get("search") || "",
      ...(searchParams.has('canceladas')?{canceladas:searchParams.get('canceladas')==='true'}:{}),
    });

    return NextResponse.json(ordenes);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/control-administrativo/ordenes:", error);
    return NextResponse.json(
      { message: "Error al cargar las órdenes", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Falta el identificador" }, { status: 400 });
    const row = await updateAdministrativeOrder(id, await request.json(),requestActor(request));
    return row ? NextResponse.json(await getOrdenAdministrativaById(id)) : NextResponse.json({ message: "Orden no encontrada" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: "Error al guardar la orden", detail: error.message }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const id=new URL(request.url).searchParams.get('id');
    const data=await request.json();
    if (id && ['cerrar_cobro','reabrir_cobro'].includes(data.action)) {
      await changeOrderCollectionClosure(id, data, requestActor(request));
      return NextResponse.json(await getOrdenAdministrativaById(id));
    }
    if(!id || data.action!=='cancelar')return NextResponse.json({message:'Solicitud de cancelación no válida'},{status:400});
    const result=await cancelAdministrativeOrder(id,data.version,requestActor(request));
    return result?NextResponse.json(await getOrdenAdministrativaById(id)):NextResponse.json({message:'Orden no encontrada'},{status:404});
  }catch(error){return NextResponse.json({message:error.message},{status:error.status||400});}
}
