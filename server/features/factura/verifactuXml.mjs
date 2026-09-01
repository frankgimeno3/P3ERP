const namespace = "https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd";

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function scalar(value) {
  if (typeof value === "number") return value.toFixed(2);
  return escapeXml(value);
}

function element(name, value) {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) return value.map((item) => element(name, item)).join("");
  if (typeof value === "object") {
    return `<sf:${name}>${Object.entries(value).map(([child, childValue]) => element(child, childValue)).join("")}</sf:${name}>`;
  }
  return `<sf:${name}>${scalar(value)}</sf:${name}>`;
}

export function buildVerifactuRegistroAltaXml(registroAlta) {
  return `<?xml version="1.0" encoding="UTF-8"?><sf:RegistroAlta xmlns:sf="${namespace}">${Object.entries(registroAlta).map(([name, value]) => element(name, value)).join("")}</sf:RegistroAlta>`;
}
