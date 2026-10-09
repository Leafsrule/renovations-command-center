import { describe, expect, it } from "vitest";
import { materialLabels, displayLabel, materialIsAvailable } from "./terminology";
import { toTask } from "./task-model";
import { evaluateTaskTransition } from "./task-execution";
import { getTaskReadinessEvaluation } from "./scheduling";
import { buildMaterialOverview, getMaterialOverviewSummary } from "./materials-overview";

describe("Design and material lifecycle", () => {
  const task = (data = {}) => toTask("test", {name:"Rail", status:"ready", readinessState:"ready", phase:"design", estimatedDurationMinutes:60, materialStatus:"received", ...data});
  it("round-trips all new statuses instead of silently resetting them", () => {
    for (const materialStatus of ["received", "stock", "partial"])
      expect(task({status:"design", readinessState:"design", materialStatus})).toMatchObject({phase:"design", status:"design", readinessState:"design", materialStatus});
  });
  it("maps a legacy Design material status to Needed",()=>{expect(task({materialStatus:"design"}).materialStatus).toBe("needed");});
  it("preserves legacy material values and uses the same displayed terms", () => {
    expect(displayLabel("partial")).toBe(materialLabels.partial);
    expect(displayLabel("on_site")).toBe(materialLabels.stock);
    expect(displayLabel("delivered")).toBe(materialLabels.received);
    for (const status of ["stock", "received", "ready", "on_site", "used"]) expect(materialIsAvailable(status)).toBe(true);
    for (const status of ["design", "ordered", "partial", "needed"]) expect(materialIsAvailable(status)).toBe(false);
  });
  it("does not start design work even with a ready flag", () => {
    const t=task({status:"design"});
    expect(evaluateTaskTransition(t,"start",{tasks:[t],today:"2026-10-09",helperAvailable:true}).allowed).toBe(false);
  });
  it("blocks Design readiness and pending materials, accepts Received and Stock", () => {
    for (const data of [{status:"design"},{readinessState:"design"},{materialStatus:"design"},{materialStatus:"partial"},{materialStatus:"ordered"}]) {
      const t=task(data);
      expect(getTaskReadinessEvaluation(t,new Map([[t.id,t]]),{today:"2026-10-09",helperAvailable:true}).isReady).toBe(false);
    }
    for (const materialStatus of ["received","stock"]) {
      const t=task({materialStatus});
      expect(getTaskReadinessEvaluation(t,new Map([[t.id,t]]),{today:"2026-10-09",helperAvailable:true}).isReady).toBe(true);
    }
  });
  it("counts Received and Stock as available without hiding partially received groups", () => {
    const items=buildMaterialOverview([task({materialStatus:"stock",materialItems:["Wood"]}), {...task({materialStatus:"received",materialItems:["Screws"]}),id:"screws"}, {...task({materialStatus:"partial",materialItems:["Wood"]}),id:"pending"}]);
    expect(items.find(i=>i.name==="Wood")?.status).toBe("partial");
    expect(getMaterialOverviewSummary(items).ready).toBe(1);
  });
});
