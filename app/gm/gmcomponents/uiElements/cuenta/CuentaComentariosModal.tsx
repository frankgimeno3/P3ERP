import type { Account } from "./types";

type CuentaComentariosModalProps = {
  account: Account;
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function CuentaComentariosModal({
  account,
  commentDraft,
  onCommentDraftChange,
  onClose,
  onSave,
}: CuentaComentariosModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl border border-gray-800 bg-[#164a75] px-2 pb-5">
        <div className="flex flex-row justify-between pt-2">
          <div className="text-sm font-semibold text-white">Comentarios</div>
          <button type="button" onClick={onClose} className="h-8 w-8 border border-black bg-red-600 font-bold text-white">
            X
          </button>
        </div>

        <div className="bg-[#f3f5f7] p-5">
          <div className="border border-slate-300 bg-white">
            <div className="border-b border-slate-300 bg-slate-400 px-4 py-2 text-sm font-semibold text-white">
              {account.nombre}
            </div>
            <textarea
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(event.target.value)}
              className="max-h-[50vh] min-h-64 w-full border-0 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
              placeholder="Escribe comentarios para esta cuenta"
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="border border-slate-400 bg-white px-4 py-2 text-sm">
              Cancelar
            </button>
            <button type="button" onClick={onSave} className="border border-slate-700 bg-slate-700 px-4 py-2 text-sm text-white">
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
