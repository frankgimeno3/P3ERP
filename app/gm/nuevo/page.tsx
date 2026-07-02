import CuentaDetalle from "@/app/gm/gmcomponents/uiElements/cuenta/CuentaDetalle";
import type { Account } from "@/app/gm/gmcomponents/uiElements/cuenta/types";
import cuentasData from "@/app/gm/gmcomponents/contents/cuentas.json";

const getNextAccountCode = () => {
  const maxCode = (cuentasData as Account[]).reduce((max, account) => {
    const numericCode = Number.parseInt(account.codigo, 10);
    return Number.isNaN(numericCode) ? max : Math.max(max, numericCode);
  }, 0);

  return String(maxCode + 1).padStart(3, "0");
};

export default function NuevaCuentaPage() {
  const cuenta: Account = {
    codigo: getNextAccountCode(),
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
    fechaAlta: "",
    fechaUltimaModificacion: "",
    riesgo: "",
    formaPago: "",
    actividad: "",
    contactoPrincipal: "",
    codigoAgente: "",
    nombreAgente: "",
    agente: "",
  };

  return <CuentaDetalle cuenta={cuenta} />;
}
