import {Op} from "sequelize";
import ModificationModel from "../modification/ModificationModel.js";
import {TimeLogModel} from "../../database/models.js";

export async function createTimeLog(username, type, comment, ip) {
    const timeLog = await TimeLogModel.create({
        createdBy: username,
        date: new Date(),
        type: type,
        comment: comment,
        ip
    })

    return timeLog;
}

export async function getUsersTimeLogs(afterTime, beforeTime, users = []) {
    const whereClauses = [];

    if (typeof beforeTime === "string" && /^\d+$/.test(beforeTime)) {
        beforeTime = Number(beforeTime);
    }
    if (typeof afterTime === "string" && /^\d+$/.test(afterTime)) {
        afterTime = Number(afterTime);
    }

    if (afterTime) {
        whereClauses.push({ created_at: { [Op.gte]: afterTime } });
    }
    if (beforeTime) {
        whereClauses.push({ created_at: { [Op.lte]: beforeTime } });
    }
    if (Array.isArray(users) && users.length > 0) {
        whereClauses.push({ created_by: { [Op.in]: users } });
    }

    const modificationWhere = [];
    if (afterTime) {
        modificationWhere.push({ created_at: { [Op.gte]: afterTime } });
    }
    if (beforeTime) {
        modificationWhere.push({ created_at: { [Op.lte]: beforeTime } });
    }

    const timeLogs = await TimeLogModel.findAll({
        where: {
            [Op.and]: whereClauses
        },
        include: {
            model: ModificationModel,
            as: 'modifications',
            where: modificationWhere.length > 0
                ? { [Op.and]: modificationWhere }
                : undefined,
            required: false
        },
        order: [
            ['created_at', 'DESC']
        ],
    });

    return timeLogs;
}

export async function getUserTimeLogs(userId, afterTime, beforeTime) {
    afterTime = typeof afterTime === "string" ? new Date(afterTime) : afterTime;
    beforeTime = typeof beforeTime === "string" ? new Date(beforeTime) : beforeTime;

    const timeLogs = await TimeLogModel.findAll({
        where: {
            [Op.and]: [
                {createdBy: userId},
                afterTime ? {date: {[Op.gte]: afterTime}} : {},
                beforeTime ? {date: {[Op.lte]: beforeTime}} : {},
            ]
        },
        include: {model: ModificationModel, as: 'modifications'},
        order: [
            ['created_at', 'DESC'],
            [{model: ModificationModel, as: "modifications"}, "created_at", "DESC"]
        ],
    });

    return timeLogs;
}