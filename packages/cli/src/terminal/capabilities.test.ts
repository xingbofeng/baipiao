import { describe, expect, it } from "vitest";

import { detectTerminalCapabilities } from "./capabilities.js";

describe("terminal capabilities", () => {
  it("enables color only for interactive terminals outside CI without NO_COLOR", () => {
    expect(detectTerminalCapabilities({
      env: {},
      tty: true,
      width: 100
    })).toMatchObject({
      color: true,
      tty: true,
      width: 100,
      compact: false
    });

    expect(detectTerminalCapabilities({
      env: { NO_COLOR: "1" },
      tty: true,
      width: 100
    }).color).toBe(false);

    expect(detectTerminalCapabilities({
      env: { CI: "true" },
      tty: true,
      width: 100
    }).color).toBe(false);

    expect(detectTerminalCapabilities({
      env: {},
      tty: false,
      width: 100
    }).color).toBe(false);
  });

  it("marks output compact for non-tty or narrow terminals", () => {
    expect(detectTerminalCapabilities({ env: {}, tty: true, width: 79 }).compact).toBe(true);
    expect(detectTerminalCapabilities({ env: {}, tty: false, width: 120 }).compact).toBe(true);
  });
});
