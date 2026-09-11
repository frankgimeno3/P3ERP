import Agentes from '../usuariosyroles/AgentesPage';
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) { const { tab } = await searchParams; return <Agentes initialTab={tab === 'asuntos' ? 'asuntos' : 'agentes'} />; }
