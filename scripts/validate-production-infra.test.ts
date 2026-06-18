import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

describe("production infrastructure guardrails", () => {
  it("keeps Firebase rules deployment manual-only with exact confirmation", () => {
    const workflow = YAML.parse(
      readFileSync(".github/workflows/firebase-rules.yml", "utf8")
    );

    expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"]);
    expect(workflow.on.workflow_dispatch.inputs.confirmation).toMatchObject({
      required: true,
      type: "string"
    });
    expect(workflow.jobs.deploy_rules.if).toBe(
      "${{ github.event.inputs.confirmation == 'DEPLOY' }}"
    );
    expect(workflow.jobs.deploy_rules.permissions).toEqual({
      contents: "read"
    });
  });

  it("keeps Render as the single production web host on main", () => {
    const blueprint = YAML.parse(readFileSync("render.yaml", "utf8"));
    const webServices = blueprint.services.filter(
      (service: { type?: string }) => service.type === "web"
    );
    const service = webServices[0];

    expect(webServices).toHaveLength(1);
    expect(service).toMatchObject({
      runtime: "node",
      plan: "starter",
      branch: "main",
      buildCommand: "npm ci && npm run build",
      startCommand: "npm run start -- -H 0.0.0.0 -p $PORT",
      healthCheckPath: "/api/health"
    });
  });

  it("keeps Firebase browser values externalized in Render", () => {
    const blueprint = YAML.parse(readFileSync("render.yaml", "utf8"));
    const service = blueprint.services.find(
      (candidate: { type?: string }) => candidate.type === "web"
    );
    const envVars = new Map(
      service.envVars.map((envVar: { key: string }) => [envVar.key, envVar])
    );

    for (const name of [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID"
    ]) {
      expect(envVars.get(name)).toEqual({ key: name, sync: false });
    }
  });
});
