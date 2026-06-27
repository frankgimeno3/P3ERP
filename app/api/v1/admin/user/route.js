import {createEndpoint} from "../../../../../server/createEndpoint.js";
import {NextResponse} from "next/server";
import {createUser, getAllUsers, updateUser} from "../../../../../server/features/user/UserSerivce.js";
import Joi from "joi";

export const GET = createEndpoint(async () => {
    const users = await getAllUsers();
    const parsedUsers = users.map((user, index) => {
        const attributes = {}
        user.Attributes.forEach((attribute) => {
            attributes[attribute.Name] = attribute.Value
        })
        return {
            username: user.Username,
            enabled: user.Enabled,
            attributes: attributes
        }
    })
    return NextResponse.json(parsedUsers);
}, null, true, ['admin']);

export const PUT = createEndpoint(async (request, body) => {
    const result = await updateUser(body)

    return NextResponse.json(result);
}, Joi.object({
    username: Joi.string().required(),
    name: Joi.string().optional(),
    email: Joi.string().optional(),
    enabled: Joi.boolean().optional(),
    password: Joi.any().optional()
}), true, ['admin']);

export const POST = createEndpoint(async (request, body) => {
    const {name, email, password} = body;

    const result = await createUser(name, email, password);

    return NextResponse.json(result);
}, Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required(),
    password: Joi.any().required()
}), true, ['admin']);