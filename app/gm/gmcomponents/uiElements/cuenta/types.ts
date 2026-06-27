export type Account = {
  codigo: string;
  nombre: string;
  razonSocial: string;
  tipoCliente?: string;
  nombreFiscal?: string;
  nCial: string;
  nCialPFisica?: string;
  nFiscal?: string;
  nComercial?: string;
  departamento?: string;
  direccion: string;
  domicilio?: string;
  codigoPostal?: string;
  ciudad: string;
  poblacion?: string;
  prefijo?: string;
  telefono: string;
  telefono1?: string;
  telefono2?: string;
  fax?: string;
  movil?: string;
  nif: string;
  nifCif?: string;
  pais?: string;
  web: string;
  email: string;
  telefonoPrincipal?: string;
  responsable: string;
  estado: string;
  sector: string;
  canal: string;
  observaciones: string;
  fechaAlta: string;
  fechaUltimaModificacion?: string;
  riesgo: string;
  formaPago: string;
  actividad: string;
  contactoPrincipal: string;
  codigoAgente?: string;
  nombreAgente?: string;
  agente: string;
};

export type Comment = {
  id: number;
  codigo: string;
  fullComments: string;
};

export type Contact = {
  contactId: number;
  codigo: string;
  name: string;
  charge: string;
  email: string;
  phone: string;
};

export type TabKey = "principal" | "comments" | "contacts";
