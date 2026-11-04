// Story service interface + mock implementation. UI components depend on the
// interface only, so swapping to real API routes later is a one-file change.

import type { Story, CreateStoryInput, StoryFilters } from "@/types/story";
import { MOCK_STORIES } from "@/lib/data/mock-stories";

export interface StoryService {
  list(): Promise<Story[]>;
  get(id: string): Promise<Story | null>;
  create(input: CreateStoryInput): Promise<Story>;
  remove(id: string): Promise<void>;
  search(filters: StoryFilters): Promise<Story[]>;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// In-memory mock store (clearly labelled; not Supabase).
const store: Story[] = [...MOCK_STORIES];

export const mockStoryService: StoryService = {
  async list() {
    await delay(200);
    return [...store].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async get(id) {
    await delay(120);
    return store.find((s) => s.id === id) ?? null;
  },
  async create(input) {
    await delay(1200); // simulate generation latency
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
    return story;
  },
  async remove(id) {
    await delay(200);
    const idx = store.findIndex((s) => s.id === id);
    if (idx >= 0) store.splice(idx, 1);
  },
  async search(filters) {
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

// Default export is the mock; swap this binding when backend is ready.
export const storyService: StoryService = mockStoryService;