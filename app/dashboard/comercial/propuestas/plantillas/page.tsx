'use client';

import { useState } from 'react';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

type TemplateKey = 'es' | 'en';

interface TemplateProduct {
  medio: string;
  publicacion: string;
  producto: string;
  precioTarifa: number;
  descuento: number;
  precioUnitario: number;
  fechaPublicacion: string;
}

interface TemplateData {
  key: TemplateKey;
  label: string;
  title: string;
  subtitle: string;
  accountTitle: string;
  contactTitle: string;
  productsTitle: string;
  billingTitle: string;
  paymentTitle: string;
  finalTitle: string;
  fields: {
    proposalName: string;
    accountCode: string;
    company: string;
    country: string;
    agent: string;
    contact: string;
    email: string;
    billingName: string;
    address: string;
    vat: string;
    comments: string;
  };
  tableHeaders: {
    medium: string;
    publication: string;
    product: string;
    rate: string;
    discount: string;
    offered: string;
    date: string;
  };
  paymentHeaders: {
    payment: string;
    date: string;
    amount: string;
    method: string;
  };
  totals: {
    subtotalLabel: string;
    discountLabel: string;
    taxableLabel: string;
    totalLabel: string;
    subtotal: number;
    discount: number;
    taxable: number;
    total: number;
  };
  products: TemplateProduct[];
  payments: Array<{ payment: string; date: string; amount: number; method: string }>;
}

