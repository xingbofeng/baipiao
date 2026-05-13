import { describe, it, expect } from "vitest";

import { renderInitView } from "./init.js";
import { renderSearchView } from "./search.js";
import { renderSetupView } from "./setup.js";
import { renderStatusView } from "./status.js";

describe("CLI presentation snapshots", () => {
  it("matches init panel snapshot with full wordmark", () => {
    expect(renderInitView({
      projectName: "Demo Project",
      createdFiles: [
        ".baipiao/project.json",
        ".baipiao/services.json",
        ".env.local",
        ".env.example"
      ],
      nextCommand: "baipiao search <keyword>"
    }, { color: false, tty: true, width: 96 })).toMatchSnapshot();
  });

  it("matches search panel snapshot without full wordmark", () => {
    expect(renderSearchView({
      query: "llm",
      categoryLabel: "LLM",
      detectedLanguage: "en",
      results: [
        { name: "Groq", freeTierStatus: "free_tier" },
        { name: "OpenRouter", freeTierStatus: "free_tier" },
        { name: "Gemini API", freeTierStatus: "limited_free" }
      ],
      quickFilters: ["database", "storage", "hosting"]
    }, { color: false, tty: true, width: 100 })).toMatchSnapshot();
  });

  it("matches setup success panel snapshot without full wordmark", () => {
    expect(renderSetupView({
      command: "baipiao setup groq",
      serviceName: "Groq",
      state: "tested",
      savedEntries: [
        {
          key: "GROQ_API_KEY",
          maskedValue: "gsk_**************************1234",
          status: "stored"
        }
      ],
      testStatus: "passed",
      envLocalUpdated: true
    })).toMatchSnapshot();
  });

  it("matches status panel snapshot with grouped services", () => {
    expect(renderStatusView({
      projectName: "Demo Project",
      aiServices: [
        {
          name: "Groq",
          state: "tested",
          testState: "tested"
        }
      ],
      backendServices: [
        {
          name: "Supabase",
          state: "prompt_generated",
          testState: "not_tested"
        }
      ],
      vaultKeyCount: 1,
      quickActions: [
        "baipiao test groq",
        "baipiao vault list",
        "baipiao env generate"
      ]
    })).toMatchSnapshot();
  });
});
