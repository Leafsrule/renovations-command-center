export const mediaTypes = [
 {value:"Before",label:"Before work",definition:"The original condition before this task starts."},
 {value:"During",label:"Work in progress",definition:"Progress or work that will be covered up, such as wiring or waterproofing."},
 {value:"After",label:"Finished work",definition:"The completed result of this task."},
 {value:"Issue",label:"Problem or damage",definition:"A defect, damage or concern that needs attention."},
 {value:"Receipt",label:"Purchase receipt",definition:"A receipt or proof of purchase for this task."},
 {value:"Inspection",label:"Inspection record",definition:"An inspection result or sign-off for this task."},
] as const;
export const mediaTypeLabel=(value:string)=>mediaTypes.find(t=>t.value===value)?.label??value;
