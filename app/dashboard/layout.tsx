"use client";

import React from "react";
import LoggedNav from "../general_components/componentes_recurrentes/loggedNav";
import LoggedLeftMenu from "../general_components/componentes_recurrentes/loggedLeftMenu";
import Link from "next/link";

export default function RegistroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LoggedNav />
      <div className="flex w-full min-w-0 flex-row overflow-x-hidden">
        <LoggedLeftMenu />
        <div className="relative flex min-h-[calc(100vh-4rem)] min-w-0 flex-1 flex-col pb-12">
          {children}
          <Link href="/ayuda/informacion-legal" className="absolute bottom-3 left-1/2 -translate-x-1/2 cursor-pointer text-center text-xs text-blue-800 underline-offset-4 transition hover:text-blue-950 hover:underline">Información legal verifactu</Link>
        </div>
      </div>
    </>
  );
} 
