// Standardized error handling for API routes.
// Ensures consistent error responses per API Contract v1.1.

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ApiError,
  ApiErrorResponse,
  ERROR_CODES,
  HTTP_STATUS,
  isRetryableStatus,
} from "@/lib/api/schemas";

interface CustomError extends Error {
  code?: string;
  status?: number;
  retryable?: boolean;
}

/**
 * Create a standardized error response.
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  retryable?: boolean,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const retryableFlag = retryable ?? isRetryableStatus(status);
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      retryable: retryableFlag,
      status,
      details,
    },
  };
  return NextResponse.json(body, { status });
}

/**
 * Create a validation error response (400).
 */
export function validationError(message: string, details?: Record<string, unknown>): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ERROR_CODES.VALIDATION_ERROR,
    message,
    400,
    false,
    details
  );
}

/**
 * Create an unauthorized error response (401).
 */
export function unauthorizedError(message = "Authentication required"): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ERROR_CODES.UNAUTHORIZED,
    message,
    401,
    false
  );
}

/**
 * Create a forbidden error response (403).
 */
export function forbiddenError(message = "Access denied"): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ERROR_CODES.FORBIDDEN,
    message,
    403,
    false
  );
}

/**
 * Create a not found error response (404).
 */
export function notFoundError(message = "Resource not found"): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ERROR_CODES.NOT_FOUND,
    message,
    404,
    false
  );
}

/**
 * Create a rate limited error response (429).
 */
export function rateLimitedError(message = "Too many requests"): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ERROR_CODES.RATE_LIMITED,
    message,
    429,
    true
  );
}

/**
 * Create an internal server error response (500).
 */
export function internalError(message = "Internal server error"): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ERROR_CODES.STORAGE_FAILED,
    message,
    500,
    true
  );
}

/**
 * Create a service unavailable error response (503).
 */
export function serviceUnavailableError(message = "Service temporarily unavailable"): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ERROR_CODES.CREDITS_EXHAUSTED,
    message,
    503,
    true
  );
}

interface CustomError extends Error {
  code?: string;
  status?: number;
  retryable?: boolean;
}

/**
 * Handle a Zod validation error and return a standardized error response.
 */
export function handleZodError(error: Error): NextResponse<ApiErrorResponse> {
  if (error.name === "ZodError") {
    const zodError = error as ZodError;
    const issues = zodError.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return validationError("Invalid request parameters", { issues });
  }
  return validationError(error.message);
}

/**
 * Handle a generic error and return an appropriate error response.
 * Logs the error for debugging.
 */
export function handleError(error: unknown, context?: string): Response {
  console.error(`[API Error]${context ? ` ${context}` : ""}:`, error);

  if (error instanceof Response) {
    // Already a Response
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.name === "ZodError") {
      return handleZodError(error);
    }

    // Check for our custom error codes
    const customError = error as CustomError;
    const errorCode = customError.code as keyof typeof ERROR_CODES | undefined;
    if (errorCode && Object.values(ERROR_CODES).includes(ERROR_CODES[errorCode])) {
      const status = customError.status || 500;
      const retryable = customError.retryable ?? isRetryableStatus(status);
      return createErrorResponse(ERROR_CODES[errorCode], error.message, status, retryable);
    }

    // Generic error
    return internalError(error.message);
  }

  return internalError("Unknown error");
}

/**
 * Wrap an async route handler with standardized error handling.
 * Supports both simple handlers (request only) and Next.js dynamic route handlers (request, params).
 */
export function withErrorHandling<
  T extends [Request, ...unknown[]]
>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Create a successful response with the standard wrapper.
 */
export function createSuccessResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

/**
 * Rate limiting helper (in-memory, dev only).
 * For production, use the Supabase-backed implementation.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, retryAfterMs: 0, remaining: limit - bucket.count };
}

export function getRateLimitKey(request: Request, prefix = "api"): string {
  // Use IP + user agent for basic fingerprinting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  return `${prefix}:${ip}:${ua.slice(0, 50)}`;
}