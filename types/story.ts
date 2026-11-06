// Shared frontend types for KahaniGhar. Mirror the documented data model
// (architecture.md section 4) without depending on Supabase.

export type AgeBand = "3-5" | "6-8" | "9-10";
export type StoryKind = "memory" | "folklore" | "generated";
export type StoryLanguage = "hi-IN" | "en-IN" | "hi-en" | "mr-IN" | "ta-IN" | "te-IN";

export interface StoryScene {
  idx: number;
  text: string;
  /** 2-3 choices when present (enforced by LLM schema) */
  choices?: string[];
}

export interface StoryStructure {
  title: string;
  characters: string[];
  moral: string;
  scenes: StoryScene[];
}

export interface Story {
  id: string;
  title: string;
  language: StoryLanguage;
  kind: StoryKind;
  ageBand: AgeBand;
  childNickname: string;
  interests: string[];
  narrator: string;
  structure: StoryStructure;
  /** Full ISO 8601 timestamp with timezone, e.g. 2026-11-05T14:30:00.123Z */
  createdAt: string;
  // Audio URLs are per-scene, returned by TTS API; not stored on Story.
}

export interface ChildProfile {
  nickname: string;
  ageBand: AgeBand;
  interests: string[];
}

export interface CreateStoryInput {
  transcript: string;
  language: StoryLanguage;
  child: ChildProfile;
  kind: StoryKind;
  interactive: boolean;
}

export interface StoryFilters {
  query?: string;
  language?: StoryLanguage | "all";
  kind?: StoryKind | "all";
  narrator?: string | "all";
}

export interface StoryService {
  list(): Promise<Story[]>;
  get(id: string): Promise<Story | null>;
  create(input: CreateStoryInput): Promise<Story>;
  remove(id: string): Promise<void>;
  search(filters: StoryFilters): Promise<Story[]>;
}

export const LANGUAGE_LABELS: Record<StoryLanguage, string> = {
  "hi-IN": "हिन्दी",
  "en-IN": "English",
  "hi-en": "Hinglish",
  "mr-IN": "मराठी",
  "ta-IN": "தமிழ்",
  "te-IN": "తెలుగు",
};

export const INTEREST_OPTIONS = [
  "animals", "space", "cricket", "trains", "rivers", "music", "dancing",
  "painting", "stories", "gardening", "cooking", "flying",
] as const;