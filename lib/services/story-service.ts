// Story service interface + mock implementation. UI components depend on the
// interface only, so swapping to real API routes later is a one-file change.
//
// Demo persistence: newly created/deleted stories are persisted to localStorage
// on the client so they survive navigation and refreshes. This is a CLIENT-SIDE
// demo convenience only — it is NOT Supabase and stores only synthetic demo
// story data (no secrets, no recordings, no real child data).

import type { Story, CreateStoryInput, StoryFilters } from "@/types/story";
import { MOCK_STORIES } from "@/lib/data/mock-stories";

export interface StoryService {
  list(): Promise<Story[]>;
  get(id: string): Promise<Story | null>;
  create(input: CreateStoryInput): Promise<Story>;
  remove(id: string): Promise<void>;
  search(filters: StoryFilters): Promise<Story[]>;
}

const STORAGE_KEY = "kahani-ghar:stories:v1";

interface StorageResult<T> {
  data: T | null;
  error: string | null;
}

function readStorage(): StorageResult<Story[]> {
  if (typeof window === "undefined") return { data: null, error: "Not in browser environment" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: null, error: null };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { data: null, error: "Invalid storage format" };
    return { data: parsed as Story[], error: null };
  } catch {
    return { data: null, error: "Failed to read from storage" };
  }
}

function writeStorage(stories: Story[]): StorageResult<void> {
  if (typeof window === "undefined") return { data: null, error: "Not in browser environment" };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: "Failed to save to storage (quota exceeded or disabled)" };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// In-memory store, hydrated from localStorage on first client access.
let store: Story[] = [...MOCK_STORIES];
let hydrated = false;

function ensureHydrated(): void {
  if (hydrated) return;
  if (typeof window === "undefined") return;
  const result = readStorage();
  if (result.error) {
    console.warn("localStorage read failed:", result.error);
    return;
  }
  if (result.data && result.data.length > 0) store = result.data;
  hydrated = true;
}

export const mockStoryService: StoryService = {
  async list() {
    ensureHydrated();
    await delay(200);
    return [...store].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async get(id) {
    ensureHydrated();
    await delay(120);
    return store.find((s) => s.id === id) ?? null;
  },
  async create(input) {
    ensureHydrated();
    await delay(1200);
    const id = `story-${Date.now()}`;
    const story: Story = {
      id,
      title: `A story for ${input.child.nickname}`,
      language: input.language,
      kind: input.kind,
      ageBand: input.child.ageBand,
      childNickname: input.child.nickname,
      interests: input.child.interests,
      narrator: "Family",
      createdAt: new Date().toISOString().slice(0, 10),
      structure: {
        title: `A story for ${input.child.nickname}`,
        characters: [input.child.nickname],
        moral: "Every story begins with a single word.",
        scenes: [
          { idx: 0, text: `Once upon a time, ${input.child.nickname} had a wonderful idea: ${input.transcript.slice(0, 80)}...` },
          { idx: 1, text: "The adventure began with a single step into the unknown." },
          { idx: 2, text: "Along the way, new friends appeared and helped along the journey.", choices: ["Follow the friend", "Take the quiet path"] },
          { idx: 3, text: "By choosing kindly, the path opened into a beautiful garden." },
          { idx: 4, text: "And so, with a happy heart, the day ended in a warm hug." },
        ],
      },
    };
    store.unshift(story);
    const writeResult = writeStorage(store);
    if (writeResult.error) {
      console.warn("localStorage write failed:", writeResult.error);
    }
    return story;
  },
  async remove(id) {
    ensureHydrated();
    await delay(200);
    const idx = store.findIndex((s) => s.id === id);
    if (idx >= 0) store.splice(idx, 1);
    const writeResult = writeStorage(store);
    if (writeResult.error) {
      console.warn("localStorage write failed:", writeResult.error);
    }
  },
  async search(filters) {
    ensureHydrated();
    await delay(150);
    let result = [...store];
    if (filters.query?.trim()) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.childNickname.toLowerCase().includes(q) ||
          s.narrator.toLowerCase().includes(q),
      );
    }
    if (filters.language && filters.language !== "all") {
      result = result.filter((s) => s.language === filters.language);
    }
    if (filters.kind && filters.kind !== "all") {
      result = result.filter((s) => s.kind === filters.kind);
    }
    if (filters.narrator && filters.narrator !== "all") {
      result = result.filter((s) => s.narrator === filters.narrator);
    }
    return result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
};

export const storyService = mockStoryService;