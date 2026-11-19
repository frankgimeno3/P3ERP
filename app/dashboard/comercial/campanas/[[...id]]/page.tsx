'use client';

import { useParams, useRouter } from 'next/navigation';
import { CampaignEditor, CampaignList, campaignPage } from '@/app/components/CommercialCampaigns';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

export default function CampanasPage() {
  const params = useParams<{ id?: string[] }>();
  const router = useRouter();
  const id = params.id?.[0];
  return <>
    <MiddleNav tituloprincipal="Campañas comerciales" />
    <main className="min-h-screen bg-gray-100 p-5 text-gray-700">
      {id ? <CampaignEditor key={id} id={id === 'nueva' ? '' : id} onSaved={saved => {
        if (id === 'nueva') router.replace(`${campaignPage}/${encodeURIComponent(saved)}`);
      }} /> : <CampaignList />}
    </main>
  </>;
}
