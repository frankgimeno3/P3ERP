"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardMenu, getDashboardMenuLocation, type DashboardMenuEntry } from "@/app/config/dashboardMenu";
import { BriefcaseBusiness, Pencil, Euro, Monitor, BookOpen, MousePointer2 } from 'lucide-react';
import { canViewModule,canAccessDashboardPath } from "@/app/config/roleAccess";
import { useCurrentUser } from '@/app/lib/currentUser';

const moduleIcons = {briefcase: BriefcaseBusiness, pencil: Pencil, euro: Euro, monitor: Monitor, book: BookOpen, pointer: MousePointer2};

function ArrowIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function visibleEntries(entries:DashboardMenuEntry[],role:unknown):DashboardMenuEntry[]{
 return entries.flatMap<DashboardMenuEntry>(entry=>{if(entry.type==="page")return canAccessDashboardPath(role,entry.href)?[entry]:[];const children=visibleEntries(entry.children,role);return children.length?[{...entry,children}]:[];});
}

function entryContainsPath(entry: DashboardMenuEntry, pathname: string): boolean {
  return entry.type === "page"
    ? pathname === entry.href || pathname.startsWith(`${entry.href}/`)
    : entry.children.some((child) => entryContainsPath(child, pathname));
}

export default function LoggedLeftMenu() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { user, error } = useCurrentUser();
  const role = user?.role || (error ? 'base' : null);
  const location = getDashboardMenuLocation(pathname);
  const activeModuleId = location?.module.id || dashboardMenu.find(area => pathname === `/dashboard/${area.id}` || pathname.startsWith(`/dashboard/${area.id}/`))?.id;

  useEffect(() => {
    const active: Record<string, boolean> = {};
    dashboardMenu.forEach((module) => {
      if (module.children.some((entry) => entryContainsPath(entry, pathname))) active[module.id] = true;
      const expandGroups = (entries: DashboardMenuEntry[]) => entries.forEach(entry => {
        if (entry.type === "group" && entryContainsPath(entry, pathname)) {
          active[entry.id] = true;
          expandGroups(entry.children);
        }
      });
      expandGroups(module.children);
    });
    setOpen((current) => ({ ...current, ...active }));
  }, [pathname]);

  const toggle = (id: string) => setOpen((current) => ({ ...current, [id]: !current[id] }));

  return (
    <aside aria-label="Menú principal" className={`flex min-h-screen shrink-0 flex-col bg-gray-900 py-3 text-gray-300 transition-[width] ${collapsed ? "w-14 min-w-14" : "w-[220px] min-w-[220px] md:w-[240px] md:min-w-[240px]"}`}>
      <button type="button" aria-label={collapsed ? "Expandir menú" : "Ocultar menú"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} className="mb-3 mr-2 self-end rounded p-2 cursor-pointer text-white hover:bg-blue-800"><svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={collapsed ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}/></svg></button>
      {role === null && (
        <div className="flex min-h-48 flex-1 items-start justify-center pt-16" role="status" aria-label="Cargando menú de navegación">
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-gray-700 border-t-blue-400 shadow-sm transition-opacity duration-300" />
          <span className="sr-only">Cargando menú…</span>
        </div>
      )}
      {role !== null && dashboardMenu.map(module=>({...module,children:visibleEntries(module.children,role)})).filter((module) => canViewModule(role, module.id)&&module.children.length).map((module) => {
        const Icon = moduleIcons[module.icon], active = activeModuleId === module.id;
        return <div key={module.id} data-module={module.id} className={collapsed ? 'mb-2 px-1' : 'mb-2 mr-2 ml-3'}>
          <button type="button" aria-label={module.label} title={collapsed ? module.label : undefined} aria-current={active ? 'location' : undefined} aria-expanded={!collapsed && Boolean(open[module.id])} onClick={() => {if(collapsed){setCollapsed(false);setOpen(current=>({...current,[module.id]:true}));}else toggle(module.id);}} className={`flex w-full cursor-pointer items-center rounded-r-lg border-l-2 py-2 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-gray-800 hover:text-gray-100 ${collapsed ? 'justify-center px-2' : 'justify-between gap-2 pl-3 pr-2'} ${active ? 'border-blue-400 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-300'}`}>
            <span className="flex min-w-0 items-center gap-2">{collapsed ? <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.7}/> : <span>{module.label}</span>}</span>
            {!collapsed && <ArrowIcon isOpen={Boolean(open[module.id])} />}
          </button>
          {!collapsed && open[module.id] && <div className="mt-1 ml-3 space-y-0.5 border-l border-gray-700 pl-3">{module.children.map((entry) => <MenuEntry key={entry.type === "page" ? entry.href : entry.id} entry={entry} activeHref={location?.page.href} open={open} toggle={toggle} />)}</div>}
        </div>;
      })}
    </aside>
  );
}

function MenuEntry({ entry, activeHref, open, toggle }: { entry: DashboardMenuEntry; activeHref?: string; open: Record<string, boolean>; toggle: (id: string) => void }) {
  if (entry.type === "page") {
    const active = activeHref === entry.href;
    return (
      <Link href={entry.href} aria-current={active ? "page" : undefined} className={`block w-full cursor-pointer rounded-r-md border-l-2 py-2 pl-3 pr-2 text-left text-sm font-normal uppercase transition-colors ${active ? "border-blue-500 bg-blue-950/40 font-medium text-blue-300" : "border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-100"}`}>
        {entry.label}
      </Link>
    );
  }

  return (
    <div>
      <button type="button" aria-expanded={Boolean(open[entry.id])} onClick={() => toggle(entry.id)} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-r-lg border-l-2 border-gray-700 py-2 pl-3 pr-2 text-xs font-medium uppercase tracking-wide text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100">
        <span>{entry.label}</span><ArrowIcon isOpen={Boolean(open[entry.id])} />
      </button>
      {open[entry.id] && <div className="mt-1 ml-3 space-y-0.5 border-l border-gray-700 pl-3">{entry.children.map((child) => <MenuEntry key={child.type === "page" ? child.href : child.id} entry={child} activeHref={activeHref} open={open} toggle={toggle} />)}</div>}
    </div>
  );
}
