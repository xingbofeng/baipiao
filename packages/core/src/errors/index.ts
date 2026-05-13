import { sanitizeSecretDetails } from "../security/redaction.js";

export const ErrorCodes = [
  "PROJECT_NOT_INITIALIZED",
  "SERVICE_NOT_FOUND",
  "PROMPT_GENERATION_FAILED",
  "AGENT_OUTPUT_PARSE_FAILED",
  "SECRET_VALIDATION_FAILED",
  "SECRET_SAVE_FAILED",
  "VAULT_ENTRY_NOT_FOUND",
  "VAULT_REVEAL_REQUIRES_CONFIRMATION",
  "ENV_GENERATION_FAILED",
  "TEST_NOT_SUPPORTED",
  "TEST_CONNECTION_FAILED",
  "MCP_TOOL_FAILED",
  "CATALOG_LOAD_FAILED"
] as const;

export type ErrorCode = (typeof ErrorCodes)[number];

export class BaipiaoError extends Error {
  readonly code: ErrorCode;
  readonly recoverable: boolean;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, options: { recoverable?: boolean; details?: unknown } = {}) {
    super(message);
    this.name = "BaipiaoError";
    this.code = code;
    this.recoverable = options.recoverable ?? true;
    if ("details" in options) {
      this.details = sanitizeErrorDetails(options.details);
    }
  }
}

export function sanitizeErrorDetails(details: unknown, contextKey?: string): unknown {
  return sanitizeSecretDetails(details, contextKey);
}
