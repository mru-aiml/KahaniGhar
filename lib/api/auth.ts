// Auth helper for API routes.
// Provides a simple way to get AuthContext in route handlers.

import { NextRequest } from "next/server";
import { getAuthContext, requireAuth, requireAuthAndOrigin, requireValidOrigin } from "@/lib/auth/types";
import { forbiddenError, unauthorizedError } from "@/lib/api/errors";
import { z } from "zod";

/**
 * Get the AuthContext for the current request.
 * Throws if no valid session.
 */
export async function getRouteAuth(): Promise<{ familyId: string; memberId: string }> {
  return getAuthContext();
}

/**
 * Require authentication and valid origin for mutating routes.
 * Returns AuthContext if both checks pass.
 * Throws appropriate errors if checks fail.
 */
export async function requireRouteAuthAndOrigin(request: Request): Promise<{ familyId: string; memberId: string }> {
  return requireAuthAndOrigin(request);
}

/**
 * Require valid origin for mutating routes.
 * Throws if origin is missing or invalid.
 */
export async function requireRouteOrigin(request: Request): Promise<void> {
  return requireValidOrigin(request);
}

/**
 * Type guard to check if parseJsonBody returned an error response.
 */
export function isErrorResponse<T>(value: { data: T } | Response): value is Response {
  return value instanceof Response;
}

/**
 * Extract and validate JSON body with Zod schema.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T } | Response> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            retryable: false,
            status: 400,
            details: { issues: result.error.issues },
          },
        },
        { status: 400 }
      );
    }
    return { data: result.data };
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
          retryable: false,
          status: 400,
        },
      },
      { status: 400 }
    );
  }
}

/**
 * Extract and validate JSON body with Zod schema.
 * Returns the parsed data directly, throwing on error.
 */
export async function parseJsonBodyOrThrow<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const result = await parseJsonBody(request, schema);
  if (result instanceof Response) {
    throw result;
  }
  return result.data as z.infer<T>;
}