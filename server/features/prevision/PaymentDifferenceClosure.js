export function acceptedPaymentDifference(payment,actualCents) {
 const c=payment.cierre_pago,cents=v=>Math.round(Number(v)*100),expected=cents(payment.total_pago);
 if(!c?.activo||!Number.isSafeInteger(actualCents)||cents(c.previsto)!==expected||cents(c.real)!==actualCents||cents(c.diferencia)!==expected-actualCents||expected<actualCents)return 0;
 return expected-actualCents;
}
