import SalirContactoIcon from "@/app/gm/gmcomponents/svg/SalirContactoIcon";
import type { Account, Agent } from "./types";

type CuentaAgentesModalProps = {
  account: Account;
  agents: Agent[];
  selectedAgent: Agent | null;
  onAgentSelect: (agent: Agent) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function CuentaAgentesModal({
  account,
  agents,
  selectedAgent,
  onAgentSelect,
  onClose,
  onSave,
}: CuentaAgentesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl border border-gray-800 bg-[#164a75] px-2 pb-5">
        <div className="flex flex-row justify-between pt-2">
          <div className="text-sm font-semibold text-white">Agente de {account.nombre || account.nComercial || account.codigo}</div>
          <button type="button" onClick={onClose} className="h-8 w-8 border border-black bg-red-600 font-bold text-white">
            X
          </button>
        </div>

        <div className="flex flex-row items-stretch justify-start gap-5 overflow-x-auto bg-[#f3f5f7] p-5">
          <div className="flex w-[150px] shrink-0 flex-col items-stretch justify-start bg-white">
            <button
              type="button"
              onClick={onSave}
              disabled={!selectedAgent}
              className="flex items-center gap-2 border border-gray-300 bg-[#eef2f5] px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-xl transition hover:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <span>Aceptar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-auto flex items-center gap-2 border border-gray-300 bg-[#eef2f5] px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-xl transition hover:bg-white"
            >
              <SalirContactoIcon className="h-4 w-4 shrink-0" />
              <span>Salir</span>
            </button>
          </div>

          <div className="min-w-[520px] flex-1 overflow-hidden border border-slate-300 bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-r border-slate-300 bg-[#FC9A00] px-3 py-2 text-left font-semibold text-black">Codigo</th>
                  <th className="bg-[#FC9A00] px-3 py-2 text-left font-semibold text-black">Agente</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr
                    key={agent.codigo}
                    onClick={() => onAgentSelect(agent)}
                    className={`cursor-pointer border-b border-slate-200 ${
                      selectedAgent?.codigo === agent.codigo ? "bg-blue-100" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <td className="border-r border-slate-200 px-3 py-2 font-medium text-slate-800">{agent.codigo}</td>
                    <td className="px-3 py-2 text-slate-600">{agent.nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
