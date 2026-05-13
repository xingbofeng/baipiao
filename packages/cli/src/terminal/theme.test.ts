import { describe, expect, it } from "vitest";

import { createAnsiTheme } from "./theme.js";

describe("terminal theme", () => {
  it("returns ANSI tokens only when color is enabled", () => {
    expect(createAnsiTheme({ color: false }).accent("baipiao")).toBe("baipiao");
    expect(createAnsiTheme({ color: true }).accent("baipiao")).toContain("\u001B[");
    expect(createAnsiTheme({ color: true }).success("ok")).toContain("\u001B[");
  });
});
