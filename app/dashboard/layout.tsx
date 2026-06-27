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
      <div className="flex flex-row w-full ">
      <LoggedLeftMenu/>
      <div className="flex flex-col w-full">
      {children}
      </div>
      </div>
    </>
  );
} 