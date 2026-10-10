import { expect, it } from "vitest";
import { calculateCalendarPlan, DEFAULT_CALENDAR } from "./calendar";
import { personAvailabilityMinutes, validatePersonAvailability } from "./person-availability";
import { toTask } from "./task-model";
const person={id:"helper",active:true,availability:{workdays:[1,2,3,4,5],hoursPerDay:2,blackouts:["2026-10-08"]}};
const task=toTask("tile",{name:"tile",priority:"medium",status:"ready",dependencyTaskIds:[],helperRequired:true,helperPersonIds:["helper"],materialStatus:"not_required",blockerType:"none",estimatedDurationMinutes:180});
it("treats missing, inactive, invalid and blackout availability as unavailable",()=>{
  expect(personAvailabilityMinutes(undefined,"2026-10-09")).toBe(0);
  expect(personAvailabilityMinutes({...person,active:false},"2026-10-09")).toBe(0);
  expect(personAvailabilityMinutes(person,"2026-10-08")).toBe(0);
  expect(personAvailabilityMinutes(person,"2026-10-10")).toBe(0);
  expect(personAvailabilityMinutes(person,"2026-10-09")).toBe(120);
  expect(()=>validatePersonAvailability({...person.availability,blackouts:["2026-02-30"]})).toThrow();
});
it("limits helper work to persisted hours and shifts downstream work past helper blackouts",()=>{
  const plan=calculateCalendarPlan([task,{...task,id:"finish",helperRequired:false,helperPersonIds:[],estimatedDurationMinutes:60,dependencyTaskIds:["tile"]}],DEFAULT_CALENDAR,"2026-10-08",[person]);
  expect(plan.dates).toEqual([{taskId:"tile",start:"2026-10-09",end:"2026-10-12"},{taskId:"finish",start:"2026-10-13",end:"2026-10-13"}]);
});
it("does not schedule unknown helpers or helpers with no shared workdays",()=>{
  expect(calculateCalendarPlan([task],DEFAULT_CALENDAR,"2026-10-08").blocked).toHaveLength(1);
  expect(calculateCalendarPlan([task],DEFAULT_CALENDAR,"2026-10-08",[{...person,availability:{...person.availability,workdays:[6]}}]).blocked).toHaveLength(1);
});
it("uses Toronto release dates and conservatively starts after a timed cure day",()=>{
  const plan=calculateCalendarPlan([{...task,helperRequired:false,helperPersonIds:[],status:"waiting_curing",cureUntil:"2026-10-10T02:00:00Z"}],DEFAULT_CALENDAR,"2026-10-08");
  expect(plan.dates[0].start).toBe("2026-10-12");
});
