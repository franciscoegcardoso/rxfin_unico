/**
 * Test Utilities
 * 
 * Custom render functions and utilities for testing React components.
 * Follows testing best practices from React Testing Library.
 */

import React, { ReactElement } from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { mockSupabase, mockUser, mockSession } from "../mocks/supabase";

// ============================================
// Mock Providers
// ============================================

// Create a new QueryClient for each test to ensure isolation
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Mock Auth Context Value
export const mockAuthContextValue = {
  user: null,
  session: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
};

export const mockAuthenticatedContextValue = {
  ...mockAuthContextValue,
  user: mockUser,
  session: mockSession,
};

// Mock Financial Context Value
export const mockFinancialContextValue = {
  config: {
    accountType: "individual" as const,
    incomeItems: [],
    expenseItems: [],
    drivers: [],
    goals: [],
    sharedWith: [],
    userProfile: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthDate: "",
    },
  },
  currentStep: 0,
  setCurrentStep: vi.fn(),
  setAccountType: vi.fn(),
  toggleIncomeItem: vi.fn(),
  updateIncomeValue: vi.fn(),
  updateIncomePaymentMethod: vi.fn(),
  toggleExpenseItem: vi.fn(),
  updateExpenseValue: vi.fn(),
  updateExpensePaymentMethod: vi.fn(),
  updateExpenseResponsible: vi.fn(),
  addDriver: vi.fn(),
  removeDriver: vi.fn(),
  updateDriver: vi.fn(),
  addDream: vi.fn(),
  removeDream: vi.fn(),
  updateDream: vi.fn(),
  updateUserProfile: vi.fn(),
  addSharedPerson: vi.fn(),
  removeSharedPerson: vi.fn(),
  updateSharedPerson: vi.fn(),
  completeOnboarding: vi.fn(),
  resetConfig: vi.fn(),
};

// ============================================
// Custom Render
// ============================================

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  withRouter?: boolean;
  withQueryClient?: boolean;
  queryClient?: QueryClient;
  initialRoute?: string;
}

/**
 * Custom render function that wraps components with necessary providers.
 * This ensures tests run in isolation without affecting real data.
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const {
    withRouter = true,
    withQueryClient = true,
    queryClient = createTestQueryClient(),
    initialRoute = "/",
    ...renderOptions
  } = options;

  // Set initial route
  if (withRouter) {
    window.history.pushState({}, "Test page", initialRoute);
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    let wrapped = children;

    if (withQueryClient) {
      wrapped = (
        <QueryClientProvider client={queryClient}>
          {wrapped}
        </QueryClientProvider>
      );
    }

    if (withRouter) {
      wrapped = <BrowserRouter>{wrapped}</BrowserRouter>;
    }

    return <>{wrapped}</>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// ============================================
// Async Utilities
// ============================================

/**
 * Wait for a condition to be true
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000
): Promise<void> => {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

/**
 * Wait for mock to be called
 */
export const waitForMock = async (
  mockFn: ReturnType<typeof vi.fn>,
  timeout = 5000
): Promise<void> => {
  await waitForCondition(() => mockFn.mock.calls.length > 0, timeout);
};

// ============================================
// Form Testing Utilities
// ============================================

/**
 * Fill a form field by label
 */
export const fillField = async (
  container: HTMLElement,
  labelText: string,
  value: string
) => {
  const user = userEvent.setup();
  const input = container.querySelector(
    `input[name="${labelText}"], textarea[name="${labelText}"]`
  ) as HTMLInputElement;
  
  if (input) {
    await user.clear(input);
    await user.type(input, value);
  }
};

/**
 * Submit a form
 */
export const submitForm = async (container: HTMLElement) => {
  const user = userEvent.setup();
  const submitButton = container.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;
  
  if (submitButton) {
    await user.click(submitButton);
  }
};

// ============================================
// Snapshot Utilities
// ============================================

/**
 * Create a sanitized snapshot that removes dynamic values
 */
export const createSanitizedSnapshot = (element: HTMLElement): string => {
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Remove dynamic IDs
  clone.querySelectorAll("[id]").forEach((el) => {
    el.setAttribute("id", "mock-id");
  });
  
  // Remove timestamps
  clone.querySelectorAll("[data-timestamp]").forEach((el) => {
    el.setAttribute("data-timestamp", "mock-timestamp");
  });
  
  return clone.innerHTML;
};

// ============================================
// Re-exports
// ============================================

export { render } from "@testing-library/react";
export { userEvent };
export { mockSupabase } from "../mocks/supabase";
