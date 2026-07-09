"use client";

import { useEffect } from "react";

const overlaySelector = "div.fixed.inset-0";
const closeWords = new Set(["x", "×", "✕", "✖", "cerrar", "cancelar", "salir", "volver"]);

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
}

function getModalOverlays() {
  return Array.from(document.querySelectorAll<HTMLElement>(overlaySelector))
    .filter(isVisible)
    .sort((left, right) => {
      const leftZ = Number.parseInt(window.getComputedStyle(left).zIndex, 10) || 0;
      const rightZ = Number.parseInt(window.getComputedStyle(right).zIndex, 10) || 0;
      return leftZ - rightZ;
    });
}

function findExistingCloseButton(overlay: HTMLElement) {
  const buttons = Array.from(overlay.querySelectorAll<HTMLButtonElement>("button:not([data-global-modal-close])"));
  return buttons.find((button) => {
    const label = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`.trim().toLowerCase();
    const text = (button.textContent || "").trim().toLowerCase();
    return label.includes("cerrar") || label.includes("close") || closeWords.has(text);
  }) || buttons.find((button) => (
    button.classList.contains("absolute")
    && (button.className.includes("right-") || button.style.right)
    && (button.className.includes("top-") || button.style.top)
  ));
}

function hasVisibleXButton(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLButtonElement>("button")).some((button) => {
    const label = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""}`.toLowerCase();
    const text = (button.textContent || "").trim().toLowerCase();
    return label.includes("cerrar") || label.includes("close") || ["x", "×", "✕", "✖"].includes(text);
  });
}

function closeModal(overlay: HTMLElement) {
  const existing = findExistingCloseButton(overlay);
  if (existing) {
    existing.click();
    return;
  }

  overlay.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}

function prepareModal(overlay: HTMLElement) {
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("data-modal-overlay", "");

  const panel = Array.from(overlay.children).find((child): child is HTMLElement => child instanceof HTMLElement);
  if (!panel || panel.querySelector("[data-global-modal-close]") || hasVisibleXButton(panel)) return;

  if (window.getComputedStyle(panel).position === "static") panel.style.position = "relative";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("data-global-modal-close", "");
  closeButton.setAttribute("aria-label", "Cerrar modal");
  closeButton.title = "Cerrar";
  closeButton.textContent = "×";
  closeButton.className = "global-modal-close";
  closeButton.addEventListener("click", () => closeModal(overlay));
  panel.appendChild(closeButton);
}

export default function ModalDismissManager() {
  useEffect(() => {
    const prepareAll = () => getModalOverlays().forEach(prepareModal);
    prepareAll();

    const observer = new MutationObserver(prepareAll);
    observer.observe(document.body, { childList: true, subtree: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const overlays = getModalOverlays();
      const topModal = overlays.at(-1);
      if (!topModal) return;
      event.preventDefault();
      event.stopPropagation();
      closeModal(topModal);
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
