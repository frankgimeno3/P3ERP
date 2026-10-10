import TicketView from '../../TicketView';
export default async function Page({params}:{params:Promise<{id_ticket:string}>}){return <TicketView id={(await params).id_ticket}/>;}
