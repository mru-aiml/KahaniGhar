// Authentication context for server-side API routes.
// This is populated by the auth middleware after verifying the Supabase session.
// NEVER trust client-supplied familyId or memberId.

export interface AuthContext {
  /** The family ID from the verified session. */
  familyId: string;
  /** The member ID from the verified session. */
  memberId: string;
}

import { getUserFromRequest, resolveMemberFromUser } from "@/lib/auth/supabase";

/**
 * Extract AuthContext from the current request context.
 * Verifies the Supabase session (via cookies) and resolves the user's family membership.
 * Throws if no valid session exists or user is not part of a family.
 * 
 * Note: This must be called in a context where Next.js cookies() is available
 * (Route Handlers, Server Actions, Middleware).
 */
export async function getAuthContext(): Promise<AuthContext> {
  const user = await getUserFromRequest();
  const { memberId, familyId } = await resolveMemberFromUser(user);
  return { familyId, memberId };
}

/**
 * Middleware helper to protect API routes.
 * Usage:
 *   export async function POST(request: Request) {
 *     const auth = await requireAuth();
 *     // auth.familyId, auth.memberId available
 *   }
 */
export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth?.familyId || !auth?.memberId) {
    throw new Error("Unauthorized");
  }
  return auth;
}

/**
 * Verify the request origin for mutating routes (CSRF protection).
 * Compares the Origin header against the expected app URL.
 * Throws if origin is missing or doesn't match.
 */
export async function requireValidOrigin(request: Request): Promise<void> {
  const origin = request.headers.get("origin");
  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;

  if (!origin) {
    throw new Error("Missing Origin header");
  }

  if (origin !== expectedOrigin) {
    throw new Error(`Invalid origin: ${origin}`);
  }
}

/**
 * Combined auth + origin check for mutating routes.
 * Returns AuthContext if both checks pass.
 */
export async function requireAuthAndOrigin(request: Request): Promise<AuthContext> {
  await requireValidOrigin(request);
  return requireAuth();
}