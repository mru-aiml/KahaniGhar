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

// Verify that a story belongs to a family.
export async function assertStoryOfFamily(storyId: string, familyId: string): Promise<void> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Story is not part of the specified family");
  }
}

// Verify that a recording belongs to a family (via its member).
export async function assertRecordingOfFamily(recordingId: string, familyId: string): Promise<void> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("recordings")
    .select("id, members!inner(family_id)")
    .eq("id", recordingId)
    .eq("members.family_id", familyId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Recording is not part of the specified family");
  }
}

// List voices for a member WITHOUT exposing speaker_embedding. Server-side.
export async function listVoicesSafe(memberId: string): Promise<
  { id: string; label: string; consent_at: string | null; deleted_at: string | null }[]
> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("voices")
    .select("id, label, consent_at, deleted_at")
    .eq("member_id", memberId)
    .is("deleted_at", null);
  if (error) throw new Error(`Failed to list voices: ${error.message}`);
  return (data ?? []) as { id: string; label: string; consent_at: string | null; deleted_at: string | null }[];
}

// Create a short-lived signed URL for a private storage object. Server-side.
// IMPORTANT: this helper does NOT verify ownership. The caller MUST have
// verified (via assert* helpers) that the object at `path` belongs to the
// authorized family before calling. Never pass client-supplied paths unchecked.
export async function signedStorageUrl(bucket: string, path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}