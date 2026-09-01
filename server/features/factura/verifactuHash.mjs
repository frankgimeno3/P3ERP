import crypto from "node:crypto";

export const VERIFACTU_HASH_VERSION = "AEAT-0.1.2";

function clean(value) {
  return String(value ?? "").trim();
}

function decimal(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(2).replace(/\.?0+$/, "");
}

export function calculateVerifactuHash(record) {
  const source = [
    `IDEmisorFactura=${clean(record.issuerNif)}`,
    `NumSerieFactura=${clean(record.invoiceNumber)}`,
    `FechaExpedicionFactura=${clean(record.invoiceDate)}`,
    `TipoFactura=${clean(record.invoiceType)}`,
    `CuotaTotal=${decimal(record.vatAmount)}`,
    `ImporteTotal=${decimal(record.totalAmount)}`,
    `Huella=${clean(record.previousHash)}`,
    `FechaHoraHusoGenRegistro=${clean(record.generatedAt)}`,
  ].join("&");
  return crypto.createHash("sha256").update(source, "utf8").digest("hex").toUpperCase();
}

export function formatSpainTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23", timeZoneName: "longOffset",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  const offset = get("timeZoneName").replace("GMT", "") || "+00:00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${offset}`;
}
