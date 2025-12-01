import { z } from "zod";

export const cardPayloadSchema = z.object({
  values: z.array(z.string().trim().min(1, "Value cannot be empty")).min(3, "Add at least 3 values").max(5, "Maximum 5 values"),
  sixMonthGoal: z.string().trim().min(1, "6-month goal is required"),
  fiveYearGoal: z.string().trim().min(1, "5-year goal is required"),
  constraints: z.string().trim().min(1, "Constraints help ground reflection"),
  antiGoals: z.string().trim().min(1, "Capture at least one anti-goal"),
  identityStmt: z.string().trim().min(1, "Identity statement is required"),
  annotation: z.string().trim().min(3, "Share a short note on what prompted this change"),
});

export type CardPayload = z.infer<typeof cardPayloadSchema>;

export const createEntrySchema = z.object({
  content: z.string().optional().default(""),
});

export const updateEntrySchema = z.object({
  content: z.string().optional(),
});

export type CreateEntryPayload = z.infer<typeof createEntrySchema>;
export type UpdateEntryPayload = z.infer<typeof updateEntrySchema>;

export const promptRequestSchema = z.object({
  excludeIds: z.array(z.string()).optional(),
});

export const marginNoteRequestSchema = z.object({
  entryId: z.string().cuid(),
  content: z.string().optional(),
});
