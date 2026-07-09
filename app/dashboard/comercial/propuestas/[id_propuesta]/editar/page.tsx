"use client";

import React, { use } from "react";
import PropuestaEditor from "../../componentesPropuestas/PropuestaEditor";

export default function EditarPropuesta({ params }: { params: Promise<{ id_propuesta: string }> }) {
  const { id_propuesta } = use(params);
  return <PropuestaEditor mode="edit" idPropuesta={id_propuesta} />;
}
