import { z } from "zod";

/**
 * Optional `fields` query param for list/search tools. Manage returns only the
 * named fields, which keeps results small and sends a model only what the task
 * needs (a full ticket is ~15 KB; 34 of them overran a client's tool-result limit).
 */
export const fieldsSchema = z
  .string()
  .max(1000)
  .optional()
  .describe(
    'Comma-separated fields to return, e.g. "id,summary,status/name,company/name". Nested fields use a slash. Omit to return whole records, which can be very large: prefer listing only the fields the task needs.',
  );
