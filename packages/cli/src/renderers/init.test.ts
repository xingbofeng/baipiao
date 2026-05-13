import { describe, expect, it } from "vitest";

import { renderInitView } from "./init.js";

const viewModel = {
  projectName: "demo",
  createdFiles: [
    ".baipiao/project.json",
    ".baipiao/services.json",
    ".env.local",
    ".env.example"
  ],
  nextCommand: "baipiao search <keyword>"
};

describe("init renderer", () => {
  it("renders the design-spec BAIPIAO ASCII wordmark for TTY output", () => {
    const output = renderInitView(viewModel, { color: false, tty: true, width: 96 });

    expect(output).toContain("BAIPIAO");
    expect(output).toContain("Project initialized");
    expect(output).toContain(".baipiao/project.json");
    expect(output).toContain(".baipiao/services.json");
    expect(output).toContain(".env.local");
    expect(output).toContain(".env.example");
    expect(output).toContain("baipiao search <keyword>");
  });

  it("falls back to compact baipiao branding when terminal output is constrained", () => {
    const output = renderInitView(viewModel, { color: false, tty: false, width: 60 });

    expect(output).toContain("baipiao");
    expect(output).not.toContain("████");
    expect(output).toContain("Project initialized");
    expect(output).toContain("baipiao search <keyword>");
  });
});
