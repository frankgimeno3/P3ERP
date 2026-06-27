import {createEndpoint} from "../../../../../server/createEndpoint.js";
import {NextResponse} from "next/server";
import Joi from "joi";
import {getUsersTimeLogs} from "../../../../../server/features/timeLog/TimeLogService.js";

export const GET = createEndpoint(async (request, body) => {
    const {afterTime, beforeTime, users} = body;
    let parsedUsers;
    if (users) {
        parsedUsers = users
            .split(",")
            .map(email => email.trim())
    }

    const timeLogs = await getUsersTimeLogs(afterTime, beforeTime, parsedUsers);

    return NextResponse.json(timeLogs);
}, Joi.object({
    afterTime: Joi.date().required(),
    beforeTime: Joi.date().required(),
    users: Joi.any().optional()
}), true, ['admin'])