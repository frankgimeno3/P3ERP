import type { Metadata } from "next";
import { Inter } from "next/font/google";

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
    <section className={`${inter.variable} min-h-full flex flex-col antialiased`}>
      <div className="fixed right-4 top-4 z-50 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
        AGENTE: GIMENO
      </div>
      {children}
    </section>
  );
}
