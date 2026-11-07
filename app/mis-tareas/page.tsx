'use client';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import TaskList from '@/app/components/tasks/TaskList';
function Tasks(){const search=useSearchParams();return <main className="space-y-5 bg-gray-100 p-8"><h1 className="text-2xl font-semibold">Mis tareas</h1><TaskList employee={search.get('agente')||undefined}/></main>;}
export default function Page(){return <Suspense fallback={<p className="p-8">Cargando tareas…</p>}><Tasks/></Suspense>;}
