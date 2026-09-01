"use client";

import React, { use } from "react";
import PropuestaEditor from "../../componentesPropuestas/PropuestaEditor";

export default function ReplicarPropuesta({ params }: { params: Promise<{ id_propuesta: string }> }) {
  const { id_propuesta } = use(params);
  return <PropuestaEditor mode="replicate" idPropuesta={id_propuesta} />;
}
