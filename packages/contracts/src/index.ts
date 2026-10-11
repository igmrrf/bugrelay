import { z } from "zod";

export const statusSchema = z.enum([
  "open",
  "acknowledged",
  "in_progress",
  "resolved",
  "closed",
]);
export const severitySchema = z.enum(["low", "medium", "high", "critical"]);
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
export const registrationSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    displayName: z.string().trim().min(2).max(80),
    turnstileToken: z.string().max(2048).optional(),
  })
  .strict();
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(72),
    turnstileToken: z.string().max(2048).optional(),
  })
  .strict();
export const bugInputSchema = z
  .object({
    title: z.string().trim().min(5).max(200),
    description: z.string().trim().min(20).max(20000),
    applicationName: z.string().trim().min(1).max(120),
    companyId: z.string().uuid().optional(),
    category: z.enum(["bug", "security", "feature"]).default("bug"),
    severity: severitySchema.default("medium"),
    visibility: z.enum(["public", "private"]).default("public"),
    stepsToReproduce: z.string().max(10000).default(""),
    expectedBehavior: z.string().max(5000).default(""),
    actualBehavior: z.string().max(5000).default(""),
    environment: z.string().max(2000).default(""),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    turnstileToken: z.string().max(2048).optional(),
  })
  .strict()
  .transform((v) => ({
    ...v,
    visibility: v.category === "security" ? ("private" as const) : v.visibility,
  }));
export const commentInputSchema = z
  .object({ content: z.string().trim().min(1).max(10000) })
  .strict();
export const companyInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .max(253)
      .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/),
    description: z.string().max(5000).default(""),
  })
  .strict();
export type BugInput = z.input<typeof bugInputSchema>;
export type BugStatus = z.infer<typeof statusSchema>;
export type Severity = z.infer<typeof severitySchema>;
export interface PublicUser {
  id: string;
  displayName: string;
}
export interface Membership {
  id: string;
  companyId: string;
  role: "admin" | "member";
  company: { id: string; name: string; domain: string; isVerified: boolean };
}
export interface User extends PublicUser {
  email: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  companyMemberships: Membership[];
}
export interface Attachment {
  id: string;
  name: string;
  size: number;
  contentType: string;
  url: string;
}
export interface Bug {
  id: string;
  title: string;
  description: string;
  applicationName: string;
  companyId: string | null;
  companyName: string | null;
  category: "bug" | "security" | "feature";
  severity: Severity;
  visibility: "public" | "private";
  status: BugStatus;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  environment: string;
  tags: string[];
  voteCount: number;
  commentCount: number;
  hasUserVoted: boolean;
  author: PublicUser | null;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  resolvedAt: string | null;
  canEdit: boolean;
  canManage: boolean;
}
export interface Comment {
  id: string;
  bugId: string;
  content: string;
  author: PublicUser;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  parentId: string | null;
  depth: number;
  replyCount: number;
  isDeleted: boolean;
}
export interface Company {
  id: string;
  name: string;
  domain: string;
  description: string;
  isVerified: boolean;
  bugCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface CompanyMember {
  id: string;
  companyId: string;
  userId: string;
  role: "admin" | "member";
  user: PublicUser & { email: string };
  addedAt: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}
export interface ApiError {
  error: { code: string; message: string; requestId: string };
}
export interface AuthResponse {
  user: User;
}
export interface PublicConfig {
  turnstileSiteKey: string | null;
  oauthProviders: ("google" | "github")[];
}
