export default function SVGRow() {
  const items = [
    { label: "Nuevo", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14" strokeLinecap="round" /><path d="M5 12h14" strokeLinecap="round" /></svg>) },
    { label: "Editar", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h4l10-10-4-4L4 16z" /><path d="m14 6 4 4" /></svg>) },
    { label: "Avanzada", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 7h14" strokeLinecap="round" /><path d="M8 12h8" strokeLinecap="round" /><path d="M10 17h4" strokeLinecap="round" /></svg>) },
    { label: "Imprimir", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M8 5V3h8v2" /><path d="M8 19v2h8v-2" /></svg>) },
    { label: "Exportar", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v10" strokeLinecap="round" /><path d="m7 10 5 5 5-5" strokeLinecap="round" /><path d="M5 19h14" strokeLinecap="round" /></svg>) },
    { label: "Limpiar", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h10" strokeLinecap="round" /><path d="M8 7V5h8v2" /><path d="M8 7v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" /></svg>) },
    { label: "Diseño", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16" /></svg>) },
    { label: "Informes", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h8l4 4v12H6z" /><path d="M14 4v4h4" /></svg>) },
    { label: "Estadísticas", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19V9" strokeLinecap="round" /><path d="M12 19V5" strokeLinecap="round" /><path d="M19 19v-7" strokeLinecap="round" /></svg>) },
    { label: "Salir", icon: (<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 12H3" strokeLinecap="round" /></svg>) },
  ];

  return (
    <div className="flex flex-row items-center justify-between  bg-[#f3f5f7] px-4 py-6 text-slate-800 sm:px-6 lg:px-8 border-b border-gray-800 shadow shadow-xl ">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-5 px-3 py-2 ">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9e2ea] text-slate-700">
            {item.icon}
          </div>
          <p className="text-xs font-medium text-slate-700">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
