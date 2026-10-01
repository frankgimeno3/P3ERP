import TaskDetail from '@/app/components/tasks/TaskDetail';
import {Suspense} from 'react';
export default function Page(){return <Suspense fallback={<p className="p-8">Cargando tarea…</p>}><TaskDetail/></Suspense>;}
