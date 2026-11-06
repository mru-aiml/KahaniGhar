// API client for backend integration
// Provides consistent response parsing, typed error handling, and request utilities

import type { ApiErrorResponse } from "@/lib/api/schemas";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly details?: Record<string, unknown>
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_BASE_URL = "/api";

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  async function request<T>(
    path: string,
    init: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    const { timeout: requestTimeout = timeout, ...fetchInit } = init;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...fetchInit,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...fetchInit.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle signed URL responses (direct audio streaming)
      if (path.includes("/tts") && response.ok) {
        return response as unknown as T;
      }

      // Parse JSON response
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorResponse = data as ApiErrorResponse | null;
        const error = new ApiError(
          errorResponse?.error?.code ?? `HTTP_${response.status}`,
          response.status,
          response.status === 429 || response.status >= 500,
          errorResponse?.error?.details
        );
        error.message = errorResponse?.error?.message ?? response.statusText;

        // Handle auth errors
        if (response.status === 401) {
          options.onUnauthorized?.();
        } else if (response.status === 403) {
          options.onForbidden?.();
        }

        throw error;
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError("TIMEOUT", 0, true, { message: "Request timeout" });
      }
      throw new ApiError("NETWORK_ERROR", 0, true, { message: String(error) });
    }
  }

  return {
    get: <T>(path: string, options?: { timeout?: number }) =>
      request<T>(path, { method: "GET", ...options }),

    post: <T>(path: string, body: unknown, options?: { timeout?: number }) =>
      request<T>(path, {
        method: "POST",
        body: JSON.stringify(body),
        ...options,
      }),

    postForm: <T>(path: string, formData: FormData, options?: { timeout?: number }) =>
      request<T>(path, {
        method: "POST",
        body: formData,
        headers: {}, // Let browser set Content-Type with boundary
        ...options,
      }),

    delete: <T>(path: string, options?: { timeout?: number }) =>
      request<T>(path, { method: "DELETE", ...options }),
  };
}

export const apiClient = createApiClient();