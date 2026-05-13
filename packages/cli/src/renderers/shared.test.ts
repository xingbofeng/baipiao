import { describe, expect, it } from "vitest";

import { renderBrandWordmark } from "./shared.js";

describe("shared renderer", () => {
  it("renders the full BAIPIAO wordmark for wide interactive output", () => {
    const output = renderBrandWordmark({ color: false, tty: true, width: 96 });

    expect(output).toContain("BAIPIAO");
    expect(output).toContain("██████");
  });

  it("renders compact baipiao fallback for constrained output", () => {
    const output = renderBrandWordmark({ color: false, tty: false, width: 60 });

    expect(output).toBe("baipiao");
    expect(output).not.toContain("████");
  });
});
