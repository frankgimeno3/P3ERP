import { NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { COGNITO } from "./env.js";

let jwks;

function getJwks() {
  if (!jwks) {
    const issuer = `https://cognito-idp.${COGNITO.REGION}.amazonaws.com/${COGNITO.USER_POOL_ID}`;
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }

  return jwks;
}

async function verifyAccessToken(accessToken) {
  if (!COGNITO.USER_POOL_ID || !COGNITO.CLIENT_ID || !COGNITO.REGION) {
    throw new Error("Cognito configuration is missing");
  }

  const issuer = `https://cognito-idp.${COGNITO.REGION}.amazonaws.com/${COGNITO.USER_POOL_ID}`;
  const { payload } = await jwtVerify(accessToken, getJwks(), { issuer });

  if (payload.token_use !== "access") {
    throw new Error("Invalid Cognito token use");
  }

  if (payload.client_id !== COGNITO.CLIENT_ID) {
    throw new Error("Invalid Cognito client");
  }

  return payload;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const goToLogin = () => {
    if (pathname === "/" || pathname === "/admin") return response;
    return NextResponse.redirect(new URL("/", request.url));
  };

  const goToPanel = () => NextResponse.redirect(new URL("/dashboard", request.url));

  const username = request.cookies.get(`CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}.LastAuthUser`)?.value;
  if (!username) return goToLogin();

  const accessToken = request.cookies.get(`CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}.${username}.accessToken`)?.value;
  if (!accessToken) return goToLogin();

  try {
    const payload = await verifyAccessToken(accessToken);
    const roles = payload["cognito:groups"] || [];
    const isAdmin = Array.isArray(roles) && roles.includes("admin");

    if ((pathname === "/" || pathname === "/admin")) return goToPanel();
    if (!isAdmin && pathname.includes("/admin/dashboard")) return goToPanel();
  } catch (error) {
    return goToLogin();
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon\\.ico|api).*)"],
};
