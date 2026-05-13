import { describe, expect, it } from "vitest";

import {
  InitViewModelSchema,
  SearchResultsViewModelSchema,
  SetupProgressViewModelSchema,
  StatusViewModelSchema
} from "./index.js";

describe("CLI view models", () => {
  it("validates init, search, setup, and status view model shapes", () => {
    expect(InitViewModelSchema.parse({
      projectName: "Demo",
      createdFiles: [".baipiao/project.json"],
      nextCommand: "baipiao search <keyword>"
    }).projectName).toBe("Demo");

    expect(SearchResultsViewModelSchema.parse({
      query: "llm",
      categoryLabel: "LLM",
      results: [
        {
          name: "Groq",
          category: "llm",
          capability: ["prompt", "config"],
          freeTierStatus: "free_tier"
        }
      ],
      quickFilters: ["database"]
    }).results[0]?.name).toBe("Groq");

    expect(SetupProgressViewModelSchema.parse({
      command: "baipiao setup groq",
      serviceName: "Groq",
      state: "tested",
      savedEntries: [
        {
          key: "GROQ_API_KEY",
          maskedValue: "gsk_***1234",
          status: "stored"
        }
      ],
      testStatus: "passed"
    }).state).toBe("tested");

    expect(StatusViewModelSchema.parse({
      projectName: "Demo",
      aiServices: [
        { name: "Groq", state: "tested", testState: "tested" }
      ],
      backendServices: [],
      vaultKeyCount: 1,
      quickActions: ["baipiao test groq"]
    }).vaultKeyCount).toBe(1);
  });
});
