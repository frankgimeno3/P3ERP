import {Amplify} from "aws-amplify";
import {signIn, confirmSignIn} from "aws-amplify/auth/cognito";
import {cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import {CookieStorage, decodeJWT, fetchAuthSession} from "@aws-amplify/core";
import {signOut} from "aws-amplify/auth";

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
            userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
            loginWith: {
                username: true
            }
        }
    }
});

export default class AuthenticationService {
    static async checkSession() {
        try {
            cognitoUserPoolsTokenProvider.setKeyValueStorage(new CookieStorage());
            const session = await fetchAuthSession();
            if (session.tokens?.idToken) {
                const { payload } = decodeJWT(session.tokens.idToken.toString());
                return payload;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    static async login(username, password) {
        cognitoUserPoolsTokenProvider.setKeyValueStorage(new CookieStorage());
        
        // Verificar si ya hay una sesión activa
        const existingSession = await this.checkSession();
        if (existingSession) {
            // Si hay una sesión activa, retornar el payload existente
            localStorage.setItem('username', username);
            localStorage.setItem("userPayload", JSON.stringify(existingSession));
            return existingSession;
        }

        const response = await signIn({
            username: username,
            password: password
        });

        if (response.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
            const newPassword = prompt("Por favor, introduzca nueva contraseña");

            await confirmSignIn({
                challengeResponse: newPassword,
            });
        }

        const session = await fetchAuthSession();

        if (!session.tokens?.idToken) {
            throw new Error("Usuario no autenticado.");
        }
        const { payload } = decodeJWT(session.tokens.idToken.toString());
        localStorage.setItem('username', username);
        return payload
    }

    static async logout(){
        cognitoUserPoolsTokenProvider.setKeyValueStorage(new CookieStorage());
        localStorage.removeItem('username');
        localStorage.removeItem('userPayload');
        await signOut();
    }
}