import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

const placeholderPdf = "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMD4+CmVuZG9iagp0cmFpbGVyCjw8L1Jvb3QgMSAwIFI+PgolJUVPRgo=";

const sections = [
  {
    key: "tarifas",
    title: "Tarifas",
    description: "Documentos de tarifas comerciales para enviar a clientes.",
    documents: [
      { idioma: "es", label: "Tarifas en español", file: "tarifas-es.pdf" },
      { idioma: "en", label: "Rates in English", file: "tarifas-en.pdf" },
    ],
  },
  {
    key: "estadisticas",
    title: "Estadísticas",
    description: "Estadísticas de productos y soportes para presentar a clientes.",
    documents: [
      { idioma: "es", label: "Estadísticas en español", file: "estadisticas-es.pdf" },
      { idioma: "en", label: "Statistics in English", file: "estadisticas-en.pdf" },
    ],
  },
];

export default function DocumentacionComercialPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Documentación" />
      <div className="min-h-screen w-full bg-gray-100 px-12 py-8 text-gray-600">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {sections.map((section) => (
            <section key={section.key} className="bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-blue-950">{section.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{section.description}</p>
              </div>

              <div className="space-y-3">
                {section.documents.map((document) => (
                  <div key={`${section.key}-${document.idioma}`} className="flex items-center justify-between border border-gray-200 p-4">
                    <div>
                      <p className="font-medium text-gray-800">{document.label}</p>
                      <p className="text-xs uppercase text-gray-500">Placeholder PDF</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={placeholderPdf}
                        download={document.file}
                        className="border border-blue-950 px-3 py-2 text-sm font-medium text-blue-950 hover:bg-blue-50"
                      >
                        Descargar PDF
                      </a>
                      <Link
                        href={`/dashboard/comercial/documentacion/editor/${section.key}/${document.idioma}`}
                        className="bg-blue-950 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900"
                      >
                        Editor
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