const templates: Record<TemplateKey, TemplateData> = {
  es: {
    key: 'es',
    label: 'Español',
    title: 'Propuesta comercial',
    subtitle: 'Previsualización generada a partir del flujo de crear propuesta',
    accountTitle: 'Fase 1: Cuenta seleccionada',
    contactTitle: 'Fase 2: Contacto',
    productsTitle: 'Fase 3: Productos',
    billingTitle: 'Fase 4: Datos de facturación',
    paymentTitle: 'Cobros propuestos',
    finalTitle: 'Fase 5: Información final',
    fields: {
      proposalName: 'Campaña VidrioPerfil 2026',
      accountCode: '62500001',
      company: 'Empresa Vidrio Ejemplo S.L.',
      country: 'España',
      agent: 'Laura Comercial',
      contact: 'Marta Gómez',
      email: 'marta.gomez@cliente.example',
      billingName: 'Empresa Vidrio Ejemplo S.L.',
      address: 'Calle Industria 18, 28020 Madrid',
      vat: 'ESB00000000',
      comments: 'La propuesta incluye presencia editorial y campaña digital durante el primer semestre.',
    },
    tableHeaders: {
      medium: 'Medio',
      publication: 'Publicación',
      product: 'Producto',
      rate: 'Precio tarifa',
      discount: 'Descuento',
      offered: 'Precio ofrecido',
      date: 'Fecha publicación',
    },
    paymentHeaders: {
      payment: 'Cobro',
      date: 'Fecha',
      amount: 'Importe',
      method: 'Forma de pago',
    },
    totals: {
      subtotalLabel: 'Total antes de descuento',
      discountLabel: 'Descuento total',
      taxableLabel: 'Base imponible',
      totalLabel: 'Precio final con IVA',
      subtotal: 3900,
      discount: 400,
      taxable: 3500,
      total: 4235,
    },
    products: [
      { medio: 'VidrioPerfil', publicacion: 'Especial fachadas 2026', producto: 'Página impar', precioTarifa: 2400, descuento: 250, precioUnitario: 2150, fechaPublicacion: '15/03/2026' },
      { medio: 'Newsletter', publicacion: 'Marzo 2026', producto: 'Banner principal', precioTarifa: 1500, descuento: 150, precioUnitario: 1350, fechaPublicacion: '20/03/2026' },
    ],
    payments: [
      { payment: 'Cobro 1', date: '30/03/2026', amount: 2117.5, method: 'Transferencia bancaria' },
      { payment: 'Cobro 2', date: '30/06/2026', amount: 2117.5, method: 'Transferencia bancaria' },
    ],
  },
  en: {
    key: 'en',
    label: 'English',
    title: 'Commercial proposal',
    subtitle: 'Preview generated from the create proposal workflow',
    accountTitle: 'Step 1: Selected account',
    contactTitle: 'Step 2: Contact',
    productsTitle: 'Step 3: Products',
    billingTitle: 'Step 4: Billing details',
    paymentTitle: 'Proposed payments',
    finalTitle: 'Step 5: Final information',
    fields: {
      proposalName: 'Glass Market Visibility Plan 2026',
      accountCode: 'INT-2026-001',
      company: 'International Glass Example Ltd.',
      country: 'United Kingdom',
      agent: 'Laura Commercial',
      contact: 'James Smith',
      email: 'james.smith@client.example',
      billingName: 'International Glass Example Ltd.',
      address: '42 Market Street, London',
      vat: 'GB000000000',
      comments: 'The proposal combines print visibility, newsletter presence and lead generation support.',
    },
    tableHeaders: {
      medium: 'Media',
      publication: 'Publication',
      product: 'Product',
      rate: 'Rate price',
      discount: 'Discount',
      offered: 'Offered price',
      date: 'Publication date',
    },
    paymentHeaders: {
      payment: 'Payment',
      date: 'Date',
      amount: 'Amount',
      method: 'Payment method',
    },
    totals: {
      subtotalLabel: 'Total before discount',
      discountLabel: 'Total discount',
      taxableLabel: 'Taxable base',
      totalLabel: 'Final price',
      subtotal: 5200,
      discount: 650,
      taxable: 4550,
      total: 4550,
    },
    products: [
      { medio: 'VidrioPerfil', publicacion: 'International issue 2026', producto: 'Full page advert', precioTarifa: 3200, descuento: 400, precioUnitario: 2800, fechaPublicacion: '10/04/2026' },
      { medio: 'Newsletter', publicacion: 'April 2026', producto: 'Sponsored feature', precioTarifa: 2000, descuento: 250, precioUnitario: 1750, fechaPublicacion: '18/04/2026' },
    ],
    payments: [
      { payment: 'Payment 1', date: '30/04/2026', amount: 2275, method: 'Bank transfer' },
      { payment: 'Payment 2', date: '30/07/2026', amount: 2275, method: 'Bank transfer' },
    ],
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

function InfoGrid({ template }: { template: TemplateData }) {
  const items = [
    ['Código / Code', template.fields.accountCode],
    ['Empresa / Company', template.fields.company],
    ['País / Country', template.fields.country],
    ['Agente / Agent', template.fields.agent],
  ];

  return (
    <div className="grid grid-cols-4 gap-3 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs uppercase text-gray-500">{label}</p>
          <p className="mt-1 font-semibold text-gray-800">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ProposalPreview({ template }: { template: TemplateData }) {
  return (
    <div className="bg-white p-8 shadow-sm">
      <div className="mb-6 border-b border-gray-200 pb-5">
        <p className="text-2xl font-semibold text-blue-950">{template.title}</p>
        <p className="mt-1 text-sm text-gray-500">{template.subtitle}</p>
      </div>

      <section className="mb-6">
        <p className="mb-2 font-semibold text-gray-700">{template.accountTitle}</p>
        <InfoGrid template={template} />
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4">
        <div className="border border-gray-200 p-4">
          <p className="mb-2 font-semibold text-gray-700">{template.contactTitle}</p>
          <p className="text-sm font-medium text-gray-800">{template.fields.contact}</p>
          <p className="text-sm text-gray-500">{template.fields.email}</p>
        </div>
        <div className="border border-gray-200 p-4">
          <p className="mb-2 font-semibold text-gray-700">{template.billingTitle}</p>
          <p className="text-sm font-medium text-gray-800">{template.fields.billingName}</p>
          <p className="text-sm text-gray-500">{template.fields.address}</p>
          <p className="text-sm text-gray-500">{template.fields.vat}</p>
        </div>
      </section>

      <section className="mb-6">
        <p className="mb-2 font-semibold text-gray-700">{template.productsTitle}</p>
        <table className="w-full border border-gray-200 text-sm">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="p-2 text-left">{template.tableHeaders.medium}</th>
              <th className="p-2 text-left">{template.tableHeaders.publication}</th>
              <th className="p-2 text-left">{template.tableHeaders.product}</th>
              <th className="p-2 text-right">{template.tableHeaders.rate}</th>
              <th className="p-2 text-right">{template.tableHeaders.discount}</th>
              <th className="p-2 text-right">{template.tableHeaders.offered}</th>
              <th className="p-2 text-left">{template.tableHeaders.date}</th>
            </tr>
          </thead>
          <tbody>
            {template.products.map((product) => (
              <tr key={`${product.publicacion}-${product.producto}`} className="border-t border-gray-200">
                <td className="p-2">{product.medio}</td>
                <td className="p-2">{product.publicacion}</td>
                <td className="p-2">{product.producto}</td>
                <td className="p-2 text-right">{formatCurrency(product.precioTarifa)}</td>
                <td className="p-2 text-right">{formatCurrency(product.descuento)}</td>
                <td className="p-2 text-right font-medium">{formatCurrency(product.precioUnitario)}</td>
                <td className="p-2">{product.fechaPublicacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6 grid grid-cols-[1fr_300px] gap-4">
        <table className="w-full border border-gray-200 text-sm">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="p-2 text-left">{template.paymentHeaders.payment}</th>
              <th className="p-2 text-left">{template.paymentHeaders.date}</th>
              <th className="p-2 text-right">{template.paymentHeaders.amount}</th>
              <th className="p-2 text-left">{template.paymentHeaders.method}</th>
            </tr>
          </thead>
          <tbody>
            {template.payments.map((payment) => (
              <tr key={payment.payment} className="border-t border-gray-200">
                <td className="p-2">{payment.payment}</td>
                <td className="p-2">{payment.date}</td>
                <td className="p-2 text-right">{formatCurrency(payment.amount)}</td>
                <td className="p-2">{payment.method}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border border-gray-200 text-sm">
          {[
            [template.totals.subtotalLabel, template.totals.subtotal],
            [template.totals.discountLabel, -template.totals.discount],
            [template.totals.taxableLabel, template.totals.taxable],
            [template.totals.totalLabel, template.totals.total],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between border-b border-gray-200 p-3 last:border-b-0">
              <span className="text-gray-600">{label}</span>
              <span className="font-semibold text-gray-800">{formatCurrency(value as number)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-gray-200 p-4">
        <p className="mb-2 font-semibold text-gray-700">{template.finalTitle}</p>
        <p className="text-sm"><span className="font-medium">{template.fields.proposalName}</span></p>
        <p className="mt-2 text-sm text-gray-600">{template.fields.comments}</p>
      </section>
    </div>
  );
}

export default function PlantillasPropuestasPage() {
  const [selected, setSelected] = useState<TemplateKey>('es');
  const template = templates[selected];

  return (
    <div className="flex min-h-screen flex-col bg-gray-200 text-gray-600">
      <MiddleNav tituloprincipal="Plantillas de propuestas" />
      <div className="min-h-screen bg-gray-100 px-12 py-8">
        <div className="mb-5 flex gap-2">
          {Object.values(templates).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelected(item.key)}
              className={`px-4 py-2 text-sm font-medium ${
                selected === item.key ? 'bg-blue-950 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <ProposalPreview template={template} />
      </div>
    </div>
  );
}
