"use client";

const copy = {
  es: {
    proposal: "Propuesta de servicios publicitarios",
    general: "1. Datos generales",
    services: "2. Servicios",
    payments: "3. Pagos",
    comments: "Comentarios adicionales",
    commentsPlaceholder:
      "Añade observaciones, condiciones o aclaraciones para la propuesta...",
    agreement: "4. En acuerdo",
    account: "Cuenta",
    contact: "Contacto",
    title: "Título",
    created: "Fecha de creación",
    expires: "Fecha de expiración",
    service: "Servicio",
    description: "Descripción",
    specs: "Especificaciones",
    units: "Unidades",
    unitPrice: "Precio unitario",
    discount: "Descuento",
    serviceTotal: "Total servicio",
    subtotal: "Subtotal",
    taxBase: "Base imponible",
    tax: "IVA",
    total: "Total",
    agent: "Agente",
    signer: "Contacto firmante",
    signature: "Firma",
    exchange: "Condiciones del intercambio",
    paymentDate: "Fecha",
    method: "Método",
    bank: "Banco",
    amount: "Importe",
  },
  en: {
    proposal: "Advertising services proposal",
    general: "1. General information",
    services: "2. Services",
    payments: "3. Payments",
    comments: "Additional comments",
    commentsPlaceholder:
      "Add observations, terms or clarifications for the proposal...",
    agreement: "4. Agreement",
    account: "Account",
    contact: "Contact",
    title: "Title",
    created: "Creation date",
    expires: "Expiration date",
    service: "Service",
    description: "Description",
    specs: "Specifications",
    units: "Units",
    unitPrice: "Unit price",
    discount: "Discount",
    serviceTotal: "Service total",
    subtotal: "Subtotal",
    taxBase: "Tax base",
    tax: "Tax",
    total: "Total",
    agent: "Agent",
    signer: "Signing contact",
    signature: "Signature",
    exchange: "Exchange terms",
    paymentDate: "Date",
    method: "Method",
    bank: "Bank",
    amount: "Amount",
  },
  it: {
    proposal: "Proposta di servizi pubblicitari",
    general: "1. Dati generali",
    services: "2. Servizi",
    payments: "3. Pagamenti",
    comments: "Commenti aggiuntivi",
    commentsPlaceholder:
      "Aggiungi osservazioni, condizioni o chiarimenti alla proposta...",
    agreement: "4. Accordo",
    account: "Azienda",
    contact: "Contatto",
    title: "Titolo",
    created: "Data di creazione",
    expires: "Data di scadenza",
    service: "Servizio",
    description: "Descrizione",
    specs: "Specifiche",
    units: "Unità",
    unitPrice: "Prezzo unitario",
    discount: "Sconto",
    serviceTotal: "Totale servizio",
    subtotal: "Subtotale",
    taxBase: "Base imponibile",
    tax: "IVA",
    total: "Totale",
    agent: "Agente",
    signer: "Contatto firmatario",
    signature: "Firma",
    exchange: "Condizioni dello scambio",
    paymentDate: "Data",
    method: "Metodo",
    bank: "Banca",
    amount: "Importo",
  },
  pt: {
    proposal: "Proposta de serviços publicitários",
    general: "1. Dados gerais",
    services: "2. Serviços",
    payments: "3. Pagamentos",
    comments: "Comentários adicionais",
    commentsPlaceholder:
      "Adicione observações, condições ou esclarecimentos à proposta...",
    agreement: "4. Acordo",
    account: "Conta",
    contact: "Contacto",
    title: "Título",
    created: "Data de criação",
    expires: "Data de validade",
    service: "Serviço",
    description: "Descrição",
    specs: "Especificações",
    units: "Unidades",
    unitPrice: "Preço unitário",
    discount: "Desconto",
    serviceTotal: "Total do serviço",
    subtotal: "Subtotal",
    taxBase: "Base tributável",
    tax: "IVA",
    total: "Total",
    agent: "Agente",
    signer: "Contacto signatário",
    signature: "Assinatura",
    exchange: "Condições da troca",
    paymentDate: "Data",
    method: "Método",
    bank: "Banco",
    amount: "Montante",
  },
} as const;

