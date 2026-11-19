import type { Metadata } from "next";
import { Inter } from "next/font/google";
import GmAccessAndPointer from "./GmAccessAndPointer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Verifactu CRM",
  description: "Gestión visual de cuentas y contactos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section className={`${inter.variable} gm-shell min-h-full flex flex-col antialiased`}>
      <style>{`
        .gm-shell button:not(:disabled), .gm-shell [role="button"]:not([aria-disabled="true"]) {
          cursor: pointer;
          border-color: rgba(107, 114, 128, .28);
          transition: background-color .25s ease, border-color .25s ease, box-shadow .25s ease;
        }
        .gm-shell button:not(:disabled):hover, .gm-shell [role="button"]:not([aria-disabled="true"]):hover {
          filter: brightness(.94);
          border-color: rgba(107,114,128,.45);
          box-shadow: 0 1px 3px rgba(15,23,42,.12);
        }
        .gm-shell button:disabled, .gm-shell [aria-disabled="true"] { cursor: not-allowed !important; }
        .gm-control-pulse {
          position: fixed; z-index: 9999; width: 12px; height: 12px; border: 2px solid #000;
          border-radius: 9999px; pointer-events: none; transform: translate(-50%,-50%);
          animation: gmControlPulse 2s linear forwards;
        }
        @keyframes gmControlPulse {
          from { width: 12px; height: 12px; border-width: 2px; opacity: .9; }
          to { width: 110px; height: 110px; border-width: 12px; opacity: 0; }
        }
      `}</style>
      <GmAccessAndPointer>

        <div className="fixed right-4 top-4 z-50 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">AGENTE: GIMENO</div>
        {children}
      </GmAccessAndPointer>
    </section>
  );
}
