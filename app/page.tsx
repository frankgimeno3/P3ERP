"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthenticationService from "@/app/service/AuthenticationService";

const loadingTexts = [
  "Accediendo a servidor...",
  "Comprobando datos...",
  "Accediendo de forma segura...",
];

function isInvalidCredentialsError(error: any) {
  const errorName = String(error?.name || error?.code || "");
  const errorMessage = String(error?.message || "").toLowerCase();
  return errorName === "NotAuthorizedException"
    || errorMessage.includes("incorrect username or password")
    || errorMessage.includes("incorrect password");
}

export default function Home() {
  const router = useRouter();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [redirectLoading, setRedirectLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const showRedirectLoader = async () => {
    setRedirectLoading(true);
    setLoadingStep(0);
    await new Promise((resolve) => setTimeout(resolve, 1800));
  };

  const getLoginRedirect = () => {
    const stored = localStorage.getItem("redirectAfterLogin");
    if (stored && stored.startsWith("/") && !stored.startsWith("/unlogged")) return stored;
    return "/dashboard";
  };

  const finishLoginRedirect = async () => {
    const target = getLoginRedirect();
    localStorage.removeItem("redirectAfterLogin");
    await showRedirectLoader();
    router.replace(target);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const storedPayload = localStorage.getItem("userPayload");
      if (storedPayload) {
        router.replace(getLoginRedirect());
        return;
      }

      try {
        const sessionPayload = await AuthenticationService.checkSession();
        if (sessionPayload) {
          localStorage.setItem("userPayload", JSON.stringify(sessionPayload));
          router.replace(getLoginRedirect());
        }
      } catch {
        console.log("No hay sesion activa");
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!redirectLoading) return;
    const interval = window.setInterval(() => {
      setLoadingStep((current) => Math.min(current + 1, loadingTexts.length - 1));
    }, 600);
    return () => window.clearInterval(interval);
  }, [redirectLoading]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    try {
      const payload: any = await AuthenticationService.login(employeeNumber, password);
      localStorage.setItem("userPayload", JSON.stringify(payload));
      await finishLoginRedirect();
    } catch (error: any) {
      if (isInvalidCredentialsError(error)) {
        setError("La contraseña introducida es incorrecta.");
        setIsLoggingIn(false);
        return;
      }
      if (error?.message?.includes("already a signed in user") || error?.message?.includes("already signed in")) {
        try {
          const sessionPayload = await AuthenticationService.checkSession();
          if (sessionPayload) {
            localStorage.setItem("userPayload", JSON.stringify(sessionPayload));
            await finishLoginRedirect();
            return;
          }
        } catch {
          // Continue to the regular login error.
        }
      }
      console.error("Error técnico durante el inicio de sesión:", error);
      setError(error?.message || "Error al iniciar sesion. Verifica tus credenciales.");
      setIsLoggingIn(false);
    }
  };

  if (redirectLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
        <p className="mt-6 min-h-7 text-lg font-semibold">{loadingTexts[loadingStep]}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-8 bg-white p-8 text-gray-600">
      <div className="flex flex-row items-center justify-left">
        <p className="text-xl font-bold">Portal de gestión PROPORCIÓN 3, S.A.</p>
      </div>

      <div className="flex flex-grow flex-col items-center justify-center">
        <form onSubmit={handleLogin} className="flex w-full max-w-md flex-col gap-4 rounded bg-gray-900 p-8 shadow-md">
          <h2 className="mb-4 text-center text-2xl font-semibold text-white">Ingrese email y contraseña</h2>

          <input
            type="text"
            placeholder="Introduzca su email"
            value={employeeNumber}
            onChange={(event) => {
              setEmployeeNumber(event.target.value);
              if (error) setError(null);
            }}
            className="rounded border border-gray-700 bg-black p-2 text-white placeholder-gray-400"
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Introduzca su contraseña"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded border border-gray-700 bg-black p-2 pr-10 text-white placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-200"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div role="status" aria-live="polite" className="rounded border border-red-400/50 bg-red-950/40 px-3 py-2 text-center text-sm text-red-300">
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className={`rounded py-2 transition ${isLoggingIn ? "cursor-not-allowed bg-blue-600 text-white" : "cursor-pointer bg-white text-black hover:bg-gray-300 hover:shadow-sm"}`}
          >
            {isLoggingIn ? "Accediendo..." : "Identificarse"}
          </button>

          <p className="text-xs text-white">Si no puede identificarse, por favor envíe email a frank@vidrioperfil.com.</p>
        </form>
      </div>
    </div>
  );
}
