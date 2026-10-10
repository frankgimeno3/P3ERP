import SettlementView from '../../../../SettlementView';
export default async function Page({params}:{params:Promise<{id_tarjeta:string;id:string}>}){const p=await params;return <SettlementView id={p.id} cardId={p.id_tarjeta}/>;}
