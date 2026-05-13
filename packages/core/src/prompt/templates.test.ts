import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const templateRoot = join(process.cwd(), "templates", "prompts");

describe("prompt templates", () => {
  it("keeps configured, generic, and stack templates with required sections", async () => {
    const configured = await readFile(join(templateRoot, "configured-service.md"), "utf8");
    const generic = await readFile(join(templateRoot, "generic-service.md"), "utf8");
    const stack = await readFile(join(templateRoot, "stack.md"), "utf8");

    for (const template of [configured, generic]) {
      expect(template).toContain("## Goal");
      expect(template).toContain("## Entry page");
      expect(template).toContain("## Steps");
      expect(template).toContain("## Safety rules");
      expect(template).toContain("## Output only format");
      expect(template).toContain("KEY=VALUE");
    }

    expect(stack).toContain("## Stack goal");
    expect(stack).toContain("## Services");
    expect(stack).toContain("## Output only format");
  });
});
