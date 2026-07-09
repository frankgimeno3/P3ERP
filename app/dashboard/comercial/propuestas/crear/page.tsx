"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PropuestaEditor from "../componentesPropuestas/PropuestaEditor";

function CrearPropuestaContent() {
  const searchParams = useSearchParams();
  return <PropuestaEditor mode="create" cuentaInicial={searchParams.get("cuenta") ?? ""} />;
}

export default function CrearPropuestas() {
  return (
    <Suspense fallback={<div className="p-12 text-gray-600">Cargando...</div>}>
      <CrearPropuestaContent />
    </Suspense>
  );
}
