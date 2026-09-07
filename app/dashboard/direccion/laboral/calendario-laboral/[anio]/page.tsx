import { CalendarDetail } from '../../components/Calendar';
export default async function Page({ params }: { params: Promise<{ anio: string }> }) { const { anio } = await params; return <CalendarDetail year={anio} />; }
