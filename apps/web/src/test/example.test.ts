/**
 * Example Test File
 * 
 * Demonstrates testing patterns without hitting the real database.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  setupAuthenticatedMock,
  setupUnauthenticatedMock,
  resetSupabaseMocks,
  mockUser,
  mockTableData,
  mockAuth,
  mockFunctions,
  mockStorage,
  mockSupabase,
} from "./mocks/supabase";
import {
  mockLancamentos,
  mockFinancialConfig,
  createMockTransaction,
} from "./mocks/handlers";

describe("Supabase Mock Tests", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe("Authentication", () => {
    it("should simulate unauthenticated state", async () => {
      setupUnauthenticatedMock();
      
      const { data } = await mockAuth.getSession();
      
      expect(data.session).toBeNull();
    });

    it("should simulate authenticated state", async () => {
      setupAuthenticatedMock();
      
      const { data } = await mockAuth.getSession();
      
      expect(data.session).not.toBeNull();
      expect(data.session?.user.email).toBe("test@example.com");
    });

    it("should simulate sign in", async () => {
      const { data, error } = await mockAuth.signInWithPassword({
        email: "test@example.com",
        password: "password123",
      });

      expect(error).toBeNull();
      expect(data.user).toEqual(mockUser);
    });

    it("should simulate sign out", async () => {
      setupAuthenticatedMock();
      
      const { error } = await mockAuth.signOut();
      
      expect(error).toBeNull();
    });
  });

  describe("Database Operations", () => {
    it("should mock table queries", async () => {
      mockTableData("lancamentos_realizados", mockLancamentos);

      const queryBuilder = mockSupabase.from("lancamentos_realizados");
      const result = await queryBuilder.select("*").eq("user_id", "test-user-id-123");

      expect(result.data).toEqual(mockLancamentos);
    });

    it("should mock single record fetch", async () => {
      mockTableData("lancamentos_realizados", mockLancamentos);

      const queryBuilder = mockSupabase.from("lancamentos_realizados");
      const { data } = await queryBuilder.select("*").eq("id", "lanc-1").single();

      expect(data).toEqual(mockLancamentos[0]);
    });

    it("should handle empty results", async () => {
      mockTableData("lancamentos_realizados", []);

      const queryBuilder = mockSupabase.from("lancamentos_realizados");
      const result = await queryBuilder.select("*");

      expect(result.data).toEqual([]);
    });
  });

  describe("Edge Functions", () => {
    it("should mock function invocation", async () => {
      mockFunctions.invoke.mockResolvedValueOnce({
        data: { emails_sent: 5, success: true },
        error: null,
      });

      const { data, error } = await mockFunctions.invoke("send-campaign-email", {
        body: { campaignId: "test-123", segment: "all_users" },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(mockFunctions.invoke).toHaveBeenCalledWith(
        "send-campaign-email",
        expect.objectContaining({
          body: { campaignId: "test-123", segment: "all_users" },
        })
      );
    });
  });

  describe("Storage", () => {
    it("should mock file upload", async () => {
      const mockFile = new File(["test"], "test.txt", { type: "text/plain" });
      
      const bucket = mockStorage.from("documents");
      const { data, error } = await bucket.upload("test-path/test.txt", mockFile);

      expect(error).toBeNull();
      expect(data?.path).toBe("test-path");
    });

    it("should mock public URL retrieval", () => {
      const bucket = mockStorage.from("documents");
      const { data } = bucket.getPublicUrl("test-file.png");

      expect(data.publicUrl).toBe("https://example.com/file.png");
    });
  });
});

describe("Data Factory Tests", () => {
  it("should create unique mock transactions", () => {
    const tx1 = createMockTransaction({ nome: "Transaction 1" });
    const tx2 = createMockTransaction({ nome: "Transaction 2" });

    expect(tx1.id).not.toBe(tx2.id);
    expect(tx1.nome).toBe("Transaction 1");
    expect(tx2.nome).toBe("Transaction 2");
  });

  it("should use default values when no overrides", () => {
    const tx = createMockTransaction();

    expect(tx.tipo).toBe("despesa");
    expect(tx.user_id).toBe("test-user-id-123");
    expect(tx.valor_previsto).toBe(100);
  });
});

describe("Financial Config Tests", () => {
  it("should have valid income items structure", () => {
    expect(mockFinancialConfig.incomeItems.length).toBeGreaterThan(0);
    
    mockFinancialConfig.incomeItems.forEach((item) => {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("value");
      expect(item).toHaveProperty("enabled");
    });
  });

  it("should have valid expense items structure", () => {
    expect(mockFinancialConfig.expenseItems.length).toBeGreaterThan(0);
    
    mockFinancialConfig.expenseItems.forEach((item) => {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("categoryId");
      expect(item).toHaveProperty("paymentMethod");
    });
  });

  it("should calculate totals correctly", () => {
    const totalIncome = mockFinancialConfig.incomeItems.reduce(
      (sum, item) => sum + (item.enabled ? item.value : 0),
      0
    );
    const totalExpenses = mockFinancialConfig.expenseItems.reduce(
      (sum, item) => sum + (item.enabled ? item.value : 0),
      0
    );

    expect(totalIncome).toBe(6500); // 5000 + 1500
    expect(totalExpenses).toBe(2720); // 1800 + 800 + 120
  });
});