function money(value: unknown) {
  return `${Number(value || 0).toFixed(2)} €`;
}
function lineTotal(line: any) {
  if (line.modo_precio === "gratis" || line.modo_precio === "tachado") return 0;
  if (line.modo_precio === "personalizado")
    return Number(line.precio_total_personalizado || 0);
  return (
    Number(line.precio_unitario || 0) *
    Number(line.unidades || 1) *
    (1 - Number(line.descuento_producto || 0) / 100)
  );
}

export default function PropuestaPreview({
  propuesta,
  agentes = [],
  servicios = [],
  editableAgent = false,
  onAgentChange,
  editableComments = false,
  onCommentsChange,
}: {
  propuesta: any;
  agentes?: any[];
  servicios?: any[];
  editableAgent?: boolean;
  onAgentChange?: (id: string) => void;
  editableComments?: boolean;
  onCommentsChange?: (value: string) => void;
}) {
  const language = (
    ["es", "en", "it", "pt"].includes(propuesta.idioma_propuesta)
      ? propuesta.idioma_propuesta
      : "es"
  ) as keyof typeof copy;
  const t = copy[language];
  const serviceName = (line: any) => {
    const service = servicios.find(
      (item) => item.id_servicio === line.id_servicio,
    );
    return (
      service?.[
        language === "es"
          ? "nombre_espanol"
          : language === "en"
            ? "nombre_ingles"
            : language === "it"
              ? "nombre_italiano"
              : "nombre_portugues"
      ] ||
      line.producto ||
      line.id_servicio
    );
  };
  const account =
    propuesta.cuenta?.nombre_empresa ||
    propuesta.datos_facturacion?.nombre_fiscal ||
    propuesta.id_cuenta_propuesta;
  const contact =
    propuesta.contacto?.nombre_completo_contacto ||
    propuesta.contacto_personalizado?.nombre ||
    propuesta.id_contacto_propuesta;
  const contactEmail =
    propuesta.contacto?.email_contacto ||
    propuesta.contacto_personalizado?.email ||
    "";
  const subtotal = (propuesta.lineas || []).reduce(
    (sum: number, line: any) => sum + lineTotal(line),
    0,
  );
  const base = Number(propuesta.importe_total_bi_propuesta || 0);
  const total = Number(propuesta.importe_propuesta_con_iva || 0);
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <header className="bg-gradient-to-r from-slate-950 to-blue-950 px-8 py-8 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.25em]">
          Proporción 3
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {propuesta.nombre_propuesta || t.proposal}
        </h1>
        <p className="mt-2 text-blue-100">{t.proposal}</p>
      </header>
      <div className="space-y-8 p-8">
        <section>
          <h2 className="mb-4 border-b-2 border-blue-950 pb-2 text-lg font-semibold text-blue-950">
            {t.general}
          </h2>
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <Info label={t.account} value={account} />
            <Info
              label={t.contact}
              value={`${contact}${contactEmail ? ` · ${contactEmail}` : ""}`}
            />
            <Info label={t.title} value={propuesta.nombre_propuesta} />
            <Info label={t.created} value={propuesta.fecha_envio_propuesta} />
            <Info label={t.expires} value={propuesta.fecha_validez_propuesta} />
          </div>
        </section>
        <section>
          <h2 className="mb-4 border-b-2 border-blue-950 pb-2 text-lg font-semibold text-blue-950">
            {t.services}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-3 text-left">{t.service}</th>
                  <th className="p-3 text-left">{t.description}</th>
                  <th className="p-3 text-left">{t.specs}</th>
                  <th className="p-3 text-right">{t.units}</th>
                  <th className="p-3 text-right">{t.unitPrice}</th>
                  <th className="p-3 text-right">{t.discount}</th>
                  <th className="p-3 text-right">{t.serviceTotal}</th>
                </tr>
              </thead>
              <tbody>
                {(propuesta.lineas || []).map((line: any, index: number) => (
                  <tr
                    key={line.id_linea_propuesta || index}
                    className="border-b"
                  >
                    <td className="p-3 font-medium text-blue-950">
                      {serviceName(line)}
                    </td>
                    <td className="p-3">{line.descripcion_linea || "—"}</td>
                    <td className="p-3">
                      {line.especificaciones_linea || "—"}
                    </td>
                    <td className="p-3 text-right">{line.unidades}</td>
                    <td className="p-3 text-right">
                      {money(line.precio_unitario)}
                    </td>
                    <td className="p-3 text-right">
                      {line.modo_precio === "gratis"
                        ? "Gratis"
                        : line.modo_precio === "tachado"
                          ? "—"
                          : `${Number(line.descuento_producto || 0)}%`}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {money(lineTotal(line))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto mt-4 max-w-sm space-y-2 rounded bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span>{t.subtotal}</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span>{t.discount}</span>
              <strong>-{money(Math.max(0, subtotal - base))}</strong>
            </div>
            <div className="flex justify-between">
              <span>{t.taxBase}</span>
              <strong>{money(base)}</strong>
            </div>
            <div className="flex justify-between">
              <span>{t.tax}</span>
              <strong>{money(Math.max(0, total - base))}</strong>
            </div>
            <div className="flex justify-between border-t pt-2 text-base text-blue-950">
              <span>{t.total}</span>
              <strong>{money(total)}</strong>
            </div>
          </div>
        </section>
        <section>
          <h2 className="mb-4 border-b-2 border-blue-950 pb-2 text-lg font-semibold text-blue-950">
            {t.payments}
          </h2>
          <div className="space-y-2">
            {(propuesta.cobros || []).map((payment: any, index: number) => (
              <div
                key={payment.id_cobro_propuesta || index}
                className="grid gap-2 rounded border p-3 text-sm md:grid-cols-4"
              >
                <Info label={t.paymentDate} value={payment.fecha_cobro} />
                <Info label={t.method} value={payment.forma_cobro} />
                <Info label={t.bank} value={payment.banco_cobro} />
                <Info label={t.amount} value={money(payment.importe_cobro)} />
              </div>
            ))}
          </div>
          {propuesta.es_intercambio && (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm">
              <strong>{t.exchange}</strong>
              <p className="mt-1 whitespace-pre-wrap">
                {propuesta.condiciones_intercambio}
              </p>
              {(propuesta.transferencias_intercambio || []).map(
                (transfer: any, index: number) => (
                  <p key={index} className="mt-2">
                    {transfer.fecha_proporcion3} / {transfer.fecha_contraparte}{" "}
                    · {money(transfer.importe)}
                  </p>
                ),
              )}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-4 border-b-2 border-blue-950 pb-2 text-lg font-semibold text-blue-950">
            {t.comments}
          </h2>
          {editableComments ? (
            <textarea
              value={propuesta.comentarios_adicionales || ""}
              onChange={(event) => onCommentsChange?.(event.target.value)}
              placeholder={t.commentsPlaceholder}
              className="min-h-32 w-full rounded-lg border border-slate-300 p-4 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          ) : (
            <p className="min-h-20 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              {propuesta.comentarios_adicionales || "—"}
            </p>
          )}
        </section>
        <section>
          <h2 className="mb-4 border-b-2 border-blue-950 pb-2 text-lg font-semibold text-blue-950">
            {t.agreement}
          </h2>
          <div className="grid items-stretch gap-8 md:grid-cols-2">
            <div className="flex min-h-40 flex-col">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                {t.agent}
              </p>
              {editableAgent ? (
                <select
                  value={propuesta.id_agente_propuesta || ""}
                  onChange={(event) => onAgentChange?.(event.target.value)}
                  className="w-full cursor-pointer rounded border bg-white p-3"
                >
                  <option value="">Selecciona agente</option>
                  {agentes.map((agent) => (
                    <option key={agent.id_agente} value={agent.id_agente}>
                      {agent.nombre_completo_agente ||
                        agent.nombre_agente ||
                        agent.id_agente}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-semibold text-blue-950">
                  {agentes.find(
                    (agent) =>
                      agent.id_agente === propuesta.id_agente_propuesta,
                  )?.nombre_completo_agente || propuesta.id_agente_propuesta}
                </p>
              )}
              <div className="mt-auto border-t border-slate-400 pt-2 text-sm">
                {t.signature}
              </div>
            </div>
            <div className="flex min-h-40 flex-col">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                {t.signer}
              </p>
              <p className="font-semibold text-blue-950">{contact}</p>
              <p className="text-sm text-gray-500">{contactEmail}</p>
              <div className="mt-auto border-t border-slate-400 pt-2 text-sm">
                {t.signature}
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase text-gray-400">
        {label}
      </span>
      <span className="font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}
