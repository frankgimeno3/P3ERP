"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

export default function GmAccessAndPointer({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [pulse, setPulse] = useState<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    fetch("/api/validate-token", { method: "POST", credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Sesión no válida");
        setAllowed(true);
      })
      .catch(() => {
        localStorage.setItem("redirectAfterLogin", pathname || "/gm");
        router.replace(`/unlogged/${encodeURIComponent(pathname || "/gm")}`);
      });
  }, [pathname, router]);

  useEffect(() => {
    let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const move = (event: MouseEvent) => { pointer = { x: event.clientX, y: event.clientY }; };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Control" || event.repeat) return;
      setPulse({ ...pointer, id: Date.now() });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("keydown", key); };
  }, []);

  if (!allowed) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">Comprobando sesión...</div>;
  return <>{children}{pulse && <span key={pulse.id} className="gm-control-pulse" style={{ left: pulse.x, top: pulse.y }} aria-hidden="true" />}</>;
}
