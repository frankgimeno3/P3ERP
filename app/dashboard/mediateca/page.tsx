"use client";

import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import { MediatecaBrowser } from "./MediatecaComponents";

export default function MediatecaPage() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-600">
      <MiddleNav tituloprincipal="Mediateca" />
      <div className="px-12 py-6">
        <div className="rounded-lg bg-white p-8 shadow-xl">
          <MediatecaBrowser />
        </div>
      </div>
    </div>
  );
}
