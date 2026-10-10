import type { WorkCalendar } from "./calendar";
import type { RenovationTask } from "./task-model";
export type PersonAvailability = {
  workdays: number[];
  hoursPerDay: number;
  blackouts: string[];
};
function validDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function validatePersonAvailability(value: PersonAvailability): PersonAvailability {
  if (!value || !Array.isArray(value.workdays) || value.workdays.some(d=>!Number.isInteger(d)||d<0||d>6) || !Number.isFinite(value.hoursPerDay) || value.hoursPerDay < 0 || value.hoursPerDay > 24 || !Array.isArray(value.blackouts) || value.blackouts.some(d=>typeof d!=="string" || (d.trim() && !validDate(d.trim())))) throw new Error("Choose valid person workdays, hours (0–24) and unavailable dates.");
  return {workdays:[...new Set(value.workdays)],hoursPerDay:value.hoursPerDay,blackouts:[...new Set(value.blackouts.map(d=>d.trim()).filter(Boolean))].sort()};
}
export type AvailablePerson = {id:string;active:boolean;availability?:PersonAvailability | null};
export function personAvailabilityMinutes(person: AvailablePerson | undefined, date:string) {
  if (!person?.active || !person.availability || !validDate(date)) return 0;
  try {
    const availability=validatePersonAvailability(person.availability);
    return availability.workdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay()) && !availability.blackouts.includes(date) ? Math.floor(availability.hoursPerDay*60) : 0;
  } catch { return 0; }
}
export function assignedPeople(task: RenovationTask) {
  return [...new Set([...(task.championPersonId?[task.championPersonId]:[]),...(task.helperRequired?task.helperPersonIds:[])])];
}
export function assignedWorkMinutes(task: RenovationTask, people:AvailablePerson[], date:string, calendar:WorkCalendar) {
  const ids=assignedPeople(task);
  if (task.helperRequired && !task.helperPersonIds.length) return 0;
  return ids.length ? Math.min(...ids.map(id=>Math.floor(personAvailabilityMinutes(people.find(p=>p.id===id),date)*(1-calendar.bufferPercent/100)))) : Infinity;
}
export function personHasWorkdays(person:AvailablePerson | undefined, calendar:WorkCalendar) {
  if (!person?.active || !person.availability) return false;
  try { const availability=validatePersonAvailability(person.availability);return availability.hoursPerDay>0 && availability.workdays.some(day=>calendar.workdays.includes(day)); } catch { return false; }
}
