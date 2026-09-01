"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, LoaderCircle, X } from "lucide-react";

type Role = { id_rol: string; nombre_rol: string; estado_rol: string };
type Agent = {
  id_agente: string;
  nombre_completo_agente: string;
  email_agente: string;
  rol_agente: string;
  estado_agente: string;
};
type CheckStatus = "idle" | "checking" | "exists" | "available";

const endpoint = "/api/v1/admin/user-wizard";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roleOrder = ["base", "administracion", "operaciones", "superadmin"];
const roleLabels: Record<string, string> = { base: "base", administracion: "administración", operaciones: "operaciones", superadmin: "superadmin" };
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function request(body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "No se ha podido completar la operación");
  return data;
}

export default function CreateUserWizard({ roles, onClose, onCreated }: { roles: Role[]; onClose: () => void; onCreated: (agent: Agent) => void }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<CheckStatus>("idle");
  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState<CheckStatus>("idle");
  const [draftId, setDraftId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const draftIdRef = useRef("");
  const confirmedRef = useRef(false);

  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);

  const discardDraft = useCallback(async () => {
    const id = draftIdRef.current;
    if (!id || confirmedRef.current) return;
    draftIdRef.current = "";
    setDraftId("");
    await request({ action: "discard", draftId: id }).catch(() => {
      navigator.sendBeacon(endpoint, new Blob([JSON.stringify({ action: "discard", draftId: id })], { type: "application/json" }));
    });
  }, []);

  useEffect(() => {
    const discardOnLeave = () => {
      const id = draftIdRef.current;
      if (!id || confirmedRef.current) return;
      navigator.sendBeacon(endpoint, new Blob([JSON.stringify({ action: "discard", draftId: id })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", discardOnLeave);
    return () => window.removeEventListener("pagehide", discardOnLeave);
  }, []);

  const close = useCallback(async () => {
    if (saving) return;
    await discardDraft();
    onClose();
  }, [discardDraft, onClose, saving]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") void close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  const checkEmail = async () => {
    setEmailStatus("checking"); setError("");
    try {
      const [data] = await Promise.all([request({ action: "check-email", email, draftId }), wait(2000)]);
      setEmailStatus(data.exists ? "exists" : "available");
    } catch (cause) { setEmailStatus("idle"); setError(cause instanceof Error ? cause.message : "No se pudo comprobar el email"); }
  };

  const continueFromEmail = async () => {
    setSaving(true); setError("");
    try {
      const data = draftId
        ? await request({ action: "update-draft-email", draftId, email })
        : await request({ action: "create-draft", email });
      setDraftId(data.draft.id_agente);
      setStep(2);
    } catch (cause) {
      setEmailStatus("exists");
      setError(cause instanceof Error ? cause.message : "No se pudo crear el borrador");
    } finally { setSaving(false); }
  };

  const checkName = async () => {
    setNameStatus("checking"); setError("");
    try {
      const [data] = await Promise.all([request({ action: "check-name", name, draftId }), wait(2000)]);
      setNameStatus(data.exists ? "exists" : "available");
    } catch (cause) { setNameStatus("idle"); setError(cause instanceof Error ? cause.message : "No se pudo comprobar el nombre"); }
  };

  const continueFromName = async () => {
    setSaving(true); setError("");
    try { await request({ action: "save-name", draftId, name }); setStep(3); }
    catch (cause) { setNameStatus("exists"); setError(cause instanceof Error ? cause.message : "No se pudo guardar el nombre"); }
    finally { setSaving(false); }
  };

  const confirm = async () => {
    setSaving(true); setError("");
    try {
      const data = await request({ action: "finalize", draftId, roleId, password });
      confirmedRef.current = true;
      draftIdRef.current = "";
      onCreated(data.user);
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el agente"); }
    finally { setSaving(false); }
  };

  const activeRoles = roles
    .filter((role) => !role.estado_rol || role.estado_rol.toLowerCase() === "activo")
    .sort((a, b) => {
      const aIndex = roleOrder.indexOf(a.id_rol);
      const bIndex = roleOrder.indexOf(b.id_rol);
      return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
    });
  const selectedRole = roles.find((role) => role.id_rol === roleId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) void close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="create-user-title" className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div><h2 id="create-user-title" className="text-xl font-semibold text-blue-950">Crear agente</h2><p className="mt-1 text-sm text-gray-500">{stepTitle(step)}</p></div>
          <button type="button" disabled={saving} onClick={() => void close()} aria-label="Cerrar" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-2xl text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50">×</button>
        </header>

        <form className="p-6" onSubmit={(event) => event.preventDefault()}>
          {step === 1 && <>
            <FieldLabel htmlFor="new-user-email">Email del agente</FieldLabel>
            <div className="flex gap-3"><input id="new-user-email" type="email" autoComplete="email" disabled={emailStatus === "checking" || saving} value={email} onChange={(event) => { setEmail(event.target.value); setEmailStatus("idle"); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter" && emailStatus === "idle" && emailPattern.test(email.trim())) { event.preventDefault(); void checkEmail(); } }} className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100" placeholder="agente@empresa.com" /><CheckButton status={emailStatus} disabled={!emailPattern.test(email.trim())} onClick={checkEmail} label="Comprobar" /></div>
            <StatusMessage status={emailStatus} kind="email" />
            {emailStatus === "available" && <div className="mt-6 flex justify-end"><PrimaryButton disabled={saving} onClick={continueFromEmail}>{saving ? "Creando…" : "Continuar"}</PrimaryButton></div>}
          </>}

          {step === 2 && <>
            <div className="mb-5 rounded-md border border-blue-100 bg-blue-50 p-4"><span className="block text-xs font-semibold uppercase text-blue-700">ID asignado</span><span className="mt-1 block font-mono font-semibold text-blue-950">{draftId}</span></div>
            <FieldLabel htmlFor="new-user-name">Nombre y apellidos</FieldLabel>
            <div className="flex gap-3"><input id="new-user-name" type="text" autoComplete="name" disabled={nameStatus === "checking" || saving} value={name} onChange={(event) => { setName(event.target.value); setNameStatus("idle"); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter" && nameStatus === "idle" && name.trim()) { event.preventDefault(); void checkName(); } }} className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2.5 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100" placeholder="Nombre Apellidos" /><CheckButton status={nameStatus} disabled={!name.trim()} onClick={checkName} label="Comprobar" /></div>
            <StatusMessage status={nameStatus} kind="name" />
            <WizardFooter backLabel="Editar email" onBack={() => setStep(1)} continueVisible={nameStatus === "available"} continueDisabled={saving} onContinue={continueFromName} />
          </>}

          {step === 3 && <>
            <FieldLabel htmlFor="new-user-role">Rol</FieldLabel>
            <select id="new-user-role" value={roleId} onChange={(event) => setRoleId(event.target.value)} className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2.5 outline-none transition hover:border-blue-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"><option value="">Selecciona un rol</option>{activeRoles.map((role) => <option key={role.id_rol} value={role.id_rol}>{roleLabels[role.id_rol] || role.nombre_rol || role.id_rol}</option>)}</select>
            <WizardFooter onBack={() => setStep(2)} continueVisible continueDisabled={!roleId} onContinue={() => setStep(4)} />
          </>}

          {step === 4 && <>
            <FieldLabel htmlFor="new-user-password">Contraseña</FieldLabel>
            <div className="relative"><input id="new-user-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2.5 pr-12 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-blue-950">{showPassword ? <Eye size={20} /> : <EyeOff size={20} />}</button></div>
            <p className={`mt-2 text-sm ${password && password.length <= 8 ? "text-red-600" : "text-gray-500"}`}>Debe tener más de 8 caracteres.</p>
            <WizardFooter onBack={() => setStep(3)} continueVisible continueDisabled={password.length <= 8} onContinue={() => setStep(5)} />
          </>}

          {step === 5 && <>
            <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200"><Review label="ID" value={draftId} /><Review label="Email" value={email.trim().toLowerCase()} /><Review label="Nombre" value={name.trim()} /><Review label="Rol" value={roleLabels[roleId] || selectedRole?.nombre_rol || roleId} /></dl>
            <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">Al confirmar se creará la cuenta activa en Cognito sin enviar un email de verificación.</p>
            <WizardFooter backLabel="Volver" onBack={() => setStep(4)} continueLabel={saving ? "Creando agente…" : "Confirmar y crear agente"} continueVisible continueDisabled={saving} onContinue={confirm} />
          </>}

          {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        </form>
      </section>
    </div>
  );
}

function stepTitle(step: number) { return ["", "Comprobar email", "Datos personales", "Asignar rol", "Definir contraseña", "Revisar y confirmar"][step]; }
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) { return <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-gray-700">{children}</label>; }
function PrimaryButton({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" disabled={disabled} onClick={onClick} className="cursor-pointer rounded-md bg-blue-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50">{children}</button>; }
function CheckButton({ status, disabled, onClick, label }: { status: CheckStatus; disabled: boolean; onClick: () => void; label: string }) { const locked = status === "checking" || status === "exists" || status === "available"; return <button type="button" disabled={disabled || locked} onClick={onClick} aria-label={status === "exists" ? "Ya existe" : status === "available" ? "Disponible" : label} className={`flex min-w-32 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold transition ${status === "exists" ? "border-red-600 bg-red-50 text-red-700" : status === "available" ? "border-green-600 bg-green-50 text-green-700" : "border-blue-950 bg-white text-blue-950 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"}`}>{status === "checking" ? <LoaderCircle className="animate-spin" size={22} /> : status === "exists" ? <X strokeWidth={4} size={23} /> : status === "available" ? <Check strokeWidth={4} size={23} /> : label}</button>; }
function StatusMessage({ status, kind }: { status: CheckStatus; kind: "email" | "name" }) { if (status === "exists") return <p className="mt-3 font-semibold text-red-700">Ya existe un agente con este {kind === "email" ? "email" : "nombre"}. Modifica el campo para volver a comprobarlo.</p>; if (status === "available") return <p className="mt-3 font-semibold text-green-700">No hay ningún agente con este {kind === "email" ? "email" : "nombre"}. Puedes continuar.</p>; return null; }
function WizardFooter({ onBack, backLabel = "Anterior", continueVisible, continueDisabled, onContinue, continueLabel = "Continuar" }: { onBack: () => void; backLabel?: string; continueVisible: boolean; continueDisabled?: boolean; onContinue: () => void; continueLabel?: string }) { return <div className="mt-7 flex items-center justify-between border-t border-gray-100 pt-5"><button type="button" onClick={onBack} className="cursor-pointer rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50">← {backLabel}</button>{continueVisible && <PrimaryButton disabled={continueDisabled} onClick={onContinue}>{continueLabel}</PrimaryButton>}</div>; }
function Review({ label, value }: { label: string; value: string }) { return <div className="grid grid-cols-[120px_1fr] gap-4 px-4 py-3"><dt className="font-semibold text-gray-500">{label}</dt><dd className="break-all font-medium text-gray-800">{value}</dd></div>; }
