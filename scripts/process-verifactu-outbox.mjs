import env from '@next/env';
import {randomUUID} from 'node:crypto';
import {createAeatTransport} from '../server/features/factura/VerifactuTransport.js';
import {processNextVerifactuOutbox} from '../server/features/factura/VerifactuOutboxService.js';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const workerId=randomUUID(),sendToAeat=createAeatTransport();
try{for(let count=0;count<100;count++){const job=await processNextVerifactuOutbox({workerId,sendToAeat});if(!job)break;console.log(JSON.stringify({id:job.id,status:job.status}));}}finally{await getPgPool().end();}
