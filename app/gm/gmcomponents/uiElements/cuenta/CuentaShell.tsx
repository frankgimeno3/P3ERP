import type { ReactNode } from "react";
import Cabezal from "@/app/gm/gmcomponents/uiElements/home/Cabezal";

type CuentaShellProps = {
  children: ReactNode;
};

export default function CuentaShell({ children }: CuentaShellProps) {
  return (
    <main className="min-h-screen bg-[#f3f5f7] px-4 py-8 text-slate-800">
      <div className="flex flex-col border border-gray-800 bg-[#164a75] px-2 pb-5">
        <Cabezal />
        {children}
      </div>
    </main>
  );
}
