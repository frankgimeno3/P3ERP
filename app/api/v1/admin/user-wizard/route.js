import { NextResponse } from "next/server";
import { createEndpoint } from "../../../../../server/createEndpoint.js";
import { cognitoUserExists, confirmExistingUser, createConfirmedUser, deleteCognitoUser } from "../../../../../server/features/user/UserSerivce.js";
import {
  activeRoleExists,
  confirmAgenteDraft,
  createAgenteDraft,
  discardAgenteDraft,
  emailAgenteExists,
  getAgenteDraft,
  getAgenteByEmail,
  nombreAgenteExists,
  updateAgenteDraft,
} from "../../../../../server/features/agente/AgenteRepository.js";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST = createEndpoint(async (_request, body = {}) => {
  const currentAgent = await getAgenteByEmail(_request.email);
  const currentRole = String(currentAgent?.rol_agente || "").trim().toLowerCase();
  if (!["admin", "superadmin", "operaciones"].includes(currentRole)) {
    return NextResponse.json({ message: "No tienes permisos para crear usuarios" }, { status: 403 });
  }

  const action = body.action;

  if (action === "check-email") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!emailPattern.test(email)) return NextResponse.json({ message: "Email no válido" }, { status: 400 });
    const exists = (await emailAgenteExists(email, body.draftId || "")) || (await cognitoUserExists(email));
    return NextResponse.json({ exists });
  }

  if (action === "create-draft") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!emailPattern.test(email)) return NextResponse.json({ message: "Email no válido" }, { status: 400 });
    if (await cognitoUserExists(email)) return NextResponse.json({ exists: true }, { status: 409 });
    const draft = await createAgenteDraft(email);
    return draft ? NextResponse.json({ draft }) : NextResponse.json({ exists: true }, { status: 409 });
  }

  if (action === "update-draft-email") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!emailPattern.test(email)) return NextResponse.json({ message: "Email no válido" }, { status: 400 });
    const exists = (await emailAgenteExists(email, body.draftId)) || (await cognitoUserExists(email));
    if (exists) return NextResponse.json({ exists: true }, { status: 409 });
    const draft = await updateAgenteDraft(body.draftId, { email_agente: email });
    return draft ? NextResponse.json({ draft }) : NextResponse.json({ message: "Borrador no encontrado" }, { status: 404 });
  }

  if (action === "check-name") {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ message: "Nombre obligatorio" }, { status: 400 });
    return NextResponse.json({ exists: await nombreAgenteExists(name, body.draftId || "") });
  }

  if (action === "save-name") {
    const name = String(body.name || "").trim();
    if (!name || await nombreAgenteExists(name, body.draftId)) return NextResponse.json({ exists: true }, { status: 409 });
    const draft = await updateAgenteDraft(body.draftId, { nombre_completo_agente: name });
    return draft ? NextResponse.json({ draft }) : NextResponse.json({ message: "Borrador no encontrado" }, { status: 404 });
  }

  if (action === "discard") {
    await discardAgenteDraft(String(body.draftId || ""));
    return NextResponse.json({ discarded: true });
  }

  if (action === "finalize") {
    const draft = await getAgenteDraft(String(body.draftId || ""));
    const roleId = String(body.roleId || "");
    const password = String(body.password || "");
    if (!draft) return NextResponse.json({ message: "Borrador no encontrado" }, { status: 404 });
    if (!(await activeRoleExists(roleId))) return NextResponse.json({ message: "Rol no válido" }, { status: 400 });
    if (password.length <= 8) return NextResponse.json({ message: "La contraseña debe tener más de 8 caracteres" }, { status: 400 });
    const existsInCognito = await cognitoUserExists(draft.email_agente);
    const cognitoResult = existsInCognito
      ? await confirmExistingUser(draft.nombre_completo_agente, draft.email_agente, password, roleId)
      : await createConfirmedUser(draft.nombre_completo_agente, draft.email_agente, password, roleId);
    try {
      const user = await confirmAgenteDraft(draft.id_agente, roleId);
      if (!user) throw new Error("No se pudo confirmar el agente");
      return NextResponse.json({ user, groupAssigned: cognitoResult.groupAssigned }, { status: 201 });
    } catch (error) {
      await deleteCognitoUser(draft.email_agente);
      throw error;
    }
  }

  return NextResponse.json({ message: "Acción no válida" }, { status: 400 });
}, null, true);
