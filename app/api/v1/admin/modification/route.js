import {createEndpoint} from "../../../../../server/createEndpoint.js";
import {setModificationStatus} from "../../../../../server/features/modification/ModificationService.js";
import {NextResponse} from "next/server.js";
import Joi from "joi";
import {ModificationStatusEnum} from "../../../../../server/features/modification/ModificationStatusEnum.js";

export const PATCH = createEndpoint(async (request, body)=>{
    const {id, newStatus} = body;

    const newModification = await setModificationStatus(id, newStatus);

    return NextResponse.json(newModification);
},Joi.object({
    id: Joi.any().required(),
    newStatus: Joi.string().valid(...Object.values(ModificationStatusEnum)).required()
}),true, ['admin'])