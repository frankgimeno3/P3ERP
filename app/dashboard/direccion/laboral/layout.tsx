import type { ReactNode } from 'react';
import './laboral.css';

export default function LaboralLayout({ children }: { children: ReactNode }) {
  return <main className="laboral min-h-screen min-w-0 bg-gray-100 p-5 text-sm text-slate-800">{children}</main>;
}
