import { AgentTaskDetail } from '../../../AgentTasks';
export default async function Page({params}:{params:Promise<{id:string;taskId:string}>}) {
  const {id,taskId}=await params;
  return <AgentTaskDetail agent={id} id={taskId}/>;
}
