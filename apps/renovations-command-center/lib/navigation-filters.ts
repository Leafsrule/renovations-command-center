import type { TaskSchedulingInsight } from "./scheduling";
export function matchesScheduleFilter(insight:TaskSchedulingInsight,filter:string) {
 switch(filter){
 case "completed":return insight.isCompleted;
 case "ready_now":return insight.isReadyNow;
 case "blocked":return insight.isBlocked;
 case "waiting_on_dependencies":return insight.isWaitingOnDependencies;
 case "waiting_on_materials":return insight.isWaitingOnMaterials;
 case "overdue":return insight.isOverdue;
 case "due_soon":return insight.isDueSoon;
 case "scheduled_later":return insight.isScheduledLater;
 case "restricted":return insight.isBlocked||insight.isWaitingOnDependencies||insight.isWaitingOnMaterials;
 case "recommended_next":case "needs_review":return insight.category===filter;
 default:return true;
 }
}
