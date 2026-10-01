import { permanentRedirect } from 'next/navigation';

export default function LegacyBankReviewPage() {
  permanentRedirect('/dashboard/direccion/tesoreria/extractos/conciliacion');
}
