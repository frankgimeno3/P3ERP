import { permanentRedirect } from 'next/navigation';

export default function LegacyBankReviewPage() {
  permanentRedirect('/dashboard/contabilidad/extractos/conciliacion');
}
