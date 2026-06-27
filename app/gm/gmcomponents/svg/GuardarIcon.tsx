import type { SVGProps } from "react";

export default function GuardarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#1f3f73" d="M4 3h13l3 3v15H4z" />
      <path fill="#dbe6f2" d="M7 4.8h8v5.2H7z" />
      <path fill="#1f3f73" d="M13.2 4.8h1.8v4h-1.8z" />
      <path fill="#eef3f8" d="M7 14h10v7H7z" />
      <path fill="#1f3f73" d="M8.5 16h7v1.2h-7z" />
    </svg>
  );
}
