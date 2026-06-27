import { notFound } from "next/navigation";
import CuentaDetalle from "@/app/gm/gmcomponents/uiElements/cuenta/CuentaDetalle";
import type { Account } from "@/app/gm/gmcomponents/uiElements/cuenta/types";
import cuentasData from "@/app/gm/gmcomponents/contents/cuentas.json";

type PageProps = {
  params: Promise<{ codigo: string }>;
};

export default async function CuentaPage({ params }: PageProps) {
  const { codigo } = await params;
  const cuenta = (cuentasData as Account[]).find((item) => item.codigo === codigo);

  if (!cuenta) {
    notFound();
  }

  return <CuentaDetalle cuenta={cuenta} />;
}
