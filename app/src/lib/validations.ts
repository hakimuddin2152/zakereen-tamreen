import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const createReciterSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32)
    .regex(/^[a-z0-9_]+$/, "Username: lowercase letters, numbers, underscores only"),
  displayName: z.string().min(1, "Display name is required").max(64),
  partyName: z.string().max(100).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateReciterSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  partyName: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  grade: z.enum(["A", "B", "C", "D"]).nullable().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createSessionSchema = z.object({
  date: z.string().datetime({ offset: true }).or(z.string().date()),
  kalaamIds: z.array(z.string().min(1)).min(1, "Select at least one kalaam"),
  notes: z.string().max(1000).optional(),
  attendeeIds: z.array(z.string().min(1)).min(1, "At least one attendee required"),
});

export const updateSessionSchema = z.object({
  date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  kalaamIds: z.array(z.string().min(1)).min(1).optional(),
  notes: z.string().max(1000).optional(),
  attendeeIds: z.array(z.string().min(1)).optional(),
});

export const upsertEvaluationSchema = z.object({
  kalaamId: z.string().min(1),
  ranking: z.number().int().min(1).max(5).nullable().optional(),
  voiceRange: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  audioFileKey: z.string().max(500).nullable().optional(),
  audioFileName: z.string().max(200).nullable().optional(),
});

export const createKalaamSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  category: z.enum(["MARASIYA", "SALAAM", "MADEH", "MISC"]).default("MISC"),
  recitedBy: z.string().max(200).optional(),
  pdfLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  highestNote: z.string().max(10).optional(),
  lowestNote: z.string().max(10).optional(),
});

export const updateKalaamSchema = createKalaamSchema.partial();

export const updatePrerequisiteSchema = z.object({
  kalaamId: z.string().min(1),
  lehenDone: z.boolean().optional(),
  hifzDone: z.boolean().optional(),
});

export const uploadRequestSchema = z.object({
  contentType: z.string(),
  contentLength: z.number().int().positive(),
  context: z.enum(["session", "kalaam"]),
  sessionId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  kalaamId: z.string().cuid().optional(),
});
