export type TigerType = 'cuentas' | 'contactos';
export type ImportMode = 'crear' | 'rellenar' | 'sustituir';

export const TIGER_HEADERS: Record<TigerType, string[]> = {
  cuentas: ['Número de Cuenta','CÓDIGO PP3','Nombre de Cuenta','Página web','Asignado a','AGENTE','Teléfono Principal','Fecha de Creación','RECEPTOR REVISTA','Fecha de Modificación','Potencial actual - Relación','Potencial futuro - Encaje con nuestros medios','Descripción','Modificado por','Se convierte de plomo','Miembro de','No Enviar Email','Fuente','Tipo','ACTIVIDADES','De Correo Electrónico Principal','DESCRIPCIÓN DE ACTIVIDAD','FERIAS','QUIEN ES QUIEN','RED SOCIAL PRIORITARIA','DISTRIBUIDORES','CATÁLOGOS','VIDEO','Dirección (Factura)','Dirección (Envío)','Población (Factura)','Población (Envío)','Provincia (Factura)','Provincia (Envío)','Código Postal (Factura)','Código Postal (Envío)','País (Factura)','País (Envío)','REVISADO RICARDO','CAMPAÑAS','Fensterbau','ESTADO LEADS FRÍOS','REVISADO VIDEOS Y CATALOGOS','Cristalizar-Vidriotecnia','VETECO STAND','GLASSTEC STAND','FACTURAS EMITIDAS'],
  contactos: ['Saludo','Nombre','Apellido','Nombre Cuenta','TIPO DE CONTACTO','De Correo Electrónico Principal','CARGO','Teléfono Empresa','Móvil','MEDIO DE CONTACTO','RED SOCIAL','FERIAS','Descripción','Modificado por','Asignado a','Fuente','No Enviar Email','Fecha de Creación','Se convierte de plomo','Contacto Id','Fecha de Modificación','País (Factura)','Provincia (Factura)','PUBLICACIONES QUE RECIBE','ROBINSON','Origen de Pre-Contacto','ZONA','QUÉ SE ENVÍA','ORIGEN BASE ANEXA','VIDRIO','CARPINTERÍA','PROTECCIÓN SOLAR','PUERTAS Y AUTOMATISMOS','CONSTRUCCIÓN Y ARQUITECTURA','ACTIVIDAD EMPRESA'],
};

export function isBlank(value: unknown) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}
