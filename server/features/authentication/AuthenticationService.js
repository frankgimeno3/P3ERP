import {CognitoJwtVerifier} from "aws-jwt-verify";
import {COGNITO} from "../../../env.js";

let idVerifier;
let accessVerifier;

function assertCognitoConfig() {
    if (!COGNITO.USER_POOL_ID || !COGNITO.CLIENT_ID) {
        throw new Error("Cognito USER_POOL_ID or CLIENT_ID is missing or undefined.");
    }
}

function getIdVerifier() {
    assertCognitoConfig();
    idVerifier ??= CognitoJwtVerifier.create({
        userPoolId: COGNITO.USER_POOL_ID,
        clientId: COGNITO.CLIENT_ID,
        tokenUse: "id",
    });
    return idVerifier;
}

function getAccessVerifier() {
    assertCognitoConfig();
    accessVerifier ??= CognitoJwtVerifier.create({
        userPoolId: COGNITO.USER_POOL_ID,
        clientId: COGNITO.CLIENT_ID,
        tokenUse: "access",
    });
    return accessVerifier;
}

export async function verifyIdToken(idToken){
    return await getIdVerifier().verify(idToken);
}

export async function verifyAccessToken(accessToken){
    return await getAccessVerifier().verify(accessToken);
}

export async function fetchNewTokens(refresh_token) {
    assertCognitoConfig();
    if (!COGNITO.DOMAIN || !COGNITO.REGION) {
        throw new Error("Cognito DOMAIN or REGION is missing or undefined.");
    }

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
