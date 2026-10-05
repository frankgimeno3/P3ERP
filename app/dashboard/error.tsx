'use client';
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="m-8 rounded border border-red-200 bg-white p-6"><h2 className="text-lg font-semibold">No se ha podido cargar esta página</h2><p className="my-3">Puedes volver a intentarlo sin perder la sesión.</p><button type="button" onClick={reset} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-800">Volver a intentarlo</button></section>;
}
