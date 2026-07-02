"use client";

import type { FC } from "react";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";

type AdministracionPageShellProps = {
  title: string;
};

const AdministracionPageShell: FC<AdministracionPageShellProps> = ({ title }) => {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal={title} />
      <div className="min-h-screen w-full bg-white p-12 text-gray-600">
        <h2 className="mb-6 text-lg font-semibold">{title}</h2>
      </div>
    </div>
  );
};

export default AdministracionPageShell;
