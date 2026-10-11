import assert from 'node:assert/strict';
import {inferTaskAgents,taskAgentIds} from '../app/config/taskAssignments.js';
const agents=[{id_agente:'m',nombre_completo_agente:'Melanie Quezada Rosales',email_agente:'melanie@vidrioperfil.com'},{id_agente:'r',nombre_completo_agente:'Ricardo Calleja',email_agente:'redaccion@vidrioperfil.com'},{id_agente:'f',nombre_completo_agente:'FRANK',email_agente:'frankgimeno3@gmail.com'},{id_agente:'seed',nombre_completo_agente:'Frank Cuenta Superadmin',is_empleado_account:false},{id_agente:'c1',nombre_completo_agente:'Carlos David Ortega'},{id_agente:'c2',nombre_completo_agente:'Carlos Lamiel'}];
assert.deepEqual(inferTaskAgents('melanie',agents),['m']);assert.deepEqual(inferTaskAgents('redaccion@vidrioperfil.com',agents),['r']);assert.deepEqual(inferTaskAgents('frank@vidrioperfil.com',agents),['f']);
assert.deepEqual(inferTaskAgents('Carlos',agents),[]);assert.deepEqual(inferTaskAgents('Desconocido',agents),[]);
assert.deepEqual(taskAgentIds({agente:'m',agentes_asociados:['m','r','r']}),['m','r']);
console.log('PASS: coincidencias inequívocas, alias de correo, rechazo de nombres ambiguos y varios responsables sin duplicados.');
