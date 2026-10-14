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
    static async checkServerSession() {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch('/api/v1/auth/session', {
                credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
            });
            if(response.status===403)throw new Error("Tu cuenta no tiene un agente activo asociado. Contacta con Administración.");
            if (response.status === 401) {
                throw new Error('El servidor no ha aceptado la sesión. Revisa las cookies y la configuración de Cognito en Vercel.');
            }
            if (!response.ok) {
                throw new Error('El servidor no puede comprobar tus permisos. Revisa la conexión a la base de datos en Vercel.');
            }
            const session = await response.json();
            if (session.authenticated !== true) throw new Error('No se pudo comprobar la sesión en el servidor.');
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('El servidor ha tardado demasiado en comprobar la sesión. Inténtalo de nuevo.');
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    static async checkSession() {
        try {
            cognitoUserPoolsTokenProvider.setKeyValueStorage(new CookieStorage());
            const session = await fetchAuthSession();
            if (session.tokens?.idToken) {
                const { payload } = decodeJWT(session.tokens.idToken.toString());
                return payload;
            }
            return null;
        } catch {
            return null;
        }
    }

    static async login(username, password) {
        cognitoUserPoolsTokenProvider.setKeyValueStorage(new CookieStorage());
        
        // Submitting credentials must authenticate them, never reuse a prior user.
        localStorage.removeItem('username');
        localStorage.removeItem('userPayload');
        await signOut();
        let response = await signIn({
            username: username,
            password: password
        });

        if (response.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
            const newPassword = prompt("Por favor, introduzca nueva contraseña");

            response = await confirmSignIn({
                challengeResponse: newPassword,
            });
        }

        if (response.isSignedIn !== true) {
            throw new Error("Debes completar la verificación de Cognito antes de acceder.");
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
        localStorage.removeItem('redirectAfterLogin');
        await signOut();
    }
}
