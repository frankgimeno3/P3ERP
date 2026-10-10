import assert from 'node:assert/strict';import {acceptedPaymentDifference} from '../server/features/prevision/PaymentDifferenceClosure.js';
const payment={total_pago:'1512.08',cierre_pago:{activo:true,previsto:1512.08,real:1512.07,diferencia:0.01}};
assert.equal(acceptedPaymentDifference(payment,151207),1);
assert.equal(acceptedPaymentDifference(payment,0),0,'Reopening the bank review suspends the closure');
assert.equal(acceptedPaymentDifference({...payment,total_pago:'1512.09'},151207),0);
assert.equal(acceptedPaymentDifference({...payment,cierre_pago:{...payment.cierre_pago,diferencia:2}},151207),0);
assert.equal(acceptedPaymentDifference({...payment,cierre_pago:{...payment.cierre_pago,activo:false}},151207),0);
assert.equal(acceptedPaymentDifference({total_pago:1},100),0);
console.log('PASS: accepted difference retains invoice and real amounts, and suspends on reopening or changed evidence.');
