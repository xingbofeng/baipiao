import { describe, expect, it } from "vitest";
import { loadServiceConfigs } from "../registry/configs.js";
import { ProjectTypeSchema } from "../schemas/index.js";
import { recommendStack } from "./index.js";

describe("stack recommendation", () => {
  it("returns registry-backed services for each project type", async () => {
    const services = await loadServiceConfigs();
    const serviceIds = new Set(services.map((service) => service.id));

    for (const projectType of ProjectTypeSchema.options) {
      const stack = recommendStack(projectType);

      expect(stack.projectType).toBe(projectType);
      expect(stack.services.length).toBeGreaterThan(0);
      expect(stack.services.every((service) => serviceIds.has(service.serviceId))).toBe(true);
    }
  });

  it("supports the ai-basic setup alias", () => {
    const stack = recommendStack("ai-basic");

    expect(stack.projectType).toBe("ai_saas");
    expect(stack.services.map((service) => service.serviceId)).toEqual(expect.arrayContaining(["groq", "supabase"]));
  });
});
