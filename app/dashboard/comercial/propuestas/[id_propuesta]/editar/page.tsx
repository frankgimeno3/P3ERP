"use client";

import React, { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import PropuestaEditor from "../../componentesPropuestas/PropuestaEditor";

function EditarContent({ idPropuesta }: { idPropuesta: string }) {
  const searchParams = useSearchParams();
  const requested = Number(searchParams.get("fase"));
  return <PropuestaEditor mode="edit" idPropuesta={idPropuesta} initialStep={requested >= 1 && requested <= 4 ? requested : undefined} />;
}

export default function EditarPropuesta({ params }: { params: Promise<{ id_propuesta: string }> }) {
  const { id_propuesta } = use(params);
  return <Suspense fallback={<div className="p-12 text-gray-600">Cargando...</div>}><EditarContent idPropuesta={id_propuesta} /></Suspense>;
}
