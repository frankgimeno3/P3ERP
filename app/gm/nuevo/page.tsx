import CuentaDetalle from "@/app/gm/gmcomponents/uiElements/cuenta/CuentaDetalle";
import type { Account } from "@/app/gm/gmcomponents/uiElements/cuenta/types";
import { getGmAgentes, getNextGmCodigo } from "@/server/features/gm/GmRepository.js";

export default async function NuevaCuentaPage() {
  const [codigo, agentes] = await Promise.all([getNextGmCodigo(), getGmAgentes()]);

  const cuenta: Account = {
    codigo,
    nombre: "",
    razonSocial: "",
    tipoCliente: "",
    nombreFiscal: "",
    nCial: "",
    nCialPFisica: "",
    nFiscal: "",
    nComercial: "",
    departamento: "",
    direccion: "",
    domicilio: "",
    codigoPostal: "",
    ciudad: "",
    poblacion: "",
    prefijo: "",
    telefono: "",
    telefono1: "",
    telefono2: "",
    fax: "",
    movil: "",
    nif: "",
    nifCif: "",
    pais: "",
    web: "",
    email: "",
    telefonoPrincipal: "",
    responsable: "",
    estado: "",
    sector: "",
    canal: "",
    observaciones: "",
    fechaAlta: new Date().toISOString().slice(0, 10),
    fechaUltimaModificacion: "",
    riesgo: "",
    formaPago: "",
    actividad: "",
    contactoPrincipal: "",
    codigoAgente: "",
    nombreAgente: "",
    agente: "",
    comentarios_gm: "",
  };

  return <CuentaDetalle cuenta={cuenta} contactos={[]} agentes={agentes} isNew />;
}
