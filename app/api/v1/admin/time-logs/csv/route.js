import {NextResponse} from "next/server";
import Joi from "joi";
import {createEndpoint} from "../../../../../../server/createEndpoint.js";
import {getUsersTimeLogs} from "../../../../../../server/features/timeLog/TimeLogService.js";

export const GET = createEndpoint(async (request, body) => {
    const {afterTime, beforeTime, users} = body;
    let parsedUsers;
    if (users) {
        parsedUsers = users
            .split(",")
            .map(email => email.trim())
    }

    const timeLogs = await getUsersTimeLogs(afterTime, beforeTime, parsedUsers);

    function escapeCsvField(value) {
        if (value == null) return '';
        const str = typeof value === 'string' ? value : String(value);
        const escaped = str.replace(/"/g, '""');

        if (/[",\n]/.test(escaped)) {
            return `"${escaped}"`;
        }
        return escaped;
    }

    const headerColumns = [
        'ID',
        'Creado por',
        'Evento',
        'Comentario',
        'Fecha de creacion',
        'Fecha de ultima modificacion',
        'IP',
        'Modificaciones',
    ];
    const headerLine = headerColumns.join(',');

    const dataLines = timeLogs.map((log) => {
        const fields = [
            log.id,
            log.createdBy,
            log.type,
            log.comment,
            typeof log.createdAt === 'string'
                ? log.createdAt
                : log.createdAt.toISOString(),
            typeof log.updatedAt === 'string'
                ? log.updatedAt
                : log.updatedAt.toISOString(),
            log.ip,
            JSON.stringify(log.modifications),
        ];
        return fields.map(escapeCsvField).join(',');
    });

    const csvContent = [headerLine, ...dataLines].join('\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return new NextResponse(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="timeLogs_${timestamp}.csv"`,
        },
    });
}, Joi.object({
    afterTime: Joi.date().required(),
    beforeTime: Joi.date().required(),
    users: Joi.any().optional()
}), true, ['admin'])