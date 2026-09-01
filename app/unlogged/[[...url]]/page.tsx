"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

export default function UnloggedPage() {
  const params = useParams<{ url?: string[] }>();
  const previousUrl = useMemo(() => {
    const encoded = Array.isArray(params.url) ? params.url.join("/") : "";
    try {
      return decodeURIComponent(encoded || "/dashboard");
    } catch {
      return "/dashboard";
    }
  }, [params.url]);

  useEffect(() => {
    if (previousUrl.startsWith("/") && !previousUrl.startsWith("/unlogged")) {
      localStorage.setItem("redirectAfterLogin", previousUrl);
    }
  }, [previousUrl]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-white">
      <section className="w-full max-w-xl rounded bg-white p-8 text-gray-700 shadow-2xl">
        <p className="text-xs font-semibold uppercase text-gray-400">Sesion finalizada</p>
        <h1 className="mt-2 text-2xl font-semibold text-blue-950">Se ha cerrado tu sesion por seguridad</h1>
        <p className="mt-4 text-sm leading-6">
          Estabas en la pagina <strong>{previousUrl}</strong>, pero la sesion ha caducado por seguridad o por inactividad.
          Al volver a iniciar sesion te devolveremos a esa misma pagina.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
          Iniciar sesion de nuevo
        </Link>
      </section>
    </main>
  );
}
