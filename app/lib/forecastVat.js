export function forecastVat(total,containsVat,rate) {
 const amount=Number(total);
 if(typeof containsVat!=='boolean')throw Object.assign(Error('Indica si el importe contiene IVA.'),{status:400});
 if(!Number.isFinite(amount)||amount<=0||amount>9999999999.99)throw Object.assign(Error('Indica un importe total válido.'),{status:400});
 const percentage=containsVat?Number(rate):0;
 if(containsVat&&(!Number.isFinite(percentage)||percentage<=0||percentage>100))throw Object.assign(Error('Indica el porcentaje de IVA incluido.'),{status:400});
 const totalCents=Math.round(amount*100),baseCents=containsVat?Math.round(totalCents/(1+percentage/100)):totalCents;
 return {total_iva:totalCents/100,base_imponible:baseCents/100,importe_iva:(totalCents-baseCents)/100,contains_iva:containsVat,tipo_iva:percentage};
}
export function forecastRuleVat(rule,payroll=false) {
 if(payroll)return {...rule,base_imponible:0,contains_iva:false,tipo_iva:0,importe_iva:0};
 const calculated=forecastVat(rule.total_iva,rule.contains_iva,rule.tipo_iva);
 const bases=Object.fromEntries(Object.entries(rule.importes_por_fecha||{}).map(([date,value])=>[date,Number(value)===0?0:forecastVat(value,calculated.contains_iva,calculated.tipo_iva).base_imponible]));
 return {...rule,...calculated,...(Object.keys(bases).length?{bases_por_fecha:bases}:{})};
}
