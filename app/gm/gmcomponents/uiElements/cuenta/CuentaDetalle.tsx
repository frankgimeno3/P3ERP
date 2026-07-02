"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GmService } from "@/app/service/GmService";
import GuardarIcon from "@/app/gm/gmcomponents/svg/GuardarIcon";
import SalirBarraIcon from "@/app/gm/gmcomponents/svg/SalirBarraIcon";
import CuentaAgentesModal from "./CuentaAgentesModal";
import CuentaComentariosModal from "./CuentaComentariosModal";
import CuentaContactosModal, { type ContactEditableField } from "./CuentaContactosModal";
import CuentaFormulario from "./CuentaFormulario";
import CuentaShell from "./CuentaShell";
import CuentaTabs from "./CuentaTabs";
import type { Account, Agent, Contact, TabKey } from "./types";

type CuentaDetalleProps = {
  cuenta: Account;
  contactos?: Contact[];
  agentes?: Agent[];
  isNew?: boolean;
};

export default function CuentaDetalle({ cuenta, contactos = [], agentes = [], isNew = false }: CuentaDetalleProps) {
  const router = useRouter();
  const [account, setAccount] = useState<Account>(cuenta);
  const [activeTab, setActiveTab] = useState<TabKey>("principal");
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isAgentsOpen, setIsAgentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState(cuenta.comentarios_gm ?? "");
  const [contacts, setContacts] = useState<Contact[]>(contactos);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState<Contact | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const agents = agentes;

  const openComments = useCallback(() => {
    setCommentDraft(account.comentarios_gm ?? "");
    setActiveTab("comments");
    setIsCommentsOpen(true);
    setIsContactsOpen(false);
    setSelectedContact(null);
    setContactForm(null);
  }, [account.comentarios_gm]);

  const saveCuenta = async (nextAccount = account, nextContacts = contacts) => {
    try {
      setSaving(true);
      setFeedback("");
      const result = await GmService.saveCuenta(nextAccount, nextContacts, isNew);
      setAccount(result.cuenta);
      setContacts(result.contactos || []);
      setCommentDraft(result.cuenta.comentarios_gm || "");
      setFeedback("Guardado");
      if (isNew) {
        router.replace(`/gm/cuentas/${result.cuenta.codigo}`);
      }
      return result;
    } catch (err) {
      console.error("Error saving GM cuenta:", err);
      setFeedback("No se ha podido guardar");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleCommentStamp = () => {
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
    const stamp = `${formattedDate} - GIMENO:`;

    setCommentDraft((current) => `${stamp}${current ? `\n\n${current}` : ""}`);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveTab("principal");
        setIsCommentsOpen(false);
        setIsContactsOpen(false);
        setIsAgentsOpen(false);
        setSelectedContact(null);
        setContactForm(null);
        setSelectedAgent(null);
      }

      if (event.key === "F2" && isCommentsOpen) {
        event.preventDefault();
        handleCommentStamp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommentsOpen]);

  const closeOverlays = () => {
    setActiveTab("principal");
    setIsCommentsOpen(false);
    setIsContactsOpen(false);
    setIsAgentsOpen(false);
    setSelectedContact(null);
    setContactForm(null);
    setSelectedAgent(null);
  };

  const handleFieldChange = (key: keyof Account, value: string) => {
    setAccount((current) => ({ ...current, [key]: value }));
  };

  const handleTabChange = (tabKey: TabKey | "disabled") => {
    if (tabKey === "principal") {
      setActiveTab("principal");
      closeOverlays();
      return;
    }

    if (tabKey === "comments") {
      openComments();
      return;
    }

    if (tabKey === "contacts") {
      setActiveTab("contacts");
      setIsCommentsOpen(false);
      setIsContactsOpen(true);
      setSelectedContact(null);
      setContactForm(null);
    }
  };

  const handleCommentSave = async () => {
    const nextAccount = { ...account, comentarios_gm: commentDraft };
    setAccount(nextAccount);
    await saveCuenta(nextAccount, contacts);
    setActiveTab("principal");
    setIsCommentsOpen(false);
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setContactForm({ ...contact });
  };

  const handleNewContact = () => {
    const newContact: Contact = {
      contactId: `nuevo-${Date.now()}`,
      codigo: account.codigo,
      name: "",
      charge: "",
      email: "",
      phone: "",
    };

    setSelectedContact(null);
    setContactForm(newContact);
  };

  const handleEditContact = () => {
    if (!selectedContact) return;
    setContactForm({ ...selectedContact });
  };

  const handleDeleteContact = async () => {
    if (!selectedContact) return;

    if (!String(selectedContact.contactId).startsWith("nuevo-")) {
      await GmService.deleteContacto(account.codigo, selectedContact.contactId);
    }

    setContacts((current) => current.filter((contact) => contact.contactId !== selectedContact.contactId));
    setSelectedContact(null);
    setContactForm(null);
  };

  const handleContactFieldChange = (field: ContactEditableField, value: string) => {
    setContactForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleContactSave = async () => {
    if (!contactForm) return;

    const nextContacts = contacts.some((contact) => contact.contactId === contactForm.contactId)
      ? contacts.map((contact) => contact.contactId === contactForm.contactId ? contactForm : contact)
      : [...contacts, contactForm];

    setContacts(nextContacts);
    setSelectedContact(contactForm);
    await saveCuenta(account, nextContacts);
    setActiveTab("principal");
    setIsContactsOpen(false);
  };

  const handleOpenAgents = () => {
    const currentAgent = agents.find((agent) => agent.codigo === account.codigoAgente || agent.nombre === (account.nombreAgente ?? account.agente));
    setSelectedAgent(currentAgent ?? null);
    setIsAgentsOpen(true);
    setIsCommentsOpen(false);
    setIsContactsOpen(false);
  };

  const handleAgentSave = () => {
    if (!selectedAgent) return;

    setAccount((current) => ({
      ...current,
      codigoAgente: selectedAgent.codigo,
      nombreAgente: selectedAgent.nombre,
      agente: selectedAgent.nombre,
    }));
    setIsAgentsOpen(false);
  };

  return (
    <CuentaShell>
      <div className="flex flex-row bg-[#f3f5f7] px-8 pt-5 justify-between border ">
        <button
          type="button"
          disabled={saving}
          onClick={() => saveCuenta()}
          className="flex flex-row items-center gap-2 cursor-pointer hover:shadow-xl p-5 mb-5 disabled:opacity-50"
        >
          <GuardarIcon className="h-6 w-6 shrink-0" />
          <p>{saving ? "Guardando" : "Guardar"}</p>
          {feedback && <span className="text-xs text-slate-500">{feedback}</span>}
        </button>
        <div
          className="flex flex-row items-center gap-2 cursor-pointer hover:shadow-xl p-5 mb-5 "
          onClick={() => router.push("/gm")}
        >
          <SalirBarraIcon className="h-6 w-6 shrink-0 text-slate-800" />
          <p>Salir</p>
        </div>
      </div>
      <CuentaTabs activeTab={activeTab} onTabChange={handleTabChange} />
      <CuentaFormulario account={account} onFieldChange={handleFieldChange} onOpenAgents={handleOpenAgents} />

      {isCommentsOpen && (
        <CuentaComentariosModal
          account={account}
          commentDraft={commentDraft}
          onCommentDraftChange={setCommentDraft}
          onClose={closeOverlays}
          onSave={handleCommentSave}
        />
      )}

      {isContactsOpen && (
        <CuentaContactosModal
          account={account}
          contacts={contacts}
          selectedContact={selectedContact}
          contactForm={contactForm}
          onContactSelect={handleContactSelect}
          onContactFieldChange={handleContactFieldChange}
          onNewContact={handleNewContact}
          onEditContact={handleEditContact}
          onDeleteContact={handleDeleteContact}
          onClose={closeOverlays}
          onSave={handleContactSave}
        />
      )}

      {isAgentsOpen && (
        <CuentaAgentesModal
          account={account}
          agents={agents}
          selectedAgent={selectedAgent}
          onAgentSelect={setSelectedAgent}
          onClose={closeOverlays}
          onSave={handleAgentSave}
        />
      )}
    </CuentaShell>
  );
}
