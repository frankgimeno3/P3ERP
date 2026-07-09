"use client";

import React from "react";
import LoggedNav from "../general_components/componentes_recurrentes/loggedNav";
import LoggedLeftMenu from "../general_components/componentes_recurrentes/loggedLeftMenu";

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
        <div className="flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </>
  );
} 
