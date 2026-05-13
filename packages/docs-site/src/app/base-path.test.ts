import { afterEach, describe, expect, it } from "vitest";
import { getDocsBasePath } from "./base-path.js";

describe("docs base path", () => {
  const original = process.env.BAIPIAO_DOCS_BASE_PATH;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.BAIPIAO_DOCS_BASE_PATH;
      return;
    }
    process.env.BAIPIAO_DOCS_BASE_PATH = original;
  });

  it("uses root base path locally", () => {
    delete process.env.BAIPIAO_DOCS_BASE_PATH;

    expect(getDocsBasePath()).toBe("/");
  });

  it("normalizes GitHub project pages base path", () => {
    process.env.BAIPIAO_DOCS_BASE_PATH = "baipiao";

    expect(getDocsBasePath()).toBe("/baipiao/");
  });

  it("preserves explicit slash-delimited base path", () => {
    process.env.BAIPIAO_DOCS_BASE_PATH = "/baipiao/";

    expect(getDocsBasePath()).toBe("/baipiao/");
  });
});
