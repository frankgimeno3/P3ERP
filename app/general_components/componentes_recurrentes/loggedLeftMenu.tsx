"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardMenu, type DashboardMenuEntry } from "@/app/config/dashboardMenu";
import { canViewModule } from "@/app/config/roleAccess";

function ArrowIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function entryContainsPath(entry: DashboardMenuEntry, pathname: string): boolean {
  return entry.type === "page"
    ? pathname === entry.href || pathname.startsWith(`${entry.href}/`)
    : entry.children.some((child) => entryContainsPath(child, pathname));
}

export default function LoggedLeftMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/validate-token", { method: "POST", credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((profile) => { if (active) setRole(profile?.role || "base"); })
      .catch(() => { if (active) setRole("base"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const active: Record<string, boolean> = {};
    dashboardMenu.forEach((module) => {
      if (module.children.some((entry) => entryContainsPath(entry, pathname))) active[module.id] = true;
      module.children.forEach((entry) => {
        if (entry.type === "group" && entryContainsPath(entry, pathname)) active[entry.id] = true;
      });
    });
    setOpen((current) => ({ ...current, ...active }));
  }, [pathname]);

  const toggle = (id: string) => setOpen((current) => ({ ...current, [id]: !current[id] }));

  return (
    <aside className="flex min-h-screen w-[220px] min-w-[220px] shrink-0 flex-col bg-gray-900 py-3 text-gray-300 md:w-[240px] md:min-w-[240px]">
      {role === null && (
        <div className="flex min-h-48 flex-1 items-start justify-center pt-16" role="status" aria-label="Cargando menú de navegación">
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-gray-700 border-t-blue-400 shadow-sm transition-opacity duration-300" />
          <span className="sr-only">Cargando menú…</span>
        </div>
      )}
      {role !== null && dashboardMenu.filter((module) => canViewModule(role, module.id)).map((module) => (
        <div key={module.id} className="mb-2">
          <button type="button" onClick={() => toggle(module.id)} className="flex w-full cursor-pointer items-center justify-between rounded-r-lg border-l-2 border-transparent py-2 pl-3 pr-3 text-xs font-medium uppercase tracking-wide text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100">
            <span>{module.label}</span>
            <ArrowIcon isOpen={Boolean(open[module.id])} />
          </button>
          {open[module.id] && <div className="mt-1 space-y-0.5">{module.children.map((entry) => <MenuEntry key={entry.type === "page" ? entry.href : entry.id} entry={entry} pathname={pathname} open={open} toggle={toggle} />)}</div>}
        </div>
      ))}
    </aside>
  );
}

function MenuEntry({ entry, pathname, open, toggle }: { entry: DashboardMenuEntry; pathname: string; open: Record<string, boolean>; toggle: (id: string) => void }) {
  if (entry.type === "page") {
    const active = pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    return (
      <Link href={entry.href} aria-current={active ? "page" : undefined} className={`block w-full cursor-pointer rounded-r-md border-l-2 py-2 pl-5 pr-4 text-left text-sm font-normal uppercase transition-colors ${active ? "border-blue-500 bg-blue-950/40 font-medium text-blue-300" : "border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-100"}`}>
        {entry.label}
      </Link>
    );
  }

  return (
    <div className="ml-4">
      <button type="button" onClick={() => toggle(entry.id)} className="flex w-full cursor-pointer items-center justify-between rounded-r-lg border-l-2 border-gray-700 py-2 pl-4 pr-3 text-xs font-medium uppercase tracking-wide text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100">
        <span>{entry.label}</span><ArrowIcon isOpen={Boolean(open[entry.id])} />
      </button>
      {open[entry.id] && <div className="mt-1 space-y-0.5 border-l border-gray-800">{entry.children.map((child) => <MenuEntry key={child.type === "page" ? child.href : child.id} entry={child} pathname={pathname} open={open} toggle={toggle} />)}</div>}
    </div>
  );
}
