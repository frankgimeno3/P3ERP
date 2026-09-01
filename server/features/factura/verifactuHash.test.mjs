import assert from "node:assert/strict";
import test from "node:test";
import { calculateVerifactuHash } from "./verifactuHash.mjs";

test("vector oficial AEAT 0.1.2: primer registro de alta", () => {
  assert.equal(calculateVerifactuHash({
    issuerNif: "89890001K",
    invoiceNumber: "12345678/G33",
    invoiceDate: "01-01-2024",
    invoiceType: "F1",
    vatAmount: "12.35",
    totalAmount: "123.45",
    previousHash: "",
    generatedAt: "2024-01-01T19:20:30+01:00",
  }), "3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60");
});

test("vector oficial AEAT 0.1.2: alta encadenada", () => {
  assert.equal(calculateVerifactuHash({
    issuerNif: "89890001K",
    invoiceNumber: "12345679/G34",
    invoiceDate: "01-01-2024",
    invoiceType: "F1",
    vatAmount: "12.35",
    totalAmount: "123.45",
    previousHash: "3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60",
    generatedAt: "2024-01-01T19:20:35+01:00",
  }), "F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97");
});
