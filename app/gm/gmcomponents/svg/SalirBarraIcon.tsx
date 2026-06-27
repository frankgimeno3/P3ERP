import type { SVGProps } from "react";

export default function SalirBarraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M5 4h10a2 2 0 0 1 2 2v3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 15v3a2 2 0 0 1-2 2H5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12h10" strokeLinecap="round" />
      <path d="m16 8 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
