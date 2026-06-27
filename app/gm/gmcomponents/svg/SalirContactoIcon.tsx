import type { SVGProps } from "react";

export default function SalirContactoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12H3" strokeLinecap="round" />
      <path d="M17 5h3v14h-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
