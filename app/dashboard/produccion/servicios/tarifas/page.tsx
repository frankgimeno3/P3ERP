import { redirect } from "next/navigation";

export default function TarifasRedirectPage() {
  redirect("/dashboard/produccion/servicios/editor_tarifas");
}
