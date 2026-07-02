import { notFound } from "next/navigation";
import CuentaDetalle from "@/app/gm/gmcomponents/uiElements/cuenta/CuentaDetalle";
import { getGmCuentaByCodigo } from "@/server/features/gm/GmRepository.js";

type PageProps = {
  params: Promise<{ codigo: string }>;
};

export default async function CuentaPage({ params }: PageProps) {
  const { codigo } = await params;
  const result = await getGmCuentaByCodigo(codigo);

  if (!result) {
    notFound();
  }

  return <CuentaDetalle cuenta={result.cuenta} contactos={result.contactos} agentes={result.agentes} />;
}
