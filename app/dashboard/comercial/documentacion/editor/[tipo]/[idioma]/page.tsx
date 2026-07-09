"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

const labels: Record<string, string> = {
  tarifas: "Tarifas",
  estadisticas: "Estadísticas",
  es: "Español",
  en: "English",
};

export default function EditorDocumentacionPage() {
  const params = useParams<{ tipo: string; idioma: string }>();
  const tipo = params.tipo;
  const idioma = params.idioma;

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal={`Editor: ${labels[tipo] || tipo}`} />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-8 text-gray-600">
        <div className="mb-4">
          <Link href="/dashboard/comercial/documentacion" className="border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50">
            Volver a documentación
          </Link>
        </div>

        <div className="bg-white p-6 shadow-sm">
          <p className="text-xl font-semibold text-blue-950">{labels[tipo] || tipo} · {labels[idioma] || idioma}</p>
          <p className="mt-2 text-sm text-gray-500">
            Placeholder del editor de PDF. Aquí se editará el documento tomando como base versiones anteriores.
          </p>

          <div className="mt-6 grid grid-cols-[260px_1fr] gap-5">
            <aside className="border border-gray-200 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">Versiones anteriores</p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>v1.0 · Pendiente de cargar</p>
                <p>v1.1 · Pendiente de cargar</p>
              </div>
            </aside>

            <div className="min-h-[420px] border border-dashed border-gray-300 bg-gray-50 p-6">
              <p className="text-sm font-medium text-gray-700">Área de edición del PDF</p>
              <p className="mt-2 text-sm text-gray-500">Sin contenido editable todavía.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
