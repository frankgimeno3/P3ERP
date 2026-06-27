import {COGNITO} from "../env.js";
import {fetchNewTokens, verifyAccessToken, verifyIdToken} from "./features/authentication/AuthenticationService.js";
import {NextResponse} from "next/server.js";
import {getUserRoles} from "./features/authorization/AuthorizationService.js";
import {errorHandler} from "./errorHandler.js";
import {decodeJWT} from "@aws-amplify/core";

async function validate(request, schema) {
    const contentType = request.headers.get('content-type') ?? '';
    const method = request.method
    let data;
    let body;

    if (method === "GET") {
        const url = new URL(request.url);
        const params = url.searchParams;
        data = Object.fromEntries(params)
        body = data;
    } else if (contentType.includes('application/json')) {
        body = await request.json();
        data = body;
    } else if (contentType.includes('multipart/form-data')) {
        body = await request.formData();
        data = Object.fromEntries(body);
    } else if (method !== "GET") {
        // Para métodos que no son GET y no tienen content-type conocido, intentar parsear como JSON
        try {
            body = await request.json();
            data = body;
        } catch (e) {
            // Si falla, retornar undefined
            return undefined;
        }
    }

    // Solo validar si hay schema
    if (schema) {
        const {value, error} = schema.validate(data);
        if (error) {
            throw new Error(`Solicitud no paso validacion: ${error}`);
        }
        return value;
    }

    return body;
}

async function checkTokens(request, response) {
    const baseKey = `CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}`;
    const username = request.cookies.get(`${baseKey}.LastAuthUser`)?.value;

    if (!username) {
        throw new Error('Falta  cookie con el nombre de usuario')
    }

    let isRefreshed = false;
    let idToken = request.cookies.get(`${baseKey}.${username}.idToken`)?.value;
    let accessToken = request.cookies.get(`${baseKey}.${username}.accessToken`)?.value;

    const cookieKeys = {
        id: `CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}.${username}.idToken`,
        access: `CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}.${username}.accessToken`,
        refresh: `CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}.${username}.refreshToken`
    }

    let expiresIn;
    try {
        await Promise.all([verifyIdToken(idToken), verifyAccessToken(accessToken)]);
    } catch (e) {
        const refreshToken = request.cookies.get(cookieKeys.refresh)?.value
        const data = await fetchNewTokens(refreshToken);
        expiresIn = data.expires_in;
        idToken = data.id_token;
        accessToken = data.access_token;
        isRefreshed = true;
    }
    const {payload} = decodeJWT(idToken);
    const {email} = payload;
    return [username, email, payload.sub, isRefreshed, accessToken, idToken, cookieKeys, expiresIn];
}

export function createEndpoint(callback, schema = null, isProtected = false, roles = []) {
    return async (request) => {
        const response = NextResponse.next();
        let body;
        try {
            body = await validate(request, schema);
        } catch (e) {
            return new Response(e.message, {status: 400});
        }
        let username, sub, email, isRefreshed, accessToken, idToken, cookieKeys, cookieExpiresIn;
        if (isProtected) {
            try {
                [username, email, sub, isRefreshed, accessToken, idToken, cookieKeys, cookieExpiresIn] = await checkTokens(request, response);
                request.email = email;
                request.sub = sub;
            } catch (error) {
                console.error(error);

                return new Response(error.message || 'No autenticado', {status: 401});
            }
        }

        if (isProtected && roles.length > 0) {
            try {
                const userRoles = await getUserRoles(username);
                const hasAccess = userRoles.some(role => roles.includes(role));
                console.log(userRoles);
                if(!hasAccess) return new Response("Prohibido ", {status: 403});
            } catch (e) {
                console.log(e);
                return new Response("Prohibido ", {status: 403});
            }
        }

        try {
            const response = await callback(request, body);
            if(isRefreshed){
                response.cookies.set({
                    name: cookieKeys.access,
                    value: accessToken,
                    secure: true,
                    maxAge: cookieExpiresIn
                })
                response.cookies.set({
                    name: cookieKeys.id,
                    value: idToken,
                    secure: true,
                    maxAge: cookieExpiresIn
                })
            }
            return response;
        } catch (error) {
            return errorHandler(error);
        }
    }
}