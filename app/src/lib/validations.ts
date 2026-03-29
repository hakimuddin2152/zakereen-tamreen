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
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateReciterSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createSessionSchema = z.object({
  date: z.string().datetime({ offset: true }).or(z.string().date()),
  kalaamId: z.string().min(1).optional(),
  kalaamTitle: z.string().min(1).max(200).optional(),
  lehenTypeId: z.string().min(1).optional(),
  lehenNotes: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  attendeeIds: z.array(z.string().min(1)).min(1, "At least one attendee required"),
});

export const updateSessionSchema = createSessionSchema.partial();

export const upsertEvaluationSchema = z.object({
  ranking: z.number().int().min(1).max(5).nullable().optional(),
  voiceRange: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  audioFileKey: z.string().max(500).nullable().optional(),
  audioFileName: z.string().max(200).nullable().optional(),
});

export const createKalaamSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  poet: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
  lyrics: z.string().optional(),
});

export const createLehenTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const uploadRequestSchema = z.object({
  contentType: z.string(),
  contentLength: z.number().int().positive(),
  sessionId: z.string().cuid(),
  userId: z.string().cuid(),
});
