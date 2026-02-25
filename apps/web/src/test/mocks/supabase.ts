import { vi } from "vitest";
import type { User, Session } from "@supabase/supabase-js";

// ============================================
// Mock Supabase Client
// ============================================
// This mock prevents any real database operations during tests.
// All methods return predictable mock data.

export const mockUser: User = {
  id: "test-user-id-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {
    full_name: "Test User",
  },
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

export const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockUser,
};

export const mockAdminUser: User = {
  ...mockUser,
  id: "admin-user-id-456",
  email: "admin@example.com",
  user_metadata: {
    full_name: "Admin User",
  },
};

// Create chainable mock for query builder
const createQueryBuilderMock = (data: any[] = [], error: any = null) => {
  const mock: any = {
    select: vi.fn(() => mock),
    insert: vi.fn(() => mock),
    update: vi.fn(() => mock),
    delete: vi.fn(() => mock),
    upsert: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    neq: vi.fn(() => mock),
    gt: vi.fn(() => mock),
    gte: vi.fn(() => mock),
    lt: vi.fn(() => mock),
    lte: vi.fn(() => mock),
    like: vi.fn(() => mock),
    ilike: vi.fn(() => mock),
    is: vi.fn(() => mock),
    in: vi.fn(() => mock),
    contains: vi.fn(() => mock),
    containedBy: vi.fn(() => mock),
    range: vi.fn(() => mock),
    order: vi.fn(() => mock),
    limit: vi.fn(() => mock),
    offset: vi.fn(() => mock),
    single: vi.fn(() => Promise.resolve({ data: data[0] || null, error })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: data[0] || null, error })),
    then: vi.fn((resolve) => resolve({ data, error, count: data.length })),
  };
  return mock;
};

// Auth mock with proper typing
export const mockAuth = {
  getSession: vi.fn().mockImplementation(() =>
    Promise.resolve({ data: { session: null }, error: null })
  ),
  getUser: vi.fn().mockImplementation(() => 
    Promise.resolve({ data: { user: null }, error: null })
  ),
  signUp: vi.fn().mockImplementation(() =>
    Promise.resolve({ data: { user: mockUser, session: mockSession }, error: null })
  ),
  signInWithPassword: vi.fn().mockImplementation((_credentials: any) =>
    Promise.resolve({ data: { user: mockUser, session: mockSession }, error: null })
  ),
  signOut: vi.fn().mockImplementation(() => 
    Promise.resolve({ error: null })
  ),
  onAuthStateChange: vi.fn().mockImplementation(() => ({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  })),
  resetPasswordForEmail: vi.fn().mockImplementation(() => 
    Promise.resolve({ data: {}, error: null })
  ),
  updateUser: vi.fn().mockImplementation(() =>
    Promise.resolve({ data: { user: mockUser }, error: null })
  ),
  getClaims: vi.fn().mockImplementation(() => 
    Promise.resolve({ data: { claims: { sub: mockUser.id } }, error: null })
  ),
};

// Storage mock with proper typing
export const mockStorage = {
  from: vi.fn().mockImplementation((_bucket: string) => ({
    upload: vi.fn().mockImplementation((_path: string, _file: any) => 
      Promise.resolve({ data: { path: "test-path" }, error: null })
    ),
    download: vi.fn().mockImplementation(() => 
      Promise.resolve({ data: new Blob(), error: null })
    ),
    remove: vi.fn().mockImplementation(() => 
      Promise.resolve({ data: [], error: null })
    ),
    list: vi.fn().mockImplementation(() => 
      Promise.resolve({ data: [], error: null })
    ),
    getPublicUrl: vi.fn().mockImplementation((_path: string) => 
      ({ data: { publicUrl: "https://example.com/file.png" } })
    ),
  })),
};

// Functions mock with proper typing
export const mockFunctions = {
  invoke: vi.fn().mockImplementation((_name: string, _options?: any) =>
    Promise.resolve({ data: { success: true }, error: null })
  ),
};

// Realtime mock
export const mockRealtime = {
  channel: vi.fn().mockImplementation(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation(() => ({ unsubscribe: vi.fn() })),
  })),
};

// Store for table data mocks
let tableDataStore: Record<string, any[]> = {};

// Main Supabase client mock
export const createMockSupabaseClient = (overrides?: {
  data?: any;
  error?: any;
}) => {
  const defaultQueryBuilder = createQueryBuilderMock(
    overrides?.data || [],
    overrides?.error || null
  );

  return {
    auth: mockAuth,
    storage: mockStorage,
    functions: mockFunctions,
    channel: mockRealtime.channel,
    from: vi.fn().mockImplementation((tableName: string) => {
      if (tableDataStore[tableName]) {
        return createQueryBuilderMock(tableDataStore[tableName]);
      }
      return defaultQueryBuilder;
    }),
    rpc: vi.fn().mockImplementation(() => 
      Promise.resolve({ data: null, error: null })
    ),
  };
};

// Default mock instance
export const mockSupabase = createMockSupabaseClient();

// Helper to setup authenticated state
export const setupAuthenticatedMock = (user: User = mockUser) => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: { ...mockSession, user } },
    error: null,
  });
  mockAuth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  });
};

// Helper to setup unauthenticated state
export const setupUnauthenticatedMock = () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  mockAuth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
};

// Helper to mock table data
export const mockTableData = (tableName: string, data: any[]) => {
  tableDataStore[tableName] = data;
  return createQueryBuilderMock(data);
};

// Reset all mocks
export const resetSupabaseMocks = () => {
  vi.clearAllMocks();
  tableDataStore = {};
  setupUnauthenticatedMock();
};
