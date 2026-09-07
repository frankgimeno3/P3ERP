"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Tarjeta {
  id_tarjeta: string;
  ultimos_digitos: string;
  nombre: string;
  banco: string;
  tipo: "p3" | "personal";
  estado: "activa" | "obsoleta";
}

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCard?: (card: Tarjeta) => void;
}

type ModalPhase = "list" | "edit" | "add";
type TabType = "p3" | "personal";

export default function CardModal({ isOpen, onClose, onSelectCard }: CardModalProps) {
  const [phase, setPhase] = useState<ModalPhase>("list");
  const [currentTab, setCurrentTab] = useState<TabType>("p3");
  const [cards, setCards] = useState<Tarjeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingCard, setEditingCard] = useState<Tarjeta | null>(null);
  const [newCard, setNewCard] = useState({
    ultimos_digitos: "",
    nombre: "",
    banco: "",
    tipo: "p3" as const,
    estado: "activa" as const,
  });

  // Load cards
  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/tarjetas");
      if (!res.ok) throw new Error("No se pudieron cargar las tarjetas");
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Error al cargar las tarjetas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadCards();
  }, [isOpen, loadCards]);

  // Filter cards by current tab
  const filteredCards = useMemo(
    () => cards.filter((c) => c.tipo === currentTab),
    [cards, currentTab]
  );

  // Handle keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [isOpen, onClose]);

  // Handle save new card
  const handleSaveCard = async () => {
    if (!newCard.ultimos_digitos || !newCard.nombre || !newCard.banco) {
      setError("Por favor rellena todos los campos");
      return;
    }

    try {
      const method = editingCard ? "PUT" : "POST";
      const url = editingCard
        ? `/api/v1/admin/tarjetas/${editingCard.id_tarjeta}`
        : "/api/v1/admin/tarjetas";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingCard ? { id_tarjeta: editingCard.id_tarjeta } : {}),
          ultimos_digitos: newCard.ultimos_digitos,
          nombre: newCard.nombre,
          banco: newCard.banco,
          tipo: newCard.tipo,
          estado: newCard.estado,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar la tarjeta");
      await loadCards();
      setPhase("list");
      setNewCard({
        ultimos_digitos: "",
        nombre: "",
        banco: "",
        tipo: "p3",
        estado: "activa",
      });
      setEditingCard(null);
      setError("");
    } catch (err: any) {
      setError(err.message || "Error al guardar la tarjeta");
    }
  };

  // Handle delete card
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarjeta?")) return;

    try {
      const res = await fetch(`/api/v1/admin/tarjetas/${cardId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar la tarjeta");
      await loadCards();
      setError("");
    } catch (err: any) {
      setError(err.message || "Error al eliminar la tarjeta");
    }
  };

  // Handle edit card
  const handleEditCard = (card: Tarjeta) => {
    setEditingCard(card);
    setNewCard({
      ultimos_digitos: card.ultimos_digitos,
      nombre: card.nombre,
      banco: card.banco,
      tipo: card.tipo,
      estado: card.estado,
    });
    setPhase("edit");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded shadow-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-blue-950 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {phase === "list" && "Tarjetas"}
            {phase === "edit" && (editingCard ? "Editar Tarjeta" : "Nueva Tarjeta")}
            {phase === "add" && "Nueva Tarjeta"}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none cursor-pointer hover:opacity-75"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Phase: List */}
          {phase === "list" && (
            <>
              {/* Tabs */}
              <div className="mb-4 flex border-b">
                {["p3", "personal"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCurrentTab(tab as TabType)}
                    className={`px-4 py-2 border-b-2 transition ${
                      currentTab === tab
                        ? "border-blue-950 text-blue-950 font-semibold"
                        : "border-transparent text-gray-500"
                    }`}
                  >
                    {tab === "p3" ? "P3" : "Personales"}
                  </button>
                ))}
              </div>

              {/* Add Button */}
              <button
                onClick={() => {
                  setNewCard({
                    ultimos_digitos: "",
                    nombre: "",
                    banco: "",
                    tipo: currentTab,
                    estado: "activa",
                  });
                  setEditingCard(null);
                  setPhase("add");
                }}
                className="mb-4 px-4 py-2 bg-blue-950 text-white rounded cursor-pointer hover:bg-blue-800"
              >
                Añadir
              </button>

              {/* Cards Table */}
              {loading ? (
                <div className="text-center py-8 text-gray-500">Cargando...</div>
              ) : filteredCards.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay tarjetas {currentTab === "p3" ? "de P3" : "personales"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left">Nombre</th>
                        <th className="p-3 text-left">Banco</th>
                        <th className="p-3 text-left">Últimos dígitos</th>
                        <th className="p-3 text-left">Estado</th>
                        <th className="p-3 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCards.map((card) => (
                        <tr key={card.id_tarjeta} className="border-t hover:bg-gray-50">
                          <td className="p-3">{card.nombre}</td>
                          <td className="p-3">{card.banco}</td>
                          <td className="p-3">****{card.ultimos_digitos}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                card.estado === "activa"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {card.estado === "activa" ? "Activa" : "Obsoleta"}
                            </span>
                          </td>
                          <td className="p-3 flex gap-2">
                            <button
                              onClick={() => handleEditCard(card)}
                              className="text-blue-700 cursor-pointer hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteCard(card.id_tarjeta)}
                              className="text-red-700 cursor-pointer hover:underline"
                            >
                              Borrar
                            </button>
                            {onSelectCard && (
                              <button
                                onClick={() => {
                                  onSelectCard(card);
                                  onClose();
                                }}
                                className="text-green-700 cursor-pointer hover:underline"
                              >
                                Seleccionar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Phase: Add/Edit */}
          {(phase === "add" || phase === "edit") && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveCard();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Últimos 4 dígitos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={newCard.ultimos_digitos}
                  onChange={(e) =>
                    setNewCard({ ...newCard, ultimos_digitos: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nombre de la tarjeta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCard.nombre}
                  onChange={(e) =>
                    setNewCard({ ...newCard, nombre: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Banco <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCard.banco}
                  onChange={(e) =>
                    setNewCard({ ...newCard, banco: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCard.tipo}
                    onChange={(e) =>
                      setNewCard({ ...newCard, tipo: e.target.value as "p3" | "personal" })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    required
                  >
                    <option value="p3">P3</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCard.estado}
                    onChange={(e) =>
                      setNewCard({ ...newCard, estado: e.target.value as "activa" | "obsoleta" })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                    required
                  >
                    <option value="activa">Activa</option>
                    <option value="obsoleta">Obsoleta</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("list");
                    setEditingCard(null);
                  }}
                  className="px-4 py-2 bg-gray-400 text-white rounded cursor-pointer hover:bg-gray-500"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
