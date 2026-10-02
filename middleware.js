import { NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { COGNITO } from "./env.js";
import { getPgPool } from "./server/database/pgClient.js";
import { canAccessApiPath, canAccessDashboardPath, normalizeRole } from "./app/config/roleAccess.ts";

import {loginUrl,loginDestination} from "./app/config/loginRedirect.js";
import {managesTasks} from './server/features/laboral/TaskAccess.js';

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

async function verifyIdToken(idToken) {
  if (!COGNITO.USER_POOL_ID || !COGNITO.CLIENT_ID || !COGNITO.REGION) {
    throw new Error("Cognito configuration is missing");
  }
  const issuer = `https://cognito-idp.${COGNITO.REGION}.amazonaws.com/${COGNITO.USER_POOL_ID}`;
  const { payload } = await jwtVerify(idToken, getJwks(), { issuer, audience: COGNITO.CLIENT_ID });
  if (payload.token_use !== "id") throw new Error("Invalid Cognito token use");
  return payload;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  // Canonicalize the accented legacy URL before it can match a bank-line ID.
  const legacyReconciliation = /^\/dashboard\/direccion\/tesoreria\/extractos\/conciliaci(?:ó|%c3%b3)n(?=\/|$)/i;
  if (legacyReconciliation.test(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.replace(legacyReconciliation, "/dashboard/direccion/tesoreria/extractos/conciliacion");
    return NextResponse.redirect(redirectUrl, 308);
  }
  let response = NextResponse.next();
  const isApi = pathname.startsWith("/api/");
  if ((pathname === "/" || pathname === "/admin") && request.nextUrl.searchParams.has('auth_error')) return response;
  let tokensVerified = false;

  const goToLogin = () => {
    if (pathname === "/" || pathname === "/admin") return response;
    return NextResponse.redirect(new URL(loginUrl(pathname+request.nextUrl.search), request.url));
  };

  const goToPanel = () => NextResponse.redirect(new URL("/dashboard", request.url));
  const unauthenticated = () => isApi
    ? NextResponse.json({ message: "No autenticado" }, { status: 401 })
    : goToLogin();
  const forbidden = () => isApi
    ? NextResponse.json({ message: "No tienes permisos para acceder a este recurso" }, { status: 403 })
    : goToPanel();

  const username = request.cookies.get(`CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}.LastAuthUser`)?.value;
  if (!username) return unauthenticated();

  const accessToken = request.cookies.get(`CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}.${username}.accessToken`)?.value;
  const idToken = request.cookies.get(`CognitoIdentityServiceProvider.${COGNITO.CLIENT_ID}.${username}.idToken`)?.value;
  if (!accessToken || !idToken) return unauthenticated();

  try {
    const [, idPayload] = await Promise.all([verifyAccessToken(accessToken), verifyIdToken(idToken)]);
    tokensVerified = true;
    const email = String(idPayload.email || "").trim();
    const pool = getPgPool();
    const { rows } = email
      ? await pool.query(`SELECT id_agente, rol_agente FROM agentes_db WHERE lower(btrim(email_agente)) = lower(btrim($1)) ORDER BY updated_at DESC LIMIT 1`, [email])
      : { rows: [] };
    const role = normalizeRole(rows[0]?.rol_agente);

    if ((pathname === "/" || pathname === "/admin")) return NextResponse.redirect(new URL(loginDestination(request.nextUrl.search),request.url));
    if (pathname.startsWith("/dashboard") && !canAccessDashboardPath(role, pathname)) return forbidden();
    if (isApi && !canAccessApiPath(role, pathname, request.method)) return forbidden();
    const personalTask = pathname.match(/^\/tareas\/([^/]+)\/?$/);
    if(personalTask&&!managesTasks(role)){
      const task=await pool.query('SELECT agente FROM laboral_tareas_empleado WHERE id=$1',[decodeURIComponent(personalTask[1])]);
      if(!rows[0]?.id_agente||task.rows[0]?.agente!==rows[0].id_agente)return NextResponse.redirect(new URL('/',request.url));
    }
    const authenticatedHeaders = new Headers(request.headers);
    authenticatedHeaders.set('x-p3-actor-id', rows[0]?.id_agente || '');
    authenticatedHeaders.set('x-p3-actor-role', role);
    response = NextResponse.next({ request: { headers: authenticatedHeaders } });
    const legacyDirectionRoutes = [
      ["/dashboard/direccion/tesoreria/extractos/revision", "/dashboard/direccion/tesoreria/extractos/conciliacion"],
      ["/dashboard/operaciones/agentesyroles", "/dashboard/operaciones/agentes"],
      ["/dashboard/operaciones/roles", "/dashboard/operaciones/agentes/roles"],
      ["/dashboard/direccion/previsiones/prevision-liquidez", "/dashboard/direccion/tesoreria/prevision-liquidez"],
      ["/dashboard/direccion/previsiones/prevision-ingresos", "/dashboard/direccion/tesoreria/prevision-ingresos"],
      ["/dashboard/direccion/previsiones/prevision-gastos", "/dashboard/direccion/tesoreria/prevision-cargos"],
    ];
    const legacyAgentDetail = pathname.match(/^\/dashboard\/operaciones\/(ag_[^/]+)$/);
    if (legacyAgentDetail) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/dashboard/operaciones/agentes/${legacyAgentDetail[1]}`;
      return NextResponse.redirect(redirectUrl,308);
    }
    for (const [legacy, current] of legacyDirectionRoutes) {
      if (pathname === legacy || pathname.startsWith(`${legacy}/`)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = pathname.replace(legacy, current);
        return NextResponse.redirect(redirectUrl, 308);
      }
    }
    if (pathname === "/dashboard/direccion/tesoreria") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard/direccion/tesoreria/extractos";
      return NextResponse.redirect(redirectUrl, 308);
    }
    if (pathname === "/dashboard/direccion/tesoreria/prevision-ingresos" || pathname.startsWith("/dashboard/direccion/tesoreria/prevision-ingresos/")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard/direccion/tesoreria/prevision-liquidez";
      redirectUrl.searchParams.set("vista", "ingresos");
      return NextResponse.redirect(redirectUrl, 308);
    }
    if (pathname === "/dashboard/direccion/tesoreria/prevision-cargos" || pathname.startsWith("/dashboard/direccion/tesoreria/prevision-cargos/")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard/direccion/tesoreria/prevision-liquidez";
      redirectUrl.searchParams.set("vista", "cargos");
      return NextResponse.redirect(redirectUrl, 308);
    }
    const legacyBankDetail = pathname.match(/^\/dashboard\/direccion\/bancos\/(banc_[^/]+)$/);
    if (legacyBankDetail) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/dashboard/direccion/tesoreria/extractos/conciliacion/${legacyBankDetail[1]}`;
      return NextResponse.redirect(redirectUrl, 308);
    }
    if (pathname === "/dashboard/direccion/bancos" || pathname.startsWith("/dashboard/direccion/bancos/")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = pathname.replace("/dashboard/direccion/bancos", "/dashboard/direccion/tesoreria");
      return NextResponse.redirect(redirectUrl, 308);
    }
    if (pathname.startsWith("/dashboard/operaciones/usuariosyroles")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = pathname.replace(
        "/dashboard/operaciones/usuariosyroles",
        "/dashboard/operaciones/agentes",
      );
      return NextResponse.redirect(redirectUrl, 308);
    }
  } catch (error) {
    if (tokensVerified) {
      console.error('Authentication permission lookup failed:', { name: error?.name, code: error?.code });
      if (isApi) return NextResponse.json({ message: 'No se pudieron comprobar los permisos' }, { status: 503 });
    }
    if (isApi) return unauthenticated();
    const redirectUrl = new URL(loginUrl(pathname + request.nextUrl.search), request.url);
    redirectUrl.searchParams.set('auth_error', tokensVerified ? 'service' : 'session');
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: ["/dashboard/:path*", "/tareas/:path*", "/api/v1/:path*", "/", "/admin"],
};
