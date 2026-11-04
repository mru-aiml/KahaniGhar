// Supabase clients. The service-role client bypasses RLS, so every server
// operation MUST explicitly enforce family authorization (see queries.ts).
// Never import the service client into client components.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, requireServerSecret } from "@/lib/config";

export { type SupabaseClient };

export function createServerSupabase(): SupabaseClient {
  requireServerSecret("NEXT_PUBLIC_SUPABASE_URL", config.supabase.url);
  requireServerSecret("SUPABASE_SERVICE_ROLE_KEY", config.supabase.serviceRoleKey);
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createBrowserSupabase(): SupabaseClient {
  if (!config.supabase.url || !config.supabase.anonKey) {
    throw new Error("Supabase public env vars are missing");
  }
  return createClient(config.supabase.url, config.supabase.anonKey);
}