import { z } from "zod";

import {
  ServiceCapabilitySchema,
  ServiceFreeTierStatusSchema,
  ServiceStateSchema
} from "../schemas/index.js";

export const InitViewModelSchema = z.object({
  projectName: z.string().min(1),
  createdFiles: z.array(z.string().min(1)),
  nextCommand: z.string().min(1)
});

export const SearchResultViewModelSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  capability: z.array(ServiceCapabilitySchema).min(1),
  freeTierStatus: ServiceFreeTierStatusSchema
});

export const SearchResultsViewModelSchema = z.object({
  query: z.string(),
  categoryLabel: z.string().min(1),
  results: z.array(SearchResultViewModelSchema),
  quickFilters: z.array(z.string().min(1))
});

export const SetupSavedEntryViewModelSchema = z.object({
  key: z.string().min(1),
  maskedValue: z.string(),
  status: z.enum(["stored", "missing", "invalid", "untested"])
});

export const SetupProgressViewModelSchema = z.object({
  command: z.string().min(1),
  serviceName: z.string().min(1),
  state: ServiceStateSchema,
  savedEntries: z.array(SetupSavedEntryViewModelSchema),
  testStatus: z.enum(["passed", "failed", "skipped"])
});

export const StatusServiceRowViewModelSchema = z.object({
  name: z.string().min(1),
  state: ServiceStateSchema,
  testState: z.enum(["tested", "not_tested", "failed"])
});

export const StatusViewModelSchema = z.object({
  projectName: z.string().min(1),
  aiServices: z.array(StatusServiceRowViewModelSchema),
  backendServices: z.array(StatusServiceRowViewModelSchema),
  vaultKeyCount: z.number().int().nonnegative(),
  quickActions: z.array(z.string().min(1))
});

export type InitViewModel = z.infer<typeof InitViewModelSchema>;
export type SearchResultViewModel = z.infer<typeof SearchResultViewModelSchema>;
export type SearchResultsViewModel = z.infer<typeof SearchResultsViewModelSchema>;
export type SetupSavedEntryViewModel = z.infer<typeof SetupSavedEntryViewModelSchema>;
export type SetupProgressViewModel = z.infer<typeof SetupProgressViewModelSchema>;
export type StatusServiceRowViewModel = z.infer<typeof StatusServiceRowViewModelSchema>;
export type StatusViewModel = z.infer<typeof StatusViewModelSchema>;
