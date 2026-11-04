// Data access helpers. Because the service-role client bypasses RLS, every
// function here must take an explicit, server-verified familyId/memberId and
// filter by it. Never accept a familyId from the client without verification.

import { createServerSupabase } from "@/lib/db/supabase";

export interface FamilyContext {
  familyId: string;
  memberId: string;
}

// Verify that a member belongs to a family. Server-side only.
export async function assertMemberOfFamily(memberId: string, familyId: string): Promise<void> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Member is not part of the specified family");
  }
}

// Verify that a child belongs to a family.
export async function assertChildOfFamily(childId: string, familyId: string): Promise<void> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Child is not part of the specified family");
  }
}

// Create a short-lived signed URL for a private storage object. Server-side.
export async function signedStorageUrl(bucket: string, path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}