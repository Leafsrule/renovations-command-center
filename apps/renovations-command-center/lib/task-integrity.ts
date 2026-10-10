import type { RenovationTask, TaskFormInput } from "./tasks";
export function validateTaskEdit(
  input: TaskFormInput,
  tasks: RenovationTask[],
  current?: RenovationTask,
) {
  if (input.materialStatus === "design") throw new Error("Choose a material status. Design is a project/task phase.");
  if (!input.name.trim()) throw new Error("Task name is required.");
  if (
    input.status !== current?.status &&
    !["design", "draft", "not_ready", "ready", "cancelled"].includes(input.status)
  )
    throw new Error(
      "Use Today actions to start, wait, block or complete work.",
    );
  if (
    current &&
    !["design", "draft", "not_ready", "ready"].includes(current.status) &&
    input.status !== current.status
  )
    throw new Error("Use guarded task actions for execution changes.");
  if (
    current?.photosRequired &&
    !input.photosRequired &&
    !["design", "draft", "not_ready", "ready"].includes(current.status)
  )
    throw new Error(
      "Record an owner exception through quality review; required media cannot be removed during execution.",
    );
  if (
    current &&
    ["complete", "cancelled"].includes(current.status) &&
    input.status !== current.status
  )
    throw new Error(
      "Completed or cancelled work requires an audited reopening workflow.",
    );
  if (current && !["design", "draft", "not_ready", "ready"].includes(current.status) &&
    ((input.roomId || null) !== (current.roomId || null) || (input.championPersonId || null) !== (current.championPersonId || null)))
    throw new Error("Room and champion links must be retained after work is posted.");
  const id = current?.id ?? "__new_task__";
  const graph = new Map(tasks.map((t) => [t.id, t.dependencyTaskIds]));
  graph.set(id, input.dependencyTaskIds);
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(node: string) {
    if (visiting.has(node))
      throw new Error("Circular task dependencies are not allowed.");
    if (visited.has(node)) return;
    if (!graph.has(node))
      throw new Error("A prerequisite no longer exists. Reload tasks.");
    visiting.add(node);
    for (const dep of graph.get(node)!) visit(dep);
    visiting.delete(node);
    visited.add(node);
  }
  visit(id);
  if (
    input.helperRequired &&
    input.helperPersonIds.length === 0 &&
    input.status === "ready"
  )
    throw new Error("Assign the required helper before marking work ready.");
}
