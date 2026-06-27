import {createEndpoint} from "../../../../../server/createEndpoint.js";
import {NextResponse} from "next/server";
import {getUsersModifications} from "../../../../../server/features/modification/ModificationService.js";
import Joi from "joi";
import {ModificationStatusEnum} from "../../../../../server/features/modification/ModificationStatusEnum.js";

export const GET = createEndpoint(async (request, body)=>{
    const {status} = body;
    const modifications = await getUsersModifications(status);

    return NextResponse.json(modifications);
}, Joi.object({
    status: Joi.string().valid(...Object.values(ModificationStatusEnum)).optional(),

}),true, ['admin'])