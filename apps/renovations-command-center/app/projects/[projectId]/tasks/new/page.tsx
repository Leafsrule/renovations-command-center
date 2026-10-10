import { redirect } from "next/navigation";
export default async function NewTaskPage({params}:{params:Promise<{projectId:string}>}) {
 const {projectId}=await params;
 redirect(`/projects/${encodeURIComponent(projectId)}/tasks?new=1#task-form`);
}
