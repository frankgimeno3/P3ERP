import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const isolated=path.join(process.env.LOCALAPPDATA||'', 'P3ERP','test-dependencies','node_modules');
const env={...process.env};
if(!env.P3_SELECTOR_TEST_MODULES&&fs.existsSync(path.join(isolated,'jsdom')))env.P3_SELECTOR_TEST_MODULES=isolated;
const local=["test-proposal-page-batching.mjs","test-single-flight.mjs","test-magazine-calendar.mjs","test-invoice-customer-matching.mjs","test-bank-import.mjs","test-bank-common-assignment.mjs","test-administrative-excel.mjs","test-bank-review-analysis.mjs","test-bank-reconciliation-routing.cjs","test-business-document-pdf.cjs","test-juan-cards.mjs","test-forecast-receipts.mjs","test-invoice-document.cjs","test-juan-linked-forecast.mjs","test-juan-matching.mjs","test-juan-liquidity.mjs","test-recurring-charge-planning.mjs","test-preliminary-flatplan.mjs","test-supplier-creation.mjs","test-unified-forecast.mjs"];
const files=[...new Set([...local,'test-audit-projections.mjs','test-searchable-select.cjs','test-login-redirect.cjs','test-common-wizard.cjs','test-audit-roles.cjs','test-contract-import-ui.cjs',...(process.argv.includes('--integration')?['test-payroll-review.mjs','test-recurring-charges.mjs','test-preliminary-flatplan-db.mjs','test-liquidity-single-source.mjs','test-audit-workflows-db.mjs']:[])])];
const results=[];
for(const file of files){const args=file.endsWith('.mjs')?['--experimental-default-type=module',`scripts/${file}`]:[`scripts/${file}`];
  const result=await new Promise(resolve=>{let output='';const child=spawn(process.execPath,args,{env,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);child.on('close',code=>resolve({file,code,output}));});
  results.push(result);console.log(`${result.code===0?'PASS':'FAIL'} ${file}`);if(result.code!==0)console.log(result.output);
}
const reportDirectory=process.env.P3_TEST_REPORT_DIR||path.join(os.tmpdir(),'p3erp-tests');
fs.mkdirSync(reportDirectory,{recursive:true});const reportPath=path.join(reportDirectory,'regression-results.json');fs.writeFileSync(reportPath,JSON.stringify(results,null,2));
console.log('Report: '+reportPath);
console.log(`${results.filter(result=>result.code===0).length}/${results.length} pruebas correctas.`);process.exitCode=results.some(result=>result.code!==0)?1:0;
