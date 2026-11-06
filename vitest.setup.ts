// Vitest setup file - runs before all tests
import { vi } from "vitest";

// Set required environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.GNANI_API_KEY = "test-gnani-key";
process.env.GNANI_BASE_URL = "https://api.vachana.ai";
process.env.LLM_URL = "http://localhost:8000";
process.env.LLM_KEY = "test-llm-key";

// Mock Next.js cookies for server components
const mockCookies = vi.fn(() => ({
  getAll: vi.fn(() => []),
  set: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
  headers: vi.fn(() => new Headers()),
}));

// Mock @supabase/supabase-js globally
const mockAuthGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockOr = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockStorageFrom = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockUpload = vi.fn();
const mockRemove = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockAuthGetUser,
    },
    from: mockFrom,
    storage: {
      from: mockStorageFrom,
    },
  })),
}));

// Export mocks for use in tests
export const mocks = {
  mockAuthGetUser,
  mockFrom,
  mockSelect,
  mockEq,
  mockMaybeSingle,
  mockSingle,
  mockOrder,
  mockRange,
  mockOr,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockStorageFrom,
  mockCreateSignedUrl,
  mockUpload,
  mockRemove,
  mockCookies,
};

// Helper to reset all mocks
export function resetAllMocks() {
  Object.values(mocks).forEach(m => m.mockReset());
  
  // Re-setup default chainable mocks
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  });
  
  mockSelect.mockReturnValue({
    eq: mockEq,
    or: mockOr,
    order: mockOrder,
    range: mockRange,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  });
  
  mockEq.mockReturnValue({
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  });
  
  mockOr.mockReturnValue({
    order: mockOrder,
    range: mockRange,
  });
  
  mockOrder.mockReturnValue({
    range: mockRange,
  });
  
  mockRange.mockReturnValue({});
  
  mockInsert.mockReturnValue({
    select: mockSelect,
    single: mockSingle,
  });
  
  mockUpdate.mockReturnValue({
    eq: mockEq,
  });
  
  mockDelete.mockReturnValue({
    eq: mockEq,
  });
  
  mockStorageFrom.mockReturnValue({
    createSignedUrl: mockCreateSignedUrl,
    upload: mockUpload,
    remove: mockRemove,
  });
  
  mockCookies.mockReturnValue({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  });
}

// Auto-reset before each test
import { beforeEach } from "vitest";
beforeEach(() => {
  resetAllMocks();
});