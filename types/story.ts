// Shared frontend types for KahaniGhar. Mirror the documented data model
// (architecture.md section 4) without depending on Supabase.

export type AgeBand = "3-5" | "6-8" | "9-10";
export type StoryKind = "memory" | "folklore" | "generated";
export type StoryLanguage = "hi-IN" | "en-IN" | "hi-en" | "mr-IN" | "ta-IN" | "te-IN";

export interface StoryScene {
  idx: number;
  text: string;
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
  createdAt: string;
  // Optional audio for demo playback (public path or signed URL later)
  audioUrl?: string;
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