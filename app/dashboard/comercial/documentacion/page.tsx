import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import DocumentacionClient from "./DocumentacionClient";

export default function DocumentacionComercialPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-100 text-gray-700">
      <MiddleNav tituloprincipal="Documentación" />
      <DocumentacionClient />
    </div>
  );
}
