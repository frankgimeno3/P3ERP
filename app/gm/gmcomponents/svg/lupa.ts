import { createElement, type SVGProps } from "react";

export default function Lupa(props: SVGProps<SVGSVGElement>) {
  return createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      className: "ml-2 h-4 w-4 flex-shrink-0 text-slate-700",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2.4,
      ...props,
    },
    createElement("circle", { cx: 11, cy: 11, r: 5 }),
    createElement("path", { d: "m20 20-4.2-4.2", strokeLinecap: "round" }),
  );
}
