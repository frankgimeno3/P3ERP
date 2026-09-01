export type DashboardMenuPage = {
  type: "page";
  label: string;
  href: string;
};

export type DashboardMenuGroup = {
  type: "group";
  id: string;
  label: string;
  children: DashboardMenuEntry[];
};

export type DashboardMenuEntry = DashboardMenuPage | DashboardMenuGroup;

export type DashboardMenuModule = {
  id: string;
  label: string;
  children: DashboardMenuEntry[];
};

const page = (label: string, href: string): DashboardMenuPage => ({ type: "page", label, href });
const group = (id: string, label: string, children: DashboardMenuEntry[]): DashboardMenuGroup => ({ type: "group", id, label, children });

/** Fuente única para el menú lateral y las pestañas de las guías de uso. */
export const dashboardMenu: DashboardMenuModule[] = [
  {
    id: "comercial",
    label: "Comercial",
    children: [
      page("Cuentas", "/dashboard/comercial/cuentas"),
      page("Contactos", "/dashboard/comercial/contactos"),
      page("Propuestas", "/dashboard/comercial/propuestas"),
      page("Contratos", "/dashboard/comercial/contratos"),
      page("Documentación", "/dashboard/comercial/documentacion"),
    ],
  },
  {
    id: "produccion",
    label: "Producción",
    children: [
      page("Hoja de producción", "/dashboard/produccion/hoja_produccion"),
      page("Control redacción", "/dashboard/produccion/control_redaccion"),
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    children: [
      page("Ferias", "/dashboard/administracion/ferias"),
      group("admin-clientes", "Clientes", [
        page("Control administrativo", "/dashboard/administracion/control-administrativo"),
        page("Facturas clientes", "/dashboard/administracion/facturas-clientes"),
        page("Pendiente de cobro", "/dashboard/administracion/pendiente-cobro"),
        page("Suscripciones", "/dashboard/administracion/suscripciones"),
      ]),
      group("admin-proveedores", "Proveedores", [
        page("Proveedores", "/dashboard/administracion/proveedores"),
        page("Facturas proveedores", "/dashboard/administracion/facturas-proveedores"),
        page("Tickets", "/dashboard/administracion/proveedores/tickets"),
      ]),
    ],
  },
  {
    id: "operaciones",
    label: "Operaciones",
    children: [
      page("Gestión de BBDD", "/dashboard/operaciones/data"),
      page("Agentes", "/dashboard/operaciones/agentesyroles"),
      page("Roles", "/dashboard/operaciones/roles"),
      group("operaciones-comerciales", "Operaciones comerciales", [
        page("Gestión de cuentas", "/dashboard/operaciones/gestion_cuentas"),
      ]),
    ],
  },
  {
    id: "direccion",
    label: "Dirección",
    children: [
      page("Bancos", "/dashboard/direccion/bancos"),
      group("previsiones", "Previsiones", [
        page("Previsión liquidez", "/dashboard/direccion/previsiones/prevision-liquidez"),
        page("Previsión ingresos", "/dashboard/direccion/previsiones/prevision-ingresos"),
        page("Previsión gastos", "/dashboard/direccion/previsiones/prevision-gastos"),
      ]),
    ],
  },
];

export function flattenMenuEntries(entries: DashboardMenuEntry[], groupLabel?: string): Array<DashboardMenuPage & { groupLabel?: string }> {
  return entries.flatMap((entry) =>
    entry.type === "page"
      ? [{ ...entry, groupLabel }]
      : flattenMenuEntries(entry.children, entry.label),
  );
}
