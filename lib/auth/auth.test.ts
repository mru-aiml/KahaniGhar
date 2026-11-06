import { describe, it, expect, vi, beforeEach } from "vitest";
import { mocks, resetAllMocks } from "@/vitest.setup";

// Set test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.GNANI_API_KEY = "test-gnani-key";
process.env.GNANI_BASE_URL = "https://api.vachana.ai";
process.env.LLM_URL = "http://localhost:8000";
process.env.LLM_KEY = "test-llm-key";

describe("Authentication", () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Re-import modules after mocks are reset
    vi.resetModules();
  });

  describe("requireValidOrigin", () => {
    it("throws when Origin header is missing", async () => {
      const { requireValidOrigin } = await import("@/lib/auth/types");
      
      const request = new Request("http://localhost:3000/api/test", {
        method: "GET",
        headers: new Headers({}),
      });
      
      await expect(requireValidOrigin(request)).rejects.toThrow("Missing Origin header");
    });

    it("throws when Origin doesn't match expected", async () => {
      const { requireValidOrigin } = await import("@/lib/auth/types");
      
      const request = new Request("http://localhost:3000/api/test", {
        method: "GET",
        headers: new Headers({ origin: "http://evil.com" }),
      });
      
      await expect(requireValidOrigin(request)).rejects.toThrow("Invalid origin: http://evil.com");
    });

    it("passes when Origin matches expected", async () => {
      const { requireValidOrigin } = await import("@/lib/auth/types");
      
      const request = new Request("http://localhost:3000/api/test", {
        method: "GET",
        headers: new Headers({ origin: "http://localhost:3000" }),
      });
      
      await expect(requireValidOrigin(request)).resolves.toBeUndefined();
    });
  });

  describe("requireAuthAndOrigin", () => {
    it("throws when origin is invalid", async () => {
      const { requireAuthAndOrigin } = await import("@/lib/auth/types");
      
      mocks.mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
      mocks.mockCookies.mockReturnValue({
        getAll: vi.fn(() => []),
        set: vi.fn(),
      });
      
      mocks.mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ 
              data: { id: "member-456", family_id: "family-789" }, 
              error: null 
            }),
          }),
        }),
      });
      
      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: new Headers({ origin: "http://evil.com" }),
      });
      
      await expect(requireAuthAndOrigin(request)).rejects.toThrow("Invalid origin");
    });

    it("throws when auth fails", async () => {
      const { requireAuthAndOrigin } = await import("@/lib/auth/types");
      
      mocks.mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: new Error("Invalid") });
      mocks.mockCookies.mockReturnValue({
        getAll: vi.fn(() => []),
        set: vi.fn(),
      });
      
      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: new Headers({ 
          origin: "http://localhost:3000",
        }),
      });
      
      await expect(requireAuthAndOrigin(request)).rejects.toThrow();
    });
  });
});

describe("Database Queries", () => {
  beforeEach(() => {
    resetAllMocks();
    vi.resetModules();
  });

  describe("assertStoryOfFamily", () => {
    it("throws when story not found", async () => {
      const { assertStoryOfFamily } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      
      await expect(assertStoryOfFamily("story-123", "family-456")).rejects.toThrow("Story is not part of the specified family");
    });

    it("throws on database error", async () => {
      const { assertStoryOfFamily } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: new Error("DB error") });
      
      await expect(assertStoryOfFamily("story-123", "family-456")).rejects.toThrow("Story is not part of the specified family");
    });

    it("passes when story belongs to family", async () => {
      const { assertStoryOfFamily } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: { id: "story-123" }, error: null });
      
      await expect(assertStoryOfFamily("story-123", "family-456")).resolves.toBeUndefined();
    });
  });

  describe("assertVoiceOfFamily", () => {
    it("throws when voice not found or not owned", async () => {
      const { assertVoiceOfFamily } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      
      await expect(assertVoiceOfFamily("voice-123", "family-456")).rejects.toThrow("Voice is not part of the specified family");
    });

    it("passes when voice belongs to family", async () => {
      const { assertVoiceOfFamily } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: { id: "voice-123" }, error: null });
      
      await expect(assertVoiceOfFamily("voice-123", "family-456")).resolves.toBeUndefined();
    });
  });

  describe("getOrCreateChild", () => {
    it("creates new child when none exists", async () => {
      const { getOrCreateChild } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null }); // no existing
      
      mocks.mockSingle.mockResolvedValue({ 
        data: { 
          id: "child-new", 
          family_id: "family-456", 
          nickname: "Test", 
          age_band: "6-8", 
          interests: ["space"], 
          created_at: "2026-01-01" 
        }, 
        error: null 
      });
      
      const child = await getOrCreateChild("family-456", "Test", "6-8", ["space"]);
      
      expect(child.id).toBe("child-new");
      expect(child.nickname).toBe("Test");
    });

    it("returns existing child when found", async () => {
      const { getOrCreateChild } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ 
        data: { 
          id: "child-existing", 
          family_id: "family-456", 
          nickname: "Test", 
          age_band: "6-8", 
          interests: ["space"], 
          created_at: "2026-01-01" 
        }, 
        error: null 
      });
      
      const child = await getOrCreateChild("family-456", "Test", "6-8", ["space"]);
      
      expect(child.id).toBe("child-existing");
    });
  });

  describe("createStory", () => {
    it("creates story and returns it", async () => {
      const { createStory } = await import("@/lib/db/queries");
      
      mocks.mockSingle.mockResolvedValue({ 
        data: { 
          id: "story-new", 
          family_id: "family-456", 
          title: "Test Story", 
          language: "hi-IN", 
          kind: "memory", 
          source_recording_id: null, 
          narrator_member_id: "member-123", 
          child_id: "child-456", 
          age_band: "6-8", 
          structure: { title: "Test Story", characters: [], moral: "", scenes: [] }, 
          created_at: "2026-01-01" 
        }, 
        error: null 
      });
      
      const story = await createStory({
        familyId: "family-456",
        title: "Test Story",
        language: "hi-IN",
        kind: "memory",
        sourceRecordingId: null,
        narratorMemberId: "member-123",
        childId: "child-456",
        ageBand: "6-8",
        structure: { title: "Test Story", characters: [], moral: "", scenes: [] },
      });
      
      expect(story.id).toBe("story-new");
      expect(story.title).toBe("Test Story");
    });
  });

  describe("getVoiceById", () => {
    it("returns voice without embedding when found", async () => {
      const { getVoiceById } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ 
        data: { 
          id: "voice-123", 
          member_id: "member-456", 
          label: "Dadi", 
          consent_at: "2026-01-01", 
          consent_text: "consent", 
          deleted_at: null, 
          created_at: "2026-01-01" 
        }, 
        error: null 
      });
      
      const voice = await getVoiceById("voice-123");
      
      expect(voice).not.toBeNull();
      expect(voice?.id).toBe("voice-123");
      expect(voice).not.toHaveProperty("speaker_embedding");
    });

    it("returns null when not found", async () => {
      const { getVoiceById } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      
      const voice = await getVoiceById("voice-123");
      
      expect(voice).toBeNull();
    });
  });

  describe("getVoiceByIdForTts", () => {
    it("returns voice with embedding when found", async () => {
      const { getVoiceByIdForTts } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ 
        data: { 
          id: "voice-123", 
          member_id: "member-456", 
          label: "Dadi", 
          speaker_embedding: "embedding-data", 
          consent_at: "2026-01-01", 
          consent_text: "consent", 
          deleted_at: null, 
          created_at: "2026-01-01" 
        }, 
        error: null 
      });
      
      const voice = await getVoiceByIdForTts("voice-123");
      
      expect(voice).not.toBeNull();
      expect(voice?.id).toBe("voice-123");
      expect(voice).toHaveProperty("speaker_embedding");
    });
  });

  describe("deleteStory", () => {
    it("deletes story when owned by family", async () => {
      const { deleteStory } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: { id: "story-123" }, error: null });
      mocks.mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "story-123" }, error: null }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      
      await expect(deleteStory("story-123", "family-456")).resolves.toBeUndefined();
    });

    it("throws when story not owned by family", async () => {
      const { deleteStory } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      
      await expect(deleteStory("story-123", "family-456")).rejects.toThrow("Story not found or access denied");
    });
  });

  describe("getStoryByIdForFamily", () => {
    it("returns story when owned by family", async () => {
      const { getStoryByIdForFamily } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ 
        data: { 
          id: "story-123", 
          family_id: "family-456", 
          title: "Test Story", 
          language: "hi-IN", 
          kind: "memory", 
          source_recording_id: null, 
          narrator_member_id: "member-123", 
          child_id: "child-456", 
          age_band: "6-8", 
          structure: {}, 
          created_at: "2026-01-01" 
        }, 
        error: null 
      });
      
      const story = await getStoryByIdForFamily("story-123", "family-456");
      
      expect(story).not.toBeNull();
      expect(story?.id).toBe("story-123");
    });

    it("returns null when not owned by family", async () => {
      const { getStoryByIdForFamily } = await import("@/lib/db/queries");
      
      mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      
      const story = await getStoryByIdForFamily("story-123", "family-456");
      
      expect(story).toBeNull();
    });
  });

  describe("signedStorageUrl", () => {
    it("returns signed URL on success", async () => {
      const { signedStorageUrl } = await import("@/lib/db/queries");
      
      mocks.mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed-url" }, error: null });
      
      const url = await signedStorageUrl("recordings", "path/to/file.wav");
      
      expect(url).toBe("https://signed-url");
    });

    it("throws on error", async () => {
      const { signedStorageUrl } = await import("@/lib/db/queries");
      
      mocks.mockCreateSignedUrl.mockResolvedValue({ data: null, error: new Error("Storage error") });
      
      await expect(signedStorageUrl("recordings", "path/to/file.wav")).rejects.toThrow("Failed to create signed URL");
    });
  });

  describe("Environment validation", () => {
    it("throws when Supabase env vars are missing", async () => {
      vi.resetModules();
      vi.doMock("@/lib/config", () => ({
        config: {
          supabase: { url: "", anonKey: "", serviceRoleKey: "" },
          gnani: { apiKey: "test", baseUrl: "test" },
          llm: { url: "test", key: "test", model: "test" },
          app: { url: "test", rateLimitPerIpPerMin: 10 },
        },
        requireServerSecret: vi.fn((name: string, value: string) => {
          if (!value) throw new Error(`Missing required server secret: ${name}`);
        }),
      }));
      
      const { validateSupabaseEnv } = await import("@/lib/db/queries");
      
      expect(() => validateSupabaseEnv()).toThrow("Missing required server secret: NEXT_PUBLIC_SUPABASE_URL");
    });

    it("throws when Gnani env vars are missing", async () => {
      vi.resetModules();
      vi.doMock("@/lib/config", () => ({
        config: {
          supabase: { url: "test", anonKey: "test", serviceRoleKey: "test" },
          gnani: { apiKey: "", baseUrl: "" },
          llm: { url: "test", key: "test", model: "test" },
          app: { url: "test", rateLimitPerIpPerMin: 10 },
        },
        requireServerSecret: vi.fn((name: string, value: string) => {
          if (!value) throw new Error(`Missing required server secret: ${name}`);
        }),
      }));
      
      const { validateGnaniEnv } = await import("@/lib/db/queries");
      
      expect(() => validateGnaniEnv()).toThrow("Missing required server secret: GNANI_API_KEY");
    });

    it("throws when LLM env vars are missing", async () => {
      vi.resetModules();
      vi.doMock("@/lib/config", () => ({
        config: {
          supabase: { url: "test", anonKey: "test", serviceRoleKey: "test" },
          gnani: { apiKey: "test", baseUrl: "test" },
          llm: { url: "", key: "test", model: "test" },
          app: { url: "test", rateLimitPerIpPerMin: 10 },
        },
        requireServerSecret: vi.fn((name: string, value: string) => {
          if (!value) throw new Error(`Missing required server secret: ${name}`);
        }),
      }));
      
      const { validateLlmEnv } = await import("@/lib/db/queries");
      
      expect(() => validateLlmEnv()).toThrow("Missing required server secret: LLM_URL");
    });
  });
});