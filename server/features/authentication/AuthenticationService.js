import {CognitoJwtVerifier} from "aws-jwt-verify";
import {COGNITO} from "../../../env.js";

const idVerifier = CognitoJwtVerifier.create({
    userPoolId: COGNITO.USER_POOL_ID,
    clientId: COGNITO.CLIENT_ID,
    tokenUse: "id",
});

const accessVerifier = CognitoJwtVerifier.create({
    userPoolId: COGNITO.USER_POOL_ID,
    clientId: COGNITO.CLIENT_ID,
    tokenUse: "access",
});

export async function verifyIdToken(idToken){
    return await idVerifier.verify(idToken);
}

export async function verifyAccessToken(accessToken){
    return await accessVerifier.verify(accessToken);
}

export async function fetchNewTokens(refresh_token) {
    const tokenEndpoint = `https://${COGNITO.DOMAIN}.auth.${COGNITO.REGION}.amazoncognito.com/oauth2/token`;

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: COGNITO.CLIENT_ID,
        refresh_token,
    })

    const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch tokens: ${response.status} ${errorText}`)
    }

    return await response.json();
}