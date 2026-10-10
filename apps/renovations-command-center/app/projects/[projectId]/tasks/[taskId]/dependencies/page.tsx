import { redirect } from "next/navigation";
export default async function TaskDependenciesPage({params}:{params:Promise<{projectId:string;taskId:string}>}) {
 const {projectId,taskId}=await params;
 redirect(`/projects/${encodeURIComponent(projectId)}/tasks?edit=${encodeURIComponent(taskId)}#task-dependencies`);
}
