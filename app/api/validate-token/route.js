import {COGNITO} from "../../../env.js";
import {verifyAccessToken, verifyIdToken} from "../../../server/features/authentication/AuthenticationService.js";

export async function POST(request) {
    try {
        if (!COGNITO?.USER_POOL_ID || !COGNITO?.CLIENT_ID) {
            return new Response("Cognito configuration is missing", {status: 500});
        }

        const baseKey = `CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}`;
        const username = request.cookies.get(`${baseKey}.LastAuthUser`)?.value;

        if (!username) {
            return new Response("Missing username cookie", {status: 400});
        }

        const idToken = request.cookies.get(`${baseKey}.${username}.idToken`)?.value;
        const accessToken = request.cookies.get(`${baseKey}.${username}.accessToken`)?.value;

        if (!idToken || !accessToken) {
            return new Response("Missing token(s)", {status: 400});
        }

        await Promise.all([verifyIdToken(idToken), verifyAccessToken(accessToken)]);

        return new Response("Ok", {status: 200});
    } catch (error) {
        return new Response("Invalid Token", {status: 401});
    }
}
