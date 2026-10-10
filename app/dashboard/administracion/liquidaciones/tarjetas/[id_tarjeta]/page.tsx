import CardDetail from '../../../tarjetas/CardDetail';
export default async function Page({params}:{params:Promise<{id_tarjeta:string}>}){return <CardDetail id={(await params).id_tarjeta}/>;}
