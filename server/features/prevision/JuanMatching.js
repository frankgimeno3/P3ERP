const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const employeeAliases={
 'CARLOS ORTEGA':['CARLOS DAVID ORTEGA TORQUET'],CHARLY:['CARLOS LAMIEL TORRES'],PACO:['GIMENO'],FRANK:['FRANK'],
 RICARDO:['RICARDO CALLEJA AYLLON'],MONTSE:['MONTSE VALENCIA'],MELANI:['MELANIE QUEZADA ROSALES'],
 'PEP FERNANDEZ':['JOSE LUIS FERNANDEZ LLOP'],PEP:['JOSE LUIS FERNANDEZ LLOP'],'VICTOR JOVEN':['Víctor Joven Castillo','Víctor Joven'],
};
const supplierAliases={
 SOFTLINE:['EDISOFT - SOFTLINE'],BITAVIS:['BITAVIS SERVEIS INFORMATICS'],'DAE LABORAL':['DAE GABINET LABORAL'],
 'ALQUILER 1º':['PEDRO BRILLAS ELIAS'],'ALQUILER 2º':['PEDRO BRILLAS ELIAS'],
 'COMUNIDAD PARKING LLORET - COSVA':['Cosva - Gabinet senia'],COYOTE:['COYOTE'],
 TELEFONICA:['TELEFONICA EMPRESAS'],AIGUES:['AIGUES DE BARCELONA'],VODAFONE:['VODAFONE'],
 'LUZ 1º':['ENDESA'],'LUZ 2º':['ENDESA'],PIXUP:['PIXUP'],'IVAN ZABARA':['IVAN ZABARA'],
 'RAPIDENVIO-N.PASCUAL':['RAPID ENVIOS'],'ASSESSORIA GLOBAL':['ASSESSORIA GLOBAL CG SL'],SMARTCONTA:['SMART CONTA'],
};
export function prepareJuanMatches(sheets,suppliers,employees,charges,dues) {
  return sheets.flatMap(sheet=>['income','payments'].flatMap(section=>sheet[section].map(row=> {
    const future=sheet.columns.flatMap((column,index)=>column.kind==='forecast'&&row.values[index]>0?[{month:column.month,amount:row.values[index],day:Math.min(row.day||31,new Date(Date.UTC(2026,column.month,0)).getUTCDate())}]:[]);
    const result={bank:sheet.bank,rowId:row.id,label:row.label,section,providerId:null,employeeId:null,chargeIds:[],status:'needs_review',evidence:{future,conflicts:[],candidates:[],reason:''}};
    if(row.opening){result.status='opening';return result;}
    if(section==='income'||/TR[AE]PASO|TRASPASO|EFECTIVO|^VISA|PROVEEDORES VARIOS/.test(row.label)){result.status='group';result.evidence.reason='Presupuesto agrupado: total del desglose y parte aún sin asignar.';return result;}
    if(/NOMINA/.test(row.label)||row.label==='PACO BENEFICIOS') {
      const person=row.label==='PACO BENEFICIOS'?'PACO':row.label.replace(/^NOMINAS?\s+/,'');
      const aliases=employeeAliases[person]||[person];
      const matches=employees.filter(employee=>aliases.some(alias=>normalize(alias)===normalize(employee.nombre_completo_agente||`${employee.nombre_agente} ${employee.apellidos_agente}`)));
      if(matches.length===1){result.employeeId=matches[0].id_agente;result.evidence.reason='Equivalencia de empleado confirmada o nombre único del catálogo.';}
      else {result.status='needs_employee';result.evidence.reason='No se ha encontrado una cuenta de empleado inequívoca.';return result;}
    }else {
      let aliases=supplierAliases[row.label];
      if(/COMISION/.test(row.label)&&sheet.bank==='Sabadell')aliases=['BANCO SABADELL'];
      if(row.label==='COMISION CUENTA'&&sheet.bank==='Santander')aliases=['Banco Santander','Banco Santander, S.A.'];
      if(row.label.startsWith('SECURITAS'))aliases=['VERISURE'];
      if(row.label==='AMARANT')aliases=['SERVEIS GRAFICS AMARANT'];
      if(/^(IRPF|IVA|ISOC|IMPUESTO SOCIEDADES)/.test(row.label))aliases=['Agencia Estatal de Administración Tributaria (AEAT)','AEAT'];
      if(/^(SEGUROS SOCIALES|AUTONOMOS FRANK)$/.test(row.label))aliases=['Tesorería General de la Seguridad Social (TGSS)','TGSS'];
      if(row.label.startsWith('AJ.BCN'))aliases=['Ajuntament de Barcelona'];
      if(row.label.startsWith('AJ.LLORET'))aliases=['Ajuntament de Lloret de Mar'];
      if(row.label.startsWith('IMPUESTO EMISIONES CO2'))aliases=['Agència Tributària de Catalunya (ATC)','ATC'];
      const matches=suppliers.filter(provider=>(aliases||[row.label]).some(alias=>[provider.nombre_proveedor,provider.nombre_fiscal_proveedor].some(name=>normalize(alias)===normalize(name))));
      result.evidence.candidates=matches.map(provider=>({id:provider.id_proveedor,name:provider.nombre_proveedor}));
      if(matches.length===1){result.providerId=matches[0].id_proveedor;result.evidence.reason='Proveedor existente localizado por nombre o equivalencia.';}
      else {result.status=matches.length>1?'ambiguous_provider':'needs_provider';result.evidence.reason=matches.length>1?'Hay varias fichas de proveedor posibles.':'No existe un proveedor inequívoco en el catálogo.';return result;}
    }
    let candidates=row.label==='PACO BENEFICIOS'?[]:charges.filter(charge=>result.employeeId?charge.tipo_cargo==='nomina'&&charge.id_agente===result.employeeId&&!charge.id_proveedor:charge.id_proveedor===result.providerId);
    if(row.label.startsWith('ALQUILER')){
      const floor=row.label.includes('1')?'1':'2';
      candidates=candidates.filter(charge=>charge.programacion.some(rule=>normalize(rule.descripcion).includes('PISO'+floor)));
    }
    if(row.label==='SECURITAS')candidates=candidates.filter(charge=>charge.programacion.some(rule=>/SECURITAS DIRECT/.test(rule.descripcion||'')));
    if(row.label==='COMISIONES REMESAS Y TRANSFERENCIAS'||row.label==='COMISION CUENTA')candidates=candidates.filter(charge=>charge.programacion.some(rule=>normalize(rule.descripcion).startsWith(normalize(row.label))));
    if(/^SECURITAS (LLÚRIA|BREDA|BRUC)$/.test(row.label)) {
      const site=normalize(row.label.replace('SECURITAS ',''));
      candidates=candidates.filter(charge=>charge.programacion.some(rule=>normalize(rule.descripcion).includes(site)));
    }
    if(/^(IRPF|IVA|ISOC|IMPUESTO SOCIEDADES|SEGUROS SOCIALES|AUTONOMOS FRANK|AJ\.|IMPUESTO EMISIONES CO2)/.test(row.label))candidates=candidates.filter(charge=>charge.programacion.some(rule=>normalize(rule.descripcion).startsWith(normalize(row.label))));
    result.chargeIds=candidates.map(charge=>String(charge.id_cargo_recurrente));
    if(!future.length){result.status='historical';return result;}
    if(!candidates.length){result.status='ready_to_create';return result;}
    if(candidates.length>1&&row.label!=='SECURITAS'){result.status='ambiguous_charge';result.evidence.reason='El proveedor tiene varios cargos: falta identificar el concepto exacto.';return result;}
    for(const target of future){
      const records=dues.filter(due=>result.chargeIds.includes(String(due.id_cargo_recurrente))&&Number(due.fecha.slice(5,7))===target.month);
      const amount=records.length?records.reduce((sum,due)=>sum+Math.round(Number(due.importe)*100),0):candidates.reduce((sum,charge)=>sum+charge.programacion.reduce((total,rule)=>total+Math.round(Number(rule.total_iva)*100),0),0);
      if(amount!==target.amount)result.evidence.conflicts.push({type:'amount',month:target.month,juan:target.amount,erp:amount});
      for(const due of records)if(Number(due.fecha.slice(8,10))!==target.day)result.evidence.conflicts.push({type:'day',month:target.month,juan:target.day,erp:Number(due.fecha.slice(8,10))});
      for(const charge of candidates)if(charge.banco_pago&&charge.banco_pago!==sheet.bank)result.evidence.conflicts.push({type:'bank',juan:sheet.bank,erp:charge.banco_pago});
    }
    result.status=result.evidence.conflicts.length?'conflict':'matched';
    return result;
  })));
}
