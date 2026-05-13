import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("docs site responsive and motion styles", () => {
  it("locks landing page mobile behavior and scroll animation safeguards", async () => {
    const css = await readFile("packages/docs-site/src/styles.css", "utf8");

    expect(css).toContain("@keyframes landing-reveal");
    expect(css).toContain("animation-timeline: view()");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("@media (max-width: 520px)");
    expect(css).toContain(".landing [data-scroll-section]");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("max-width: 100%");
  });
});
