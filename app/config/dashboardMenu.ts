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
      group("clientes", "Clientes", [
        page("Control administrativo", "/dashboard/administracion/control-administrativo"),
        page("Facturas clientes", "/dashboard/administracion/facturas-clientes"),
        page("Pendiente de cobro", "/dashboard/administracion/pendiente-cobro"),
        page("Suscripciones", "/dashboard/administracion/suscripciones"),
      ]),
      group("proveedores", "Proveedores", [
        page("Facturas proveedores", "/dashboard/administracion/facturas-proveedores"),
        page("Tickets", "/dashboard/administracion/proveedores/tickets"),
        page("Proveedores", "/dashboard/administracion/proveedores"),
      ]),
    ],
  },
  {
    id: "operaciones",
    label: "Operaciones",
    children: [
      page("Gestión de BBDD", "/dashboard/operaciones/data"),

      page("Gestión de cuentas", "/dashboard/operaciones/gestion_cuentas"),
    ],
  },
  {
    id: "direccion",
    label: "Dirección",
    children: [
      group("laboral", "LABORAL", [
        page("Agentes", "/dashboard/operaciones/agentes"),
        page("Nóminas", "/dashboard/direccion/laboral/nominas"),
        page("Calendario laboral", "/dashboard/direccion/laboral/calendario-laboral"),
        page("Contratación", "/dashboard/direccion/laboral/contratacion"),
      ]),
      group("tesoreria", "Tesorer?a", [
        page("Extractos", "/dashboard/direccion/tesoreria/extractos"),
        page("Revisión de líneas", "/dashboard/direccion/tesoreria/extractos/revision"),
        page("Previsión liquidez", "/dashboard/direccion/tesoreria/prevision-liquidez"),
      ]),
      page("Horas Juan", "/dashboard/direccion/horas-juan"),
      page("Copias de seguridad", "/dashboard/direccion/copias-seguridad"),
      page("Tablas RDS", "/dashboard/direccion/rds"),
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
