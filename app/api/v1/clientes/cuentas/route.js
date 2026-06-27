import {createEndpoint} from "../../../../../server/createEndpoint.js";
import Joi from "joi";
import {createCuenta, getCuentas} from "../../../../../server/features/cuenta/CuentaService.js";
import {NextResponse} from "next/server";

export const POST = createEndpoint(async (request, body) => {
    const cuenta = await createCuenta(request.email, body);

    return NextResponse.json(cuenta);
}, Joi.object({
    id_cuenta: Joi.string().required(),
    nombre_empresa: Joi.string().required(),
    pais_cuenta: Joi.string().required(),
    id_agente: Joi.string().required(),
    descripcion_cuenta: Joi.string().allow('', null).optional(),
    actividades_cuenta: Joi.string().allow('', null).optional(),
    presente_en_qq: Joi.boolean().optional(),
    fuente_novedades_cuenta: Joi.string().allow('', null).optional(),
    datos_comerciales: Joi.object().allow(null).optional(),
    array_direcciones_cuenta: Joi.array().allow(null).optional(),
    array_contactos_cuenta: Joi.array().allow(null).optional(),
    array_comentarios_cuenta: Joi.array().allow(null).optional(),
}), true);

export const GET = createEndpoint(async (request, queryParams) => {
    // Normalize query params - handle undefined, null, or empty strings
    const filters = {
        clienteFiltro: (queryParams?.clienteFiltro && String(queryParams.clienteFiltro).trim() !== '') ? String(queryParams.clienteFiltro).trim() : '',
        codigoCrmFiltro: (queryParams?.codigoCrmFiltro && String(queryParams.codigoCrmFiltro).trim() !== '') ? String(queryParams.codigoCrmFiltro).trim() : '',
        agenteFiltro: (queryParams?.agenteFiltro && String(queryParams.agenteFiltro).trim() !== '') ? String(queryParams.agenteFiltro).trim() : '',
        telFiltro: (queryParams?.telFiltro && String(queryParams.telFiltro).trim() !== '') ? String(queryParams.telFiltro).trim() : '',
    };

    try {
        const cuentas = await getCuentas(filters);
        return NextResponse.json(Array.isArray(cuentas) ? cuentas : []);
    } catch (error) {
        console.error('Error in GET /api/v1/clientes/cuentas:', error);
        // Return empty array instead of error to allow UI to show "no data" message
        return NextResponse.json([], { status: 200 });
    }
}, Joi.object({
    clienteFiltro: Joi.string().allow('', null).optional(),
    codigoCrmFiltro: Joi.string().allow('', null).optional(),
    agenteFiltro: Joi.string().allow('', null).optional(),
    telFiltro: Joi.string().allow('', null).optional(),
}).unknown(true), true);
