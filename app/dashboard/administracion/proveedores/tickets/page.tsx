"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import MiddleNav from "@/app/general_components/componentes_recurrentes/MiddleNav";
import CardModal from "@/app/general_components/CardModal";

type TabType = "P3" | "GM";

export default function TicketsProveedoresPage() {
  const [p3Rows, setP3Rows] = useState<any[]>([]);
  const [gmRows, setGmRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [currentTab, setCurrentTab] = useState<TabType>("P3");
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load tickets
  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoading(true);
        const [p3Res, gmRes] = await Promise.all([
          fetch("/api/v1/admin/tickets?ambito=P3"),
          fetch("/api/v1/admin/tickets?ambito=GM"),
        ]);
        const p3Data = await p3Res.json();
        const gmData = await gmRes.json();
        setP3Rows(Array.isArray(p3Data) ? p3Data : []);
        setGmRows(Array.isArray(gmData) ? gmData : []);
      } catch (err) {
        console.error("Error cargando tickets:", err);
      } finally {
        setLoading(false);
      }
    };
    loadTickets();
  }, []);

  const currentRows = currentTab === "P3" ? p3Rows : gmRows;

  // Filter by search
  const shown = useMemo(
    () =>
      currentRows.filter(
        (row) =>
          !filter.trim() ||
          Object.values(row)
            .join(" ")
            .toLowerCase()
            .includes(filter.toLowerCase())
      ),
    [currentRows, filter]
  );

  const getColumns = () => {
    if (currentTab === "P3") {
      return ["ID", "Fecha", "Proveedor", "Base imponible", "Total", "Forma de pago", "Archivo"];
    } else {
      return ["ID", "Fecha", "Proveedor", "Importe", "Forma de pago", "Archivo"];
    }
  };

  const renderRow = (row: any) => {
    if (currentTab === "P3") {
      return (
        <>
          <td className="p-3">{row.id_ticket}</td>
          <td className="p-3">{row.fecha_ticket}</td>
          <td className="p-3">{row.proveedor}</td>
          <td className="p-3">{Number(row.base_imponible || 0).toFixed(2)} €</td>
          <td className="p-3">{Number(row.importe_total).toFixed(2)} €</td>
          <td className="p-3">{row.forma_pago}</td>
          <td className="p-3">
            <a
              href={row.documento_src}
              target="_blank"
              className="cursor-pointer text-blue-700 underline hover:text-blue-950"
            >
              Ver PDF
            </a>
          </td>
        </>
      );
    } else {
      return (
        <>
          <td className="p-3">{row.id_ticket}</td>
          <td className="p-3">{row.fecha_ticket}</td>
          <td className="p-3">{row.proveedor}</td>
          <td className="p-3">{Number(row.importe).toFixed(2)} €</td>
          <td className="p-3">{row.forma_pago}</td>
          <td className="p-3">
            <a
              href={row.documento_src}
              target="_blank"
              className="cursor-pointer text-blue-700 underline hover:text-blue-950"
            >
              Ver PDF
            </a>
          </td>
        </>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-700">
      <MiddleNav tituloprincipal="Tickets proveedores" />
      <main className="px-6 py-10 lg:px-12">
        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b">
          {(["P3", "GM"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-4 py-2 border-b-2 transition font-semibold ${
                currentTab === tab
                  ? "border-blue-950 text-blue-950"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search and Action Buttons */}
        <div className="mb-6 flex flex-wrap justify-between gap-3">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar tickets..."
            className="w-full rounded border bg-white px-3 py-2 sm:w-96"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setCardModalOpen(true)}
              className="cursor-pointer rounded bg-purple-600 px-5 py-2 text-white transition hover:bg-purple-700"
            >
              Tarjetas
            </button>
            <Link
              href={
                currentTab === "P3"
                  ? "/dashboard/administracion/proveedores/tickets/anadir"
                  : "/dashboard/administracion/proveedores/tickets/anadir?ambito=GM"
              }
              className="cursor-pointer rounded bg-blue-950 px-5 py-2 text-white transition hover:bg-blue-800"
            >
              Añadir ticket
            </Link>
          </div>
        </div>

        {/* Tickets Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando tickets...</div>
        ) : (
          <div className="overflow-x-auto bg-white shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-950 text-white">
                <tr>
                  {getColumns().map((x) => (
                    <th key={x} className="p-3 text-left">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr
                    key={row.id_ticket}
                    className="border-b transition hover:bg-blue-50"
                  >
                    {renderRow(row)}
                  </tr>
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={getColumns().length} className="p-8 text-center text-gray-500">
                      No hay tickets en esta pestaña.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Card Modal */}
      <CardModal isOpen={cardModalOpen} onClose={() => setCardModalOpen(false)} />
    </div>
  );
}
