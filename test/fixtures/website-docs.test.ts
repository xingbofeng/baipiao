import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("website and docs design documentation", () => {
  it("documents mobile compatibility, scroll animation, and reduced-motion requirements", async () => {
    const doc = await readFile("docs/WEBSITE_AND_DOCS.md", "utf8");

    expect(doc).toContain("## 首页移动端与动画");
    expect(doc).toContain("320px 到 760px");
    expect(doc).toContain("不得出现横向滚动");
    expect(doc).toContain("CTA 在移动端必须变为单列满宽按钮");
    expect(doc).toContain("data-scroll-section");
    expect(doc).toContain("CSS-only reveal");
    expect(doc).toContain("prefers-reduced-motion: reduce");
  });
});
