// Service registry for selecting between mock and real API implementations
// Mode is determined by environment variable or explicit configuration

import type { StoryService } from "@/types/story";
import { mockStoryService } from "./story-service";
import { apiStoryService } from "./api-story-service";

export type ServiceMode = "mock" | "api" | "auto";

let currentMode: ServiceMode = "auto";
let currentService: StoryService = mockStoryService;

export function getServiceMode(): ServiceMode {
  return currentMode;
}

export function setServiceMode(mode: ServiceMode): void {
  currentMode = mode;
  currentService = resolveService(mode);
}

function resolveService(mode: ServiceMode): StoryService {
  switch (mode) {
    case "mock":
      return mockStoryService;
    case "api":
      return apiStoryService;
    case "auto":
      // In production (no development env), default to API
      // In development, default to mock unless explicitly configured
      if (typeof window !== "undefined") {
        const envMode = process.env.NEXT_PUBLIC_SERVICE_MODE as ServiceMode | undefined;
        if (envMode === "api" || envMode === "mock") {
          return envMode === "api" ? apiStoryService : mockStoryService;
        }
        // Default to mock in development for safety
        return mockStoryService;
      }
      return mockStoryService;
  }
}

export function getStoryService(): StoryService {
  return currentService;
}

// Initialize on module load
currentService = resolveService(currentMode);

// Re-export types for convenience
export type { Story, CreateStoryInput, StoryFilters, StoryScene, StoryStructure, ChildProfile } from "@/types/story";