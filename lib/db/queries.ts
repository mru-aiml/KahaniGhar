// Data access helpers. Because the service-role client bypasses RLS, every
// function here must take an explicit, server-verified familyId/memberId and
// filter by it. Never accept a familyId from the client without verification.

import { createServerSupabase } from "@/lib/db/supabase";
import { config, requireServerSecret } from "@/lib/config";

export interface FamilyContext {
  familyId: string;
  memberId: string;
}

export interface StoryRow {
  id: string;
  family_id: string;
  title: string;
  language: string;
  kind: string;
  source_recording_id: string | null;
  narrator_member_id: string | null;
  child_id: string | null;
  age_band: string | null;
  structure: unknown;
  created_at: string;
}

export interface SceneRow {
  id: string;
  story_id: string;
  idx: number;
  text: string;
  choice_prompt: string | null;
  choices: string[] | null;
  audio_path: string | null;
  voice_id: string | null;
  model: string | null;
  created_at: string;
}

export interface ChildRow {
  id: string;
  family_id: string;
  nickname: string;
  age_band: string;
  interests: string[];
  created_at: string;
}

export interface VoiceRow {
  id: string;
  member_id: string;
  label: string;
  speaker_embedding: string | null;
  consent_at: string | null;
  consent_text: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface RecordingRow {
  id: string;
  member_id: string;
  storage_path: string;
  language: string;
  duration_s: number | null;
  transcript: string | null;
  created_at: string;
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

// Verify that a voice belongs to a family (via its member).
export async function assertVoiceOfFamily(voiceId: string, familyId: string): Promise<void> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("voices")
    .select("id, members!inner(family_id)")
    .eq("id", voiceId)
    .eq("members.family_id", familyId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Voice is not part of the specified family");
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

// Get a voice by ID (for TTS authorization check) - WITHOUT speaker_embedding.
export async function getVoiceById(voiceId: string): Promise<Omit<VoiceRow, "speaker_embedding"> | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("voices")
    .select("id, member_id, label, consent_at, consent_text, deleted_at, created_at")
    .eq("id", voiceId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get voice: ${error.message}`);
  return data as Omit<VoiceRow, "speaker_embedding"> | null;
}

// Get a voice by ID WITH speaker_embedding (server-side only, for TTS synthesis).
// Caller MUST have verified voice ownership via assertVoiceOfFamily before calling.
export async function getVoiceByIdForTts(voiceId: string): Promise<VoiceRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("voices")
    .select("id, member_id, label, speaker_embedding, consent_at, consent_text, deleted_at, created_at")
    .eq("id", voiceId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get voice: ${error.message}`);
  return data as VoiceRow | null;
}

// Get a child by ID.
export async function getChildById(childId: string): Promise<ChildRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("children")
    .select("id, family_id, nickname, age_band, interests, created_at")
    .eq("id", childId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get child: ${error.message}`);
  return data as ChildRow | null;
}

// Get or create a child for the family (by nickname + age_band).
export async function getOrCreateChild(
  familyId: string,
  nickname: string,
  ageBand: string,
  interests: string[]
): Promise<ChildRow> {
  const supabase = createServerSupabase();

  // Try to find existing child
  const { data: existing } = await supabase
    .from("children")
    .select("id, family_id, nickname, age_band, interests, created_at")
    .eq("family_id", familyId)
    .eq("nickname", nickname)
    .eq("age_band", ageBand)
    .maybeSingle();

  if (existing) {
    return existing as ChildRow;
  }

  // Create new child
  const { data, error } = await supabase
    .from("children")
    .insert({ family_id: familyId, nickname, age_band: ageBand, interests })
    .select("id, family_id, nickname, age_band, interests, created_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create child: ${error?.message ?? "unknown"}`);
  }

  return data as ChildRow;
}

// Create a story record.
export async function createStory(params: {
  familyId: string;
  title: string;
  language: string;
  kind: string;
  sourceRecordingId: string | null;
  narratorMemberId: string;
  childId: string;
  ageBand: string;
  structure: unknown;
}): Promise<StoryRow> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      family_id: params.familyId,
      title: params.title,
      language: params.language,
      kind: params.kind,
      source_recording_id: params.sourceRecordingId,
      narrator_member_id: params.narratorMemberId,
      child_id: params.childId,
      age_band: params.ageBand,
      structure: params.structure,
    })
    .select("id, family_id, title, language, kind, source_recording_id, narrator_member_id, child_id, age_band, structure, created_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create story: ${error?.message ?? "unknown"}`);
  }
  return data as StoryRow;
}

// Get a story by ID (with family check done by caller).
export async function getStoryById(storyId: string): Promise<StoryRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("stories")
    .select("id, family_id, title, language, kind, source_recording_id, narrator_member_id, child_id, age_band, structure, created_at")
    .eq("id", storyId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get story: ${error.message}`);
  return data as StoryRow | null;
}

// Get a story by ID with family ownership verification.
export async function getStoryByIdForFamily(storyId: string, familyId: string): Promise<StoryRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("stories")
    .select("id, family_id, title, language, kind, source_recording_id, narrator_member_id, child_id, age_band, structure, created_at")
    .eq("id", storyId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get story: ${error.message}`);
  return data as StoryRow | null;
}

// List stories for a family with filters.
export async function listStories(params: {
  familyId: string;
  query?: string;
  language?: string;
  kind?: string;
  narrator?: string;
  limit: number;
  offset: number;
}): Promise<{ stories: StoryRow[]; total: number }> {
  const supabase = createServerSupabase();

  let query = supabase
    .from("stories")
    .select("id, family_id, title, language, kind, source_recording_id, narrator_member_id, child_id, age_band, structure, created_at", { count: "exact" })
    .eq("family_id", params.familyId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.query?.trim()) {
    const q = params.query.trim();
    query = query.or(`title.ilike.%${q}%,child_nickname.ilike.%${q}%,narrator.ilike.%${q}%`);
  }
  if (params.language && params.language !== "all") {
    query = query.eq("language", params.language);
  }
  if (params.kind && params.kind !== "all") {
    query = query.eq("kind", params.kind);
  }
  if (params.narrator && params.narrator !== "all") {
    // Join with members to filter by narrator display_name
    // This requires a more complex query; for now filter in memory after fetch
    // TODO: Optimize with proper join
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list stories: ${error.message}`);

  // Filter by narrator in memory if needed
  const stories = (data ?? []) as StoryRow[];
  if (params.narrator && params.narrator !== "all") {
    // We'd need to join with members; for now, we'll need to fetch member names
    // This is a limitation of the current schema - we should denormalize narrator name
    // For now, we'll return all and let the API layer filter
  }

  return { stories, total: count ?? 0 };
}

// Delete a story (cascades to scenes via FK).
// Verifies family ownership before deleting.
export async function deleteStory(storyId: string, familyId: string): Promise<void> {
  const supabase = createServerSupabase();
  // Verify ownership first
  const { data, error: checkError } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (checkError || !data) {
    throw new Error("Story not found or access denied");
  }

  const { error } = await supabase.from("stories").delete().eq("id", storyId);
  if (error) throw new Error(`Failed to delete story: ${error.message}`);
}

// Create scene records.
export async function createScenes(scenes: Array<{
  storyId: string;
  idx: number;
  text: string;
  choicePrompt: string | null;
  choices: string[] | null;
}>): Promise<SceneRow[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("scenes")
    .insert(
      scenes.map(s => ({
        story_id: s.storyId,
        idx: s.idx,
        text: s.text,
        choice_prompt: s.choicePrompt,
        choices: s.choices,
      }))
    )
    .select("id, story_id, idx, text, choice_prompt, choices, audio_path, voice_id, model, created_at");

  if (error || !data) {
    throw new Error(`Failed to create scenes: ${error?.message ?? "unknown"}`);
  }
  return data as SceneRow[];
}

// Get scenes for a story.
export async function getScenesByStoryId(storyId: string): Promise<SceneRow[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("scenes")
    .select("id, story_id, idx, text, choice_prompt, choices, audio_path, voice_id, model, created_at")
    .eq("story_id", storyId)
    .order("idx", { ascending: true });
  if (error) throw new Error(`Failed to get scenes: ${error.message}`);
  return (data ?? []) as SceneRow[];
}

// Update scene audio path (for TTS caching).
export async function updateSceneAudioPath(sceneId: string, audioPath: string): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("scenes").update({ audio_path: audioPath }).eq("id", sceneId);
  if (error) throw new Error(`Failed to update scene audio path: ${error.message}`);
}

// Create a recording record.
export async function createRecording(params: {
  memberId: string;
  storagePath: string;
  language: string;
  durationS: number | null;
  transcript: string | null;
}): Promise<RecordingRow> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("recordings")
    .insert({
      member_id: params.memberId,
      storage_path: params.storagePath,
      language: params.language,
      duration_s: params.durationS,
      transcript: params.transcript,
    })
    .select("id, member_id, storage_path, language, duration_s, transcript, created_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create recording: ${error?.message ?? "unknown"}`);
  }
  return data as RecordingRow;
}

// Get a recording by ID.
export async function getRecordingById(recordingId: string): Promise<RecordingRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("recordings")
    .select("id, member_id, storage_path, language, duration_s, transcript, created_at")
    .eq("id", recordingId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get recording: ${error.message}`);
  return data as RecordingRow | null;
}

// Create a signed URL for a private storage object.
// Caller MUST have verified ownership via assert* helpers before calling.
export async function signedStorageUrl(bucket: string, path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

// Upload a file to private storage.
// Caller MUST have verified ownership of the target path's family before calling.
export async function uploadToStorage(bucket: string, path: string, file: Blob | Buffer | ArrayBuffer): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Failed to upload to storage: ${error.message}`);
}

// Delete a file from storage.
// Caller MUST have verified ownership of the target path's family before calling.
export async function deleteFromStorage(bucket: string, path: string): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Failed to delete from storage: ${error.message}`);
}

// Validate required server environment variables for Supabase.
export function validateSupabaseEnv(): void {
  requireServerSecret("NEXT_PUBLIC_SUPABASE_URL", config.supabase.url);
  requireServerSecret("NEXT_PUBLIC_SUPABASE_ANON_KEY", config.supabase.anonKey);
  requireServerSecret("SUPABASE_SERVICE_ROLE_KEY", config.supabase.serviceRoleKey);
}

// Validate required server environment variables for Gnani.
export function validateGnaniEnv(): void {
  requireServerSecret("GNANI_API_KEY", config.gnani.apiKey);
  requireServerSecret("GNANI_BASE_URL", config.gnani.baseUrl);
}

// Validate required server environment variables for LLM.
export function validateLlmEnv(): void {
  requireServerSecret("LLM_URL", config.llm.url);
  // LLM_KEY is optional for some providers
}

// Validate all required server environment variables.
export function validateServerEnv(): void {
  validateSupabaseEnv();
  validateGnaniEnv();
  validateLlmEnv();
}