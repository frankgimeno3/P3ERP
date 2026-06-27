"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import commentsData from "@/app/gm/gmcomponents/contents/comments.json";
import contactsData from "@/app/gm/gmcomponents/contents/contacts.json";
import GuardarIcon from "@/app/gm/gmcomponents/svg/GuardarIcon";
import SalirBarraIcon from "@/app/gm/gmcomponents/svg/SalirBarraIcon";
import CuentaComentariosModal from "./CuentaComentariosModal";
import CuentaContactosModal, { type ContactEditableField } from "./CuentaContactosModal";
import CuentaFormulario from "./CuentaFormulario";
import CuentaShell from "./CuentaShell";
import CuentaTabs from "./CuentaTabs";
import type { Account, Comment, Contact, TabKey } from "./types";

type CuentaDetalleProps = {
  cuenta: Account;
};

export default function CuentaDetalle({ cuenta }: CuentaDetalleProps) {
  const router = useRouter();
  const [account, setAccount] = useState<Account>(cuenta);
  const [activeTab, setActiveTab] = useState<TabKey>("principal");
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState(
    () => (commentsData as Comment[]).find((item) => item.codigo === cuenta.codigo)?.fullComments ?? "",
  );
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState<Contact | null>(null);

  const comments = useMemo(
    () => (commentsData as Comment[]).filter((item) => item.codigo === account.codigo),
    [account.codigo],
  );

  const contacts = useMemo(
    () => (contactsData as Contact[]).filter((item) => item.codigo === account.codigo),
    [account.codigo],
  );

  const openComments = useCallback(() => {
    const storedComment = window.localStorage.getItem(`comment-${account.codigo}`);
    const initialComment = comments[0]?.fullComments ?? "";
    setCommentDraft(storedComment ?? initialComment);
    setActiveTab("comments");
    setIsCommentsOpen(true);
    setIsContactsOpen(false);
    setSelectedContact(null);
    setContactForm(null);
  }, [account.codigo, comments]);

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
        setSelectedContact(null);
        setContactForm(null);
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
    setSelectedContact(null);
    setContactForm(null);
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

  const handleCommentSave = () => {
    window.localStorage.setItem(`comment-${account.codigo}`, commentDraft);
    setActiveTab("principal");
    setIsCommentsOpen(false);
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setContactForm({ ...contact });
  };

  const handleNewContact = () => {
    const nextContactId = Math.max(0, ...contacts.map((contact) => contact.contactId)) + 1;
    const newContact: Contact = {
      contactId: nextContactId,
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
    if (!selectedContact) {
      return;
    }

    setContactForm({ ...selectedContact });
  };

  const handleDeleteContact = () => {
    if (!selectedContact) {
      return;
    }

    window.localStorage.removeItem(`contact-${selectedContact.contactId}`);
    setSelectedContact(null);
    setContactForm(null);
  };

  const handleContactFieldChange = (field: ContactEditableField, value: string) => {
    setContactForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleContactSave = () => {
    if (!contactForm) {
      return;
    }

    window.localStorage.setItem(`contact-${contactForm.contactId}`, JSON.stringify(contactForm));
    setSelectedContact(contactForm);
    setActiveTab("principal");
    setIsContactsOpen(false);
  };

  return (
    <CuentaShell>
      <div className="flex flex-row bg-[#f3f5f7] px-8 pt-5 justify-between border ">
        <div className="flex flex-row items-center gap-2 cursor-pointer hover:shadow-xl p-5 mb-5 ">
          <GuardarIcon className="h-6 w-6 shrink-0" />
          <p>Guardar</p>
        </div>
        <div
          className="flex flex-row items-center gap-2 cursor-pointer hover:shadow-xl p-5 mb-5 "
          onClick={() => router.push("/")}
        >
          <SalirBarraIcon className="h-6 w-6 shrink-0 text-slate-800" />
          <p>Salir</p>
        </div>
      </div>
      <CuentaTabs activeTab={activeTab} onTabChange={handleTabChange} />
      <CuentaFormulario account={account} onFieldChange={handleFieldChange} />

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
    </CuentaShell>
  );
}
