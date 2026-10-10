import { it, expect } from "vitest";
import { matchesScheduleFilter } from "./navigation-filters";
import type { TaskSchedulingInsight } from "./scheduling";
it("uses the same flags as summary counts, including overlapping scheduling conditions",()=>{
 const insight={category:"overdue",isOverdue:true,isReadyNow:true,isWaitingOnMaterials:true,isWaitingOnDependencies:false,isBlocked:false,isCompleted:false,isDueSoon:false,isScheduledLater:false} as TaskSchedulingInsight;
 for(const filter of ["overdue","ready_now","waiting_on_materials","restricted","all"])expect(matchesScheduleFilter(insight,filter)).toBe(true);
 for(const filter of ["completed","blocked","due_soon","scheduled_later","recommended_next","needs_review","waiting_on_dependencies"])expect(matchesScheduleFilter(insight,filter)).toBe(false);
});
