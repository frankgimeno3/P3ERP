import {createEndpoint} from "../../../../server/createEndpoint.js";
import Joi from "joi";
import {getUserTimeLogs} from "../../../../server/features/timeLog/TimeLogService.js";
import {NextResponse} from "next/server.js";

export const GET = createEndpoint(async (request, body) => {
    const {afterTime, beforeTime} = body;
    const timeLogs = await getUserTimeLogs(request.email, afterTime, beforeTime);

    return NextResponse.json(timeLogs);
}, Joi.object({
    afterTime: Joi.date().required(),
    beforeTime: Joi.date().required()
}), true)