import EliminarContactoIcon from "@/app/gm/gmcomponents/svg/EliminarContactoIcon";
import ModificarContactoIcon from "@/app/gm/gmcomponents/svg/ModificarContactoIcon";
import NuevoContactoIcon from "@/app/gm/gmcomponents/svg/NuevoContactoIcon";
import SalirContactoIcon from "@/app/gm/gmcomponents/svg/SalirContactoIcon";
import type { Account, Contact } from "./types";

export type ContactEditableField = "name" | "charge" | "email" | "phone";

type CuentaContactosModalProps = {
  account: Account;
  contacts: Contact[];
  selectedContact: Contact | null;
  contactForm: Contact | null;
  onContactSelect: (contact: Contact) => void;
  onContactFieldChange: (field: ContactEditableField, value: string) => void;
  onNewContact: () => void;
  onEditContact: () => void;
  onDeleteContact: () => void;
  onClose: () => void;
  onSave: () => void;
};

const fields: Array<{ key: ContactEditableField; label: string }> = [
  { key: "name", label: "Nombre y Apellidos" },
  { key: "charge", label: "Cargo" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefono" },
];

export default function CuentaContactosModal({
  account,
  contacts,
  selectedContact,
  contactForm,
  onContactSelect,
  onContactFieldChange,
  onNewContact,
  onEditContact,
  onDeleteContact,
  onClose,
  onSave,
}: CuentaContactosModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`w-full border border-gray-800 bg-[#164a75] px-2 pb-5 ${contactForm ? "max-w-7xl" : "max-w-5xl"}`}>
        <div className="flex flex-row justify-between pt-2">
          <div className="text-sm font-semibold text-white">Contactos de {account.nombre}</div>
          <button type="button" onClick={onClose} className="h-8 w-8 border border-black bg-red-600 font-bold text-white">
            X
          </button>
        </div>

        <div className="flex flex-row items-stretch justify-start gap-5 overflow-x-auto bg-[#f3f5f7] p-5">
          <div className="flex w-[150px] shrink-0 flex-col items-stretch justify-start  bg-white ">
            <button
              type="button"
              onClick={onNewContact}
              className="flex items-center gap-2 border border-gray-300 bg-[#eef2f5] px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-xl transition hover:bg-white"
            >
              <NuevoContactoIcon className="h-4 w-4 shrink-0" />
              <span>Nuevo</span>
            </button>
            <button
              type="button"
              onClick={onEditContact}
              disabled={!selectedContact}
              className="flex items-center gap-2 border border-gray-300 bg-[#eef2f5] px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-xl transition hover:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <ModificarContactoIcon className="h-4 w-4 shrink-0" />
              <span>Modificar</span>
            </button>
            <button
              type="button"
              onClick={onDeleteContact}
              disabled={!selectedContact}
              className="flex items-center gap-2 border border-gray-300 bg-[#eef2f5] px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-xl transition hover:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <EliminarContactoIcon className="h-4 w-4 shrink-0" />
              <span>Eliminar</span>
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

          <div className="min-w-[620px] flex-1 overflow-hidden border border-slate-300 bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-r border-slate-300 bg-[#FC9A00] px-3 py-2 text-left font-semibold text-black">Nombre y Apellidos</th>
                  <th className="border-r border-slate-300 bg-[#FC9A00] px-3 py-2 text-left font-semibold text-black">Cargo</th>
                  <th className="border-r border-slate-300 bg-[#FC9A00] px-3 py-2 text-left font-semibold text-black">Email</th>
                  <th className="bg-[#FC9A00] px-3 py-2 text-left font-semibold text-black">Telefono</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr
                    key={contact.contactId}
                    onClick={() => onContactSelect(contact)}
                    className={`cursor-pointer border-b border-slate-200 ${
                      selectedContact?.contactId === contact.contactId ? "bg-blue-100" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <td className="border-r border-slate-200 px-3 py-2 font-medium text-slate-800">{contact.name}</td>
                    <td className="border-r border-slate-200 px-3 py-2 text-slate-600">{contact.charge}</td>
                    <td className="border-r border-slate-200 px-3 py-2 text-slate-600">{contact.email}</td>
                    <td className="px-3 py-2 text-slate-600">{contact.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {contactForm && (
            <div className="w-[360px] shrink-0 border border-slate-300 bg-white">
              <div className="border-b border-slate-300 bg-slate-400 px-4 py-2 text-sm font-semibold text-white">
                Datos del contacto
              </div>
              <div className="grid gap-px bg-slate-300">
                {fields.map((field) => (
                  <label key={field.key} className="grid grid-cols-[110px_minmax(0,1fr)] bg-white text-sm">
                    <span className="border-r border-slate-200 bg-[#eef2f5] px-3 py-2 font-medium text-slate-600">
                      {field.label}
                    </span>
                    <input
                      value={contactForm[field.key]}
                      onChange={(event) => onContactFieldChange(field.key, event.target.value)}
                      className="min-w-0 border-0 bg-white px-3 py-2 text-slate-700 outline-none"
                    />
                  </label>
                ))}
                <div className="flex justify-end gap-3 bg-white px-4 py-4">
                  <button type="button" onClick={onClose} className="border border-slate-400 bg-white px-4 py-2 text-sm">
                    Cancelar
                  </button>
                  <button type="button" onClick={onSave} className="border border-slate-700 bg-slate-700 px-4 py-2 text-sm text-white">
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
