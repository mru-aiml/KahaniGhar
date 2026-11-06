// Real API implementation of StoryService
// Calls backend API routes per API Contract v1.1

import { apiClient, ApiError } from "./api-client";
import type { Story, CreateStoryInput, StoryFilters, StoryScene } from "@/types/story";

export class ApiStoryService {
  private basePath = "/stories";

  async list(): Promise<Story[]> {
    const response = await apiClient.get<{ success: true; data: { stories: Story[]; total: number; hasMore: boolean } }>(`${this.basePath}`);
    return response.data.stories;
  }

  async get(id: string): Promise<Story | null> {
    try {
      const response = await apiClient.get<{ success: true; data: Story }>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async create(input: CreateStoryInput): Promise<Story> {
    const response = await apiClient.post<{ success: true; data: Story }>(this.basePath, input);
    return response.data;
  }

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }

  async search(filters: StoryFilters): Promise<Story[]> {
    const params = new URLSearchParams();
    if (filters.query?.trim()) params.set("query", filters.query.trim());
    if (filters.language && filters.language !== "all") params.set("language", filters.language);
    if (filters.kind && filters.kind !== "all") params.set("kind", filters.kind);
    if (filters.narrator && filters.narrator !== "all") params.set("narrator", filters.narrator);

    const response = await apiClient.get<{ success: true; data: { stories: Story[]; total: number; hasMore: boolean } }>(
      `${this.basePath}?${params.toString()}`
    );
    return response.data.stories;
  }

  async branch(storyId: string, choice: string, storySoFar: StoryScene[]): Promise<StoryScene[]> {
    const response = await apiClient.post<{ success: true; data: { scenes: StoryScene[] } }>(
      `${this.basePath}/${storyId}/branch`,
      { choice, storySoFar }
    );
    return response.data.scenes;
  }
}

// Export singleton instance
export const apiStoryService = new ApiStoryService();