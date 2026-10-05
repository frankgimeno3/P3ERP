"use client";
import TableFilters from '@/app/components/TableFilters';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MediatecaService } from "@/app/service/MediatecaService";
import apiClient from '@/app/apiClient';

export type MediatecaFolder = { id: string; name: string; path: string; allowedRoles?: string[] };
const protectedRoots = new Set(['contratos_firmados','documentos_administracion','documentos_direccion','documentos_produccion']);
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
  useEffect(() => { const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-100">×</button>
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

function EditFolderModal({ folder, onClose, onDone }: { folder: MediatecaFolder; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(folder.name);
  const [roles, setRoles] = useState<string[]>(folder.allowedRoles || []);
  const [roleInput, setRoleInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const commonRoles = ["base", "administracion", "operaciones", "superadmin"];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await MediatecaService.updateFolder(folder.id, { name, allowed_roles: roles });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se ha podido actualizar la carpeta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="Editar carpeta" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          Nombre de la carpeta
          <input autoFocus value={name} disabled={protectedRoots.has(folder.name) && !folder.path.includes('/')} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border p-2 disabled:bg-gray-100" />
        </label>
        
        <div className="text-sm">
          <label className="block mb-2 font-semibold">Roles permitidos</label>
          <div className="space-y-2 mb-3">
            {commonRoles.map((role) => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setRoles([...roles, role]);
                    } else {
                      setRoles(roles.filter(r => r !== role));
                    }
                  }}
                  className="cursor-pointer"
                />
                <span className="capitalize">{role}</span>
              </label>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              placeholder="Añadir rol personalizado"
              className="flex-1 rounded-lg border p-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (roleInput.trim() && !roles.includes(roleInput.trim())) {
                  setRoles([...roles, roleInput.trim()]);
                  setRoleInput("");
                }
              }}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
            >
              +
            </button>
          </div>

          {roles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {roles.map((role) => (
                <div key={role} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  {role}
                  <button
                    type="button"
                    onClick={() => setRoles(roles.filter(r => r !== role))}
                    className="ml-1 cursor-pointer hover:font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm">Cancelar</button>
          <button disabled={!name.trim() || saving} className="rounded-lg bg-blue-950 px-4 py-2 text-sm text-white disabled:opacity-50">Guardar</button>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MediatecaMedia | null>(null);
  const [moveTarget, setMoveTarget] = useState<MediatecaMedia | null>(null);
  const [editingFolder, setEditingFolder] = useState<MediatecaFolder | null>(null);
  const [canManageFolders, setCanManageFolders] = useState(false);
  const [trashId, setTrashId] = useState('');
  const [trashOpen,setTrashOpen]=useState(false);
  const [trashRows,setTrashRows]=useState<{id:string;deleted_at:string;folders_count:number;media_count:number}[]>([]);
  const [trashLoading,setTrashLoading]=useState(false),[restoring,setRestoring]=useState('');
  const loadVersion=useRef({version:0});

  async function openTrash(){setTrashOpen(true);setTrashLoading(true);try{const response=await apiClient.get('/api/v1/mediateca/papelera');setTrashRows(response.data);}catch(cause:any){setError(cause.message);}finally{setTrashLoading(false);}}
  async function restoreTrash(id:string){if(restoring)return;setRestoring(id);try{await apiClient.post('/api/v1/mediateca/papelera',{id});setTrashRows(rows=>rows.filter(row=>row.id!==id));if(id===trashId)setTrashId('');await load();}catch(cause:any){setError(cause.message);}finally{setRestoring('');}}

  useEffect(() => { apiClient.get('/api/v1/mediateca/access').then(response => setCanManageFolders(Boolean(response.data.canManageFolders))).catch(() => setCanManageFolders(false)); }, []);

  const currentPath = joinPath(segments);
  const currentFolderName = segments.length > 0 ? segments[segments.length - 1] : "raiz";
  const selected = media.find((item) => item.id === selectedId) || null;
  
  const filteredMedia = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? media.filter((item) => item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)) : media;
  }, [media, search]);

  const filteredFolders = useMemo(() => {
    const q = folderSearch.trim().toLowerCase();
    return q ? folders.filter((folder) => folder.name.toLowerCase().includes(q) || folder.path.toLowerCase().includes(q)) : folders;
  }, [folders, folderSearch]);

  const load=useCallback(async () => {
    const version=++loadVersion.current.version;
    setLoading(true);
    setError("");
    try {
      const [folderData, mediaData] = await Promise.all([
        MediatecaService.getFolders(currentPath),
        MediatecaService.getMedia({ folderPath: currentPath }),
      ]);
      if(version!==loadVersion.current.version)return;
      setFolders(Array.isArray(folderData) ? folderData : []);
      setMedia(Array.isArray(mediaData) ? mediaData : []);
      setSelectedId("");
    } catch (err: any) {
      if(version!==loadVersion.current.version)return;
      setError(err?.message || "No se ha podido cargar la mediateca.");
    } finally {
      if(version===loadVersion.current.version)setLoading(false);
    }
  },[currentPath]);

  useEffect(() => {
    const counter=loadVersion.current;
    void load();
    return()=>{counter.version++;};
  }, [load]);

  async function deleteFolder(folder: MediatecaFolder) {
    if (!window.confirm(`Eliminar la carpeta "${folder.name}" y todo su contenido?`)) return;
    try { const result=await MediatecaService.deleteFolder(folder.id);setTrashId(result.trashId);await load(); } catch (cause:any) {setError(cause.message);}
  }

  async function deleteMedia(item: MediatecaMedia) {
    if (!window.confirm(`Mover "${item.name}" a la papelera? El archivo se conserva y se puede restaurar.`)) return;
    try {const result=await MediatecaService.deleteMedia(item.id);setTrashId(result.trashId);await load();}catch(cause:any){setError(cause.message);}
  }

  const canUseSelection = selected && (selected.type === "image" || allowPdfSelection);

  return (
    <div className="space-y-5">
      {loading&&<p role="status" className="text-sm text-blue-950">Cargando mediateca…</p>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" disabled={loading} onClick={()=>void load()} className="rounded px-2 underline enabled:cursor-pointer enabled:hover:bg-red-100 disabled:opacity-50">Reintentar</button></div>}
      {trashId && <div role="status" className="rounded border bg-blue-50 p-3">Contenido conservado en la papelera. <button type="button" className="cursor-pointer underline hover:text-blue-950" onClick={async()=>{try{await apiClient.post('/api/v1/mediateca/papelera',{id:trashId});setTrashId('');await load();}catch(cause:any){setError(cause.message);}}}>Deshacer eliminación</button></div>}

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
          <button type="button" onClick={()=>void openTrash()} className="cursor-pointer rounded-lg border px-4 py-2 text-sm hover:bg-blue-50">Papelera</button>
          {canManageFolders && <button type="button" onClick={() => setCreateOpen(true)} className="cursor-pointer rounded-lg bg-blue-950 px-4 py-2 text-sm text-white hover:bg-blue-900">Crear carpeta</button>}
          <button type="button" onClick={() => setAddOpen(true)} className="rounded-lg border border-blue-950 px-4 py-2 text-sm text-blue-950">Añadir archivo</button>
        </div>
        <TableFilters><label className="block text-xs text-gray-600"><span className="mb-1 block">Buscar archivo</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar archivo..." className="w-64 rounded-lg border p-2 text-sm" /></label></TableFilters>
      </div>

      <section>
        <h2 className="mb-3 font-semibold">Sub-carpetas dentro de la carpeta actual ({currentFolderName})</h2>
        <div className="mb-3">
          <TableFilters><label className="block text-xs text-gray-600"><span className="mb-1 block">Buscar carpeta</span><input
            value={folderSearch}
            onChange={(event) => setFolderSearch(event.target.value)}
            placeholder="Buscar carpetas..."
            className="w-full rounded-lg border p-2 text-sm"
          /></label></TableFilters>
        </div>
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
              {filteredFolders.map((folder) => (
                <tr key={folder.id} className="border-t hover:bg-blue-50">
                  <td className="p-3">
                    <button type="button" className="font-medium text-blue-800 hover:underline" onClick={() => setSegments(splitPath(folder.path))}>
                      {folder.name}
                    </button>
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-500">{folder.path}</td>
                  {!picker && (
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canManageFolders && <button
                          type="button"
                          onClick={() => setEditingFolder(folder)}
                          className="rounded bg-blue-100 px-3 py-1 text-xs text-blue-800 hover:bg-blue-200"
                        >
                          Editar
                        </button>}
                        {canManageFolders && !(protectedRoots.has(folder.name) && !folder.path.includes('/')) && <button type="button" onClick={() => void deleteFolder(folder)} className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100">Eliminar</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && filteredFolders.length === 0 && <tr><td colSpan={picker ? 2 : 3} className="p-4 text-center text-gray-400">Sin carpetas.</td></tr>}
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
      {trashOpen&&<ModalFrame title="Papelera recuperable" onClose={()=>setTrashOpen(false)}><div className="max-h-96 space-y-3 overflow-auto">{trashLoading?<p role="status">Cargando papelera…</p>:trashRows.length?trashRows.map(row=><div key={row.id} className="rounded border p-3"><p>{new Date(row.deleted_at).toLocaleString('es-ES')} · {row.media_count} archivos · {row.folders_count} carpetas</p><button type="button" disabled={Boolean(restoring)||(!canManageFolders&&row.folders_count>0)} onClick={()=>void restoreTrash(row.id)} className="mt-2 rounded border px-3 py-1 enabled:cursor-pointer enabled:hover:bg-blue-100 disabled:cursor-default disabled:opacity-50">{restoring===row.id?'Restaurando…':'Restaurar'}</button>{!canManageFolders&&row.folders_count>0&&<p className="text-sm">La restauración de carpetas requiere permiso de operaciones.</p>}</div>):<p>No hay eliminaciones pendientes.</p>}</div></ModalFrame>}
      {createOpen && <CreateFolderModal parentPath={currentPath} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); void load(); }} />}
      {addOpen && <AddFileModal folderPath={currentPath} onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); void load(); }} />}
      {renameTarget && <RenameModal item={renameTarget} onClose={() => setRenameTarget(null)} onDone={() => { setRenameTarget(null); void load(); }} />}
      {moveTarget && <MoveModal item={moveTarget} onClose={() => setMoveTarget(null)} onDone={() => { setMoveTarget(null); void load(); }} />}
      {editingFolder && <EditFolderModal folder={editingFolder} onClose={() => setEditingFolder(null)} onDone={() => { setEditingFolder(null); void load(); }} />}
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
  useEffect(() => { if (!open) return; const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler); }, [open,onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Mediateca</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-100">×</button>
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
