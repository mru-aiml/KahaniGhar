// Server-side Supabase Auth client for session verification.
// Uses @supabase/ssr for proper Next.js cookie-based authentication.
// This module must ONLY be imported in server code (route handlers, middleware, server actions).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config, requireServerSecret } from "@/lib/config";
import type { SupabaseClient, User } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("lib/auth/supabase must not be imported in client code");
}

/**
 * Create a Supabase client with the anon key for session verification.
 * Uses Next.js cookies() for automatic cookie handling (including chunked cookies).
 * This client respects RLS policies and is used to verify the user's session.
 */
export async function createAuthSupabase(): Promise<SupabaseClient> {
  requireServerSecret("NEXT_PUBLIC_SUPABASE_URL", config.supabase.url);
  requireServerSecret("NEXT_PUBLIC_SUPABASE_ANON_KEY", config.supabase.anonKey);

  const cookieStore = await cookies();

  return createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can't set cookies; ignore in RSC context
        }
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Verify the Supabase session and return the authenticated user.
 * Uses the SSR client which automatically handles cookies (including chunked cookies).
 * Throws if no valid session exists.
 */
export async function getUserFromRequest(): Promise<User> {
  const authSupabase = await createAuthSupabase();

  // Verify the session using the SSR client (automatically reads cookies)
  const { data: { user }, error } = await authSupabase.auth.getUser();

  if (error || !user) {
    throw new Error("Invalid or expired session");
  }

  return user;
}

/**
 * Resolve the member record for a Supabase auth user.
 * Assumes the members table has a `user_id` column linking to auth.users.
 * If your schema uses a different mapping, adjust this function.
 */
export async function resolveMemberFromUser(user: User): Promise<{ memberId: string; familyId: string }> {
  const serviceSupabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Look up member by user_id (assuming members table has user_id column)
  // If your schema differs, adjust the query accordingly.
  const { data: member, error } = await serviceSupabase
    .from("members")
    .select("id, family_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !member) {
    throw new Error("User is not associated with a family member");
  }

  return { memberId: member.id, familyId: member.family_id };
}

/**
 * Verify that the authenticated user belongs to the specified family.
 * This is a convenience function for routes that receive a familyId parameter.
 */
export async function verifyFamilyAccess(user: User, expectedFamilyId: string): Promise<void> {
  const { familyId } = await resolveMemberFromUser(user);
  if (familyId !== expectedFamilyId) {
    throw new Error("Access denied: user does not belong to this family");
  }
}

// Re-export createClient for convenience
import { createClient } from "@supabase/supabase-js";
export { createClient } from "@supabase/supabase-js";