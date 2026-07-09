"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MediatecaService } from "@/app/service/MediatecaService";

export type MediatecaFolder = { id: string; name: string; path: string };
export type MediatecaMedia = {
  id: string;
  name: string;
  s3Key: string;
  url?: string;
  folderPath: string;
  type: "pdf" | "image";
  mimeType?: string;
};

function joinPath(segments: string[]) {
  return segments.filter(Boolean).join("/");
}

function splitPath(path?: string) {
  return String(path || "").split("/").filter(Boolean);
}

function normalizeRouteSegment(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s\-_–—]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mediaUrl(item: MediatecaMedia) {
  if (item.url) return item.url;
  const host = String(process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return host ? `https://${host}/${item.s3Key}` : item.s3Key;
}

function ModalFrame({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100">X</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function CreateFolderModal({ parentPath, onClose, onDone }: { parentPath: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const normalizedName = normalizeRouteSegment(name);
  const displayPath = parentPath ? `${parentPath}/${normalizedName || "nueva_carpeta"}` : normalizedName || "nueva_carpeta";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await MediatecaService.createFolder({ name, path: parentPath });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se ha podido crear la carpeta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="Crear carpeta" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          Nombre
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border p-2" />
        </label>
        <p className="text-xs text-gray-500">Ruta: {displayPath}</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm">Cancelar</button>
          <button disabled={!name.trim() || saving} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white disabled:opacity-50">Crear</button>
        </div>
      </form>
    </ModalFrame>
  );
}

function RenameModal({ item, onClose, onDone }: { item: MediatecaMedia; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(item.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await MediatecaService.updateMedia(item.id, { contentName: name });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se ha podido renombrar el archivo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="Renombrar archivo" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border p-2" />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm">Cancelar</button>
          <button disabled={!name.trim() || saving} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white disabled:opacity-50">Guardar</button>
        </div>
      </form>
    </ModalFrame>
  );
}

function AddFileModal({ folderPath, onClose, onDone }: { folderPath: string; onClose: () => void; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"image" | "pdf">("image");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function upload() {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const presign = await MediatecaService.createPresign({ filename: file.name, contentType: file.type });
      const response = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error("La subida a S3 ha fallado.");
      await MediatecaService.createMedia({
        mediaId: presign.mediaId,
        contentName: name || file.name,
        s3Key: presign.s3Key,
        cdnUrl: presign.cdnUrl,
        folderPath,
        contentType: file.type,
        type,
      });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "No se ha podido subir el archivo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="Añadir archivo" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setType("image")} className={`rounded-lg border p-3 text-sm ${type === "image" ? "border-blue-950 bg-blue-50" : ""}`}>Imagen</button>
          <button type="button" onClick={() => setType("pdf")} className={`rounded-lg border p-3 text-sm ${type === "pdf" ? "border-blue-950 bg-blue-50" : ""}`}>PDF</button>
        </div>
        <input ref={inputRef} type="file" accept={type === "image" ? "image/*" : ".pdf,application/pdf"} className="hidden" onChange={(event) => {
          const selected = event.target.files?.[0] || null;
          setFile(selected);
          setName(selected?.name || "");
        }} />
        <button type="button" onClick={() => inputRef.current?.click()} className="w-full rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm hover:border-blue-950">
          {file ? file.name : "Seleccionar archivo"}
        </button>
        <label className="block text-sm">
          Nombre en mediateca
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border p-2" />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm">Cancelar</button>
          <button type="button" disabled={!file || !name.trim() || saving} onClick={() => void upload()} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? "Subiendo..." : "Subir"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function MoveModal({ item, onClose, onDone }: { item: MediatecaMedia; onClose: () => void; onDone: () => void }) {
  const [path, setPath] = useState(item.folderPath || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await MediatecaService.updateMedia(item.id, { folderPath: path });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se ha podido mover el archivo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="Mover archivo" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          Ruta destino
          <input value={path} onChange={(event) => setPath(event.target.value)} placeholder="carpeta/subcarpeta" className="mt-1 w-full rounded-lg border p-2 font-mono text-sm" />
        </label>
        <p className="text-xs text-gray-500">Deja vacío para mover a la raíz.</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm">Cancelar</button>
          <button disabled={saving} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white disabled:opacity-50">Mover</button>
        </div>
      </form>
    </ModalFrame>
  );
}

export function MediatecaBrowser({
  initialPath = "",
  picker = false,
  allowPdfSelection = true,
  onSelect,
}: {
  initialPath?: string;
  picker?: boolean;
  allowPdfSelection?: boolean;
  onSelect?: (url: string, item: Pick<MediatecaMedia, "id" | "name" | "type">) => void;
}) {
  const [segments, setSegments] = useState<string[]>(splitPath(initialPath));
  const [folders, setFolders] = useState<MediatecaFolder[]>([]);
  const [media, setMedia] = useState<MediatecaMedia[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MediatecaMedia | null>(null);
  const [moveTarget, setMoveTarget] = useState<MediatecaMedia | null>(null);

  const currentPath = joinPath(segments);
  const currentFolderName = segments.length > 0 ? segments[segments.length - 1] : "raiz";
  const selected = media.find((item) => item.id === selectedId) || null;
  const filteredMedia = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? media.filter((item) => item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)) : media;
  }, [media, search]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [folderData, mediaData] = await Promise.all([
        MediatecaService.getFolders(currentPath),
        MediatecaService.getMedia({ folderPath: currentPath }),
      ]);
      setFolders(Array.isArray(folderData) ? folderData : []);
      setMedia(Array.isArray(mediaData) ? mediaData : []);
      setSelectedId("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se ha podido cargar la mediateca.");
      setFolders([]);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [currentPath]);

  async function deleteFolder(folder: MediatecaFolder) {
    if (!window.confirm(`Eliminar la carpeta "${folder.name}" y todo su contenido?`)) return;
    await MediatecaService.deleteFolder(folder.id);
    await load();
  }

  async function deleteMedia(item: MediatecaMedia) {
    if (!window.confirm(`Eliminar "${item.name}" de la mediateca y de S3?`)) return;
    await MediatecaService.deleteMedia(item.id);
    await load();
  }

  const canUseSelection = selected && (selected.type === "image" || allowPdfSelection);

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-700">Ruta actual de la carpeta</p>
          <button type="button" disabled={segments.length === 0} onClick={() => setSegments(segments.slice(0, -1))} className="rounded-lg border bg-white px-3 py-1.5 text-xs disabled:opacity-50">Subir nivel</button>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={() => setSegments([])} className="rounded px-2 py-1 font-medium text-blue-800 hover:bg-blue-100">Mediateca</button>
          {segments.map((segment, index) => (
            <span key={`${segment}-${index}`} className="flex items-center gap-1">
              <span className="text-gray-400">/</span>
              <button type="button" onClick={() => setSegments(segments.slice(0, index + 1))} className="rounded px-2 py-1 text-blue-800 hover:bg-blue-100">{segment}</button>
            </span>
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-gray-500">{currentPath || "(raiz)"}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => setCreateOpen(true)} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white">Crear carpeta</button>
          <button type="button" onClick={() => setAddOpen(true)} className="rounded-lg border border-blue-950 px-4 py-2 text-sm text-blue-950">Añadir archivo</button>
        </div>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar archivo..." className="w-64 rounded-lg border p-2 text-sm" />
      </div>

      <section>
        <h2 className="mb-3 font-semibold">Sub-carpetas dentro de la carpeta actual ({currentFolderName})</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Ruta</th>
                {!picker && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {folders.map((folder) => (
                <tr key={folder.id} className="border-t hover:bg-blue-50">
                  <td className="p-3">
                    <button type="button" className="font-medium text-blue-800 hover:underline" onClick={() => setSegments(splitPath(folder.path))}>
                      {folder.name}
                    </button>
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-500">{folder.path}</td>
                  {!picker && (
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => void deleteFolder(folder)} className="rounded bg-red-50 px-3 py-1 text-xs text-red-700">Eliminar</button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && folders.length === 0 && <tr><td colSpan={picker ? 2 : 3} className="p-4 text-center text-gray-400">Sin carpetas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Archivos en la carpeta actual ({currentFolderName})</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                {picker && <th className="p-3">Sel.</th>}
                <th className="p-3">Vista</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Ruta</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((item) => {
                const src = mediaUrl(item);
                const isSelected = selectedId === item.id;
                return (
                  <tr key={item.id} className={isSelected ? "border-t bg-blue-50" : "border-t hover:bg-gray-50"}>
                    {picker && (
                      <td className="p-3">
                        <input type="checkbox" checked={isSelected} disabled={!allowPdfSelection && item.type === "pdf"} onChange={() => setSelectedId(isSelected ? "" : item.id)} />
                      </td>
                    )}
                    <td className="p-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded border bg-gray-100">
                        {item.type === "image" ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-red-700">PDF</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      {src ? <a className="font-medium text-blue-800 hover:underline" href={src} target="_blank" rel="noreferrer">{item.name}</a> : item.name}
                      <p className="font-mono text-[10px] text-gray-400">{item.id}</p>
                    </td>
                    <td className="p-3">{item.type === "pdf" ? "PDF" : "Imagen"}</td>
                    <td className="p-3 font-mono text-xs text-gray-500">{item.folderPath || "(raiz)"}</td>
                    <td className="space-x-2 p-3 text-right">
                      {!picker && <button type="button" onClick={() => setRenameTarget(item)} className="rounded bg-gray-100 px-3 py-1 text-xs">Renombrar</button>}
                      {!picker && <button type="button" onClick={() => setMoveTarget(item)} className="rounded bg-gray-100 px-3 py-1 text-xs">Mover</button>}
                      {!picker && <button type="button" onClick={() => void deleteMedia(item)} className="rounded bg-red-50 px-3 py-1 text-xs text-red-700">Eliminar</button>}
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredMedia.length === 0 && <tr><td colSpan={picker ? 6 : 5} className="p-4 text-center text-gray-400">Sin archivos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {picker && (
        <div className="sticky bottom-0 flex justify-end border-t bg-white py-3">
          <button type="button" disabled={!canUseSelection} onClick={() => selected && onSelect?.(mediaUrl(selected), { id: selected.id, name: selected.name, type: selected.type })} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white disabled:opacity-50">
            Usar archivo
          </button>
        </div>
      )}

      {!picker && <div className="pt-2"><Link href="/dashboard" className="text-sm text-blue-800 hover:underline">Volver al dashboard</Link></div>}
      {createOpen && <CreateFolderModal parentPath={currentPath} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); void load(); }} />}
      {addOpen && <AddFileModal folderPath={currentPath} onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); void load(); }} />}
      {renameTarget && <RenameModal item={renameTarget} onClose={() => setRenameTarget(null)} onDone={() => { setRenameTarget(null); void load(); }} />}
      {moveTarget && <MoveModal item={moveTarget} onClose={() => setMoveTarget(null)} onDone={() => { setMoveTarget(null); void load(); }} />}
    </div>
  );
}
export function MediatecaModal({
  open,
  onClose,
  onSelectImage,
  initialPath = "",
  allowPdfSelection = false,
}: {
  open: boolean;
  onClose: () => void;
  onSelectImage: (url: string, item?: Pick<MediatecaMedia, "id" | "name" | "type">) => void;
  initialPath?: string;
  allowPdfSelection?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Mediateca</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100">X</button>
        </div>
        <div className="overflow-auto p-6">
          <MediatecaBrowser
            picker
            initialPath={initialPath}
            allowPdfSelection={allowPdfSelection}
            onSelect={(url, item) => {
              onSelectImage(url, item);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
