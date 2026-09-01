import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

export default function ControlRedaccionPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Control redacción" />
      <main className="min-h-screen w-full bg-white p-12">
        <h1 className="text-xl font-semibold text-blue-950">Control redacción</h1>
      </main>
    </div>
  );
}
