'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { socialNetworks, socialProfileUrl, normalizeSocialProfiles, type SocialNetwork, type SocialProfile } from "@/app/lib/accountSocialProfiles";
import { CuentaService } from "@/app/service/CuentaService";
import { socialBrandIcons } from "./socialBrandIcons";

type Change = { nombre: SocialNetwork; accion: "guardar" | "eliminar" | "priorizar"; url?: string };

const button = "rounded-md border px-4 py-2 text-sm enabled:cursor-pointer enabled:hover:bg-gray-100 disabled:opacity-50";
const confirm = "rounded-md bg-blue-950 px-4 py-2 text-sm text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:opacity-50";

function SocialProfileDialog({ profile, pending, error, onClose, onChange }: {
  profile: SocialProfile;
  pending: boolean;
  error: string;
  onClose: () => void;
  onChange: (change: Change) => void;
}) {
  const [enabled, setEnabled] = useState(profile.tiene_cuenta);
  const [url, setUrl] = useState(profile.url);
  const dialog = useRef<HTMLDialogElement>(null);
  const name = socialNetworks[profile.nombre].label;
  const question = `¿La empresa tiene la red social ${name}?`;
  const validUrl = socialProfileUrl(profile.nombre, url);
  const changed = enabled && url.trim() !== profile.url;
  const remove = profile.tiene_cuenta && !changed;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !enabled || !validUrl || !changed) return;
    onChange({ nombre: profile.nombre, accion: "guardar", url: validUrl });
  };

  return (
    <dialog ref={dialog} aria-labelledby="social-profile-title"
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-xl bg-white p-6 text-gray-700 shadow-xl backdrop:bg-black/45"
      onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
      <button type="button" aria-label="Cerrar" disabled={pending} onClick={onClose}
        className="absolute right-3 top-3 rounded px-2 text-2xl enabled:cursor-pointer enabled:hover:bg-gray-100">×</button>
      <h3 id="social-profile-title" className="mb-5 pr-8 text-lg font-semibold text-blue-950">{name}</h3>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <p id="social-profile-question" className="mb-2 font-medium">{question}</p>
          <button type="button" role="switch" aria-labelledby="social-profile-question" aria-checked={enabled}
            disabled={pending} onClick={() => setEnabled(!enabled)}
            className="inline-flex rounded-full border border-gray-300 bg-gray-100 p-1 text-sm enabled:cursor-pointer enabled:hover:ring-2 enabled:hover:ring-blue-200">
            <span className={`rounded-full px-4 py-1 ${!enabled ? "bg-blue-950 text-white" : ""}`}>No</span>
            <span className={`rounded-full px-4 py-1 ${enabled ? "bg-blue-950 text-white" : ""}`}>Sí</span>
          </button>
        </div>
        {enabled && (
          <label className="block text-sm font-medium">
            URL del perfil
            <input type="text" inputMode="url" autoComplete="off" spellCheck={false} maxLength={2048} disabled={pending}
              aria-invalid={Boolean(url && !validUrl)} value={url} onChange={event => setUrl(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-normal focus:border-blue-700 focus:outline-none" />
            {url && !validUrl && <span className="mt-1 block font-normal text-red-700">Introduce una URL de perfil válida de {name}.</span>}
          </label>
        )}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={button} disabled={pending} onClick={onClose}>Cancelar</button>
          {remove && <button type="button" className={`${button} border-red-200 text-red-700 enabled:hover:bg-red-50`}
            disabled={pending} onClick={() => onChange({ nombre: profile.nombre, accion: "eliminar" })}>Eliminar</button>}
          {enabled && changed && (validUrl || profile.tiene_cuenta) && (
            <button type="submit" className={confirm} disabled={pending || !validUrl}>
              {pending ? "Guardando…" : profile.tiene_cuenta ? "Actualizar URL" : "Confirmar"}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}

export default function RedesSociales({ idCuenta, profiles, onSaved }: {
  idCuenta: string;
  profiles: SocialProfile[];
  onSaved: (profiles: SocialProfile[]) => void;
}) {
  const [selected, setSelected] = useState<SocialNetwork | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const entries = normalizeSocialProfiles(profiles);
  const favorite = entries.find(profile => profile.favorita);
  const editing = entries.find(profile => profile.nombre === selected);

  const save = async (change: Change) => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const profiles = await CuentaService.changeSocialProfile(idCuenta, change);
      onSaved(profiles);
      setSelected(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la red social.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-label="Redes sociales">
      <h3 className="mb-2 font-medium">Redes sociales</h3>
      <div className="inline-flex max-w-full flex-col items-center">
        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
          {entries.map(profile => {
            const { label } = socialNetworks[profile.nombre];
            const icon = socialBrandIcons[profile.nombre];
            return (
              <div key={profile.nombre} className="flex w-9 flex-col items-center">
                <button type="button" aria-label={`Editar ${label}`} title={label} disabled={pending}
                  data-configured={profile.tiene_cuenta}
                  onClick={() => { setError(""); setSelected(profile.nombre); }}
                  style={{ "--brand-color": icon.color } as CSSProperties}
                  className={`group flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-200 motion-reduce:transition-none enabled:cursor-pointer enabled:hover:bg-gray-100 enabled:hover:text-[var(--brand-color)] ${profile.tiene_cuenta ? "text-[var(--brand-color)]" : "text-gray-600"}`}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"
                    className={`h-5 w-5 ${profile.nombre === "tiktok" ? "transition-[filter] motion-reduce:transition-none group-data-[configured=true]:[filter:drop-shadow(-1px_-1px_0_#25f4ee)_drop-shadow(1px_1px_0_#fe2c55)] group-hover:[filter:drop-shadow(-1px_-1px_0_#25f4ee)_drop-shadow(1px_1px_0_#fe2c55)]" : ""}`}>
                    <path d={icon.path} />
                  </svg>
                </button>
                <div className="flex h-6 items-center justify-center">
                  {profile.favorita ? (
                    <svg role="img" aria-label={`${label} es la red prioritaria`} viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-600">
                      <path d="m2 6 5 4 5-7 5 7 5-4-2.5 12h-15L2 6Zm3 14h14v2H5z" />
                    </svg>
                  ) : profile.tiene_cuenta && (
                    <input type="checkbox" aria-label={`Marcar ${label} como red prioritaria`} title={`Marcar ${label} como red prioritaria`}
                      checked={false} disabled={pending} onChange={() => void save({ nombre: profile.nombre, accion: "priorizar" })}
                      className="h-4 w-4 accent-blue-950 enabled:cursor-pointer enabled:hover:ring-2 enabled:hover:ring-blue-200" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div aria-live="polite" className="mt-1 text-center text-xs text-gray-600">
          <p className="font-bold">Red social prioritaria</p>
          <p>{favorite ? socialNetworks[favorite.nombre].label : "Sin seleccionar"}</p>
        </div>
      </div>
      {!editing && error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      {editing && <SocialProfileDialog profile={editing} pending={pending} error={error} onClose={() => setSelected(null)} onChange={change => void save(change)} />}
    </section>
  );
}
