import {createEndpoint} from "../../../../../server/createEndpoint.js";
import {TimeLogTypeEnum} from "../../../../../server/features/timeLog/TimeLogTypeEnum.js";
import {NextResponse} from "next/server";
import Joi from "joi";
import {
    createModification
} from "../../../../../server/features/modification/ModificationService.js";

export const POST = createEndpoint(async (request, body) => {
    const {logId, newType, newDate, comment} = body;

    const modification = await createModification(logId, newType, newDate, comment, request.email);

    return NextResponse.json(modification);
}, Joi.object({
    logId: Joi.any().required(),
    newType: Joi.string().valid(...Object.values(TimeLogTypeEnum)).required(),
    newDate: Joi.string().optional(),
    comment: Joi.string().optional()
}), true)

