import { HiringDetail } from '../../components/Hiring';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <HiringDetail id={id} />; }
