import {Op} from "sequelize";
import {Sequelize} from "sequelize";
import {CuentaModel} from "../../database/models.js";
import Database from "../../database/database.js";

const database = Database.getInstance();
const sequelize = database.getSequelize();

export async function createCuenta(username, cuentaData) {
    const cuenta = await CuentaModel.create({
        id_cuenta: cuentaData.id_cuenta,
        nombre_empresa: cuentaData.nombre_empresa,
        pais_cuenta: cuentaData.pais_cuenta,
        id_agente: cuentaData.id_agente,
        descripcion_cuenta: cuentaData.descripcion_cuenta,
        actividades_cuenta: cuentaData.actividades_cuenta,
        presente_en_qq: cuentaData.presente_en_qq || false,
        fuente_novedades_cuenta: cuentaData.fuente_novedades_cuenta,
        datos_comerciales: cuentaData.datos_comerciales,
        array_direcciones_cuenta: cuentaData.array_direcciones_cuenta || [],
        array_contactos_cuenta: cuentaData.array_contactos_cuenta || [],
        array_comentarios_cuenta: cuentaData.array_comentarios_cuenta || [],
        createdBy: username,
    });

    return cuenta;
}

export async function getCuentas(filters = {}) {
    const whereClauses = [];

    if (filters.clienteFiltro) {
        whereClauses.push({
            nombre_empresa: {
                [Op.iLike]: `%${filters.clienteFiltro}%`
            }
        });
    }

    if (filters.codigoCrmFiltro) {
        whereClauses.push({
            id_cuenta: {
                [Op.iLike]: `%${filters.codigoCrmFiltro}%`
            }
        });
    }

    if (filters.agenteFiltro) {
        whereClauses.push({
            id_agente: filters.agenteFiltro
        });
    }

    if (filters.telFiltro) {
        // For JSONB fields in PostgreSQL, we can use JSONB operators
        whereClauses.push(
            Sequelize.where(
                Sequelize.fn('CAST', Sequelize.col('datos_comerciales'), 'TEXT'),
                { [Op.iLike]: `%${filters.telFiltro}%` }
            )
        );
    }

    const cuentas = await CuentaModel.findAll({
        where: whereClauses.length > 0 ? { [Op.and]: whereClauses } : {},
        order: [['created_at', 'DESC']],
    });

    return cuentas;
}

export async function getCuentaById(idCuenta) {
    const cuenta = await CuentaModel.findOne({
        where: { id_cuenta: idCuenta }
    });

    return cuenta;
}

export async function updateCuenta(username, idCuenta, cuentaData) {
    if (!cuentaData) {
        throw new Error('Datos de cuenta no proporcionados');
    }

    const cuenta = await CuentaModel.findOne({
        where: { id_cuenta: idCuenta }
    });

    if (!cuenta) {
        throw new Error('Cuenta no encontrada');
    }

    await cuenta.update({
        nombre_empresa: cuentaData.nombre_empresa,
        pais_cuenta: cuentaData.pais_cuenta,
        id_agente: cuentaData.id_agente,
        descripcion_cuenta: cuentaData.descripcion_cuenta,
        actividades_cuenta: cuentaData.actividades_cuenta,
        presente_en_qq: cuentaData.presente_en_qq || false,
        fuente_novedades_cuenta: cuentaData.fuente_novedades_cuenta,
        datos_comerciales: cuentaData.datos_comerciales,
        array_direcciones_cuenta: cuentaData.array_direcciones_cuenta || [],
        array_contactos_cuenta: cuentaData.array_contactos_cuenta || [],
        array_comentarios_cuenta: cuentaData.array_comentarios_cuenta || [],
    });

    return cuenta;
}
