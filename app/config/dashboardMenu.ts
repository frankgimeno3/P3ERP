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
    ],
  },
  {
    id: "produccion",
    label: "Producción",
    children: [
      page("Hoja de producción", "/dashboard/produccion/hoja_produccion"),
      group("gestion-contenidos", "Gestión contenidos", [
        page("Contenido revista", "/dashboard/produccion/gestion-contenidos/revista"),
        page("Otro contenido", "/dashboard/produccion/gestion-contenidos/otros"),
      ]),
      page("Repositorio", "/dashboard/produccion/repositorio"),
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    children: [
      group("liquidaciones", "Liquidaciones", [
        page("Tarjetas", "/dashboard/administracion/liquidaciones/tarjetas"),
        page("Tickets", "/dashboard/administracion/liquidaciones/tickets"),
        page("Domiciliaciones", "/dashboard/administracion/liquidaciones/suscripciones"),
      ]),
      group("clientes", "Clientes", [
        page("Control administrativo", "/dashboard/administracion/control-administrativo"),
        page("Facturas clientes", "/dashboard/administracion/facturas-clientes"),
        page("Pendiente de cobro", "/dashboard/administracion/pendiente-cobro"),
        page("Suscripciones", "/dashboard/administracion/suscripciones"),
      ]),
      group("proveedores", "Proveedores", [
        page("Facturas proveedores", "/dashboard/administracion/facturas-proveedores"),
        page("Proveedores", "/dashboard/administracion/proveedores"),
      ]),
    ],
  },
  {
    id: "operaciones",
    label: "Operaciones",
    children: [
      group("tablas", "Tablas", [
        page("Ferias", "/dashboard/operaciones/ferias"),
        page("Artículos", "/dashboard/operaciones/articulos"),
        page("Revistas", "/dashboard/operaciones/revistas"),
        page("Documentación", "/dashboard/operaciones/documentacion"),
        page("Servicios", "/dashboard/operaciones/servicios"),
      ]),
      page("Tareas", "/dashboard/operaciones/tareas"),
      group("bbdd", "BBDD", [
        page("Import-export", "/dashboard/operaciones/data"),
        page("Eliminación cuentas", "/dashboard/operaciones/gestion_cuentas"),
      ]),
    ],
  },
  {
    id: "contabilidad",
    label: "Contabilidad",
    children: [
        page("Extractos", "/dashboard/contabilidad/extractos"),
        page("Conciliación", "/dashboard/contabilidad/extractos/conciliacion"),
        page("Previsión liquidez", "/dashboard/contabilidad/prevision-liquidez"),
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
      group("finanzas", "Finanzas", [
        page("Horas Juan", "/dashboard/direccion/horas-juan"),
        page("Propiedades", "/dashboard/direccion/propiedades"),
      ]),
      group("erp", "ERP", [
        page("Mediateca", "/dashboard/direccion/mediateca"),
        page("Copias de seguridad", "/dashboard/direccion/copias-seguridad"),
        page("Tablas RDS", "/dashboard/direccion/rds"),
        page("Eventos de usuarios", "/dashboard/direccion/eventos-de-usuarios"),
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
