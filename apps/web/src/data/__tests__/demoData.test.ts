import { describe, it, expect } from 'vitest';
import { demoData, demoIncomes, demoExpenses, demoAssets, demoDebts, demoCashFlow, demoGoals } from '../demoData';

describe('demoData', () => {
  it('should have at least 2 income sources', () => {
    expect(demoIncomes.length).toBeGreaterThanOrEqual(2);
  });

  it('should have at least 5 expense items', () => {
    expect(demoExpenses.length).toBeGreaterThanOrEqual(5);
  });

  it('should have at least 3 assets', () => {
    expect(demoAssets.length).toBeGreaterThanOrEqual(3);
  });

  it('should have at least 1 debt', () => {
    expect(demoDebts.length).toBeGreaterThanOrEqual(1);
  });

  it('should have 6 months of cash flow', () => {
    expect(demoCashFlow).toHaveLength(6);
  });

  it('should have at least 1 goal', () => {
    expect(demoGoals.length).toBeGreaterThanOrEqual(1);
  });

  it('summary totalIncome should match sum of incomes', () => {
    const sum = demoIncomes.reduce((acc, i) => acc + i.value, 0);
    expect(demoData.summary.totalIncome).toBe(sum);
  });

  it('summary totalExpenses should match sum of expenses', () => {
    const sum = demoExpenses.reduce((acc, e) => acc + e.value, 0);
    expect(demoData.summary.totalExpenses).toBe(sum);
  });

  it('savingsCapacity should equal totalIncome - totalExpenses', () => {
    expect(demoData.summary.savingsCapacity).toBe(
      demoData.summary.totalIncome - demoData.summary.totalExpenses
    );
  });

  it('netWorth should equal totalAssets - totalDebts', () => {
    expect(demoData.summary.netWorth).toBe(
      demoData.summary.totalAssets - demoData.summary.totalDebts
    );
  });

  it('all incomes should have unique ids', () => {
    const ids = demoIncomes.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all expenses should have a category', () => {
    demoExpenses.forEach(e => {
      expect(e.category).toBeTruthy();
      expect(e.category_id).toBeTruthy();
    });
  });

  it('cash flow months should be in YYYY-MM format', () => {
    demoCashFlow.forEach(cf => {
      expect(cf.month).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  it('each cash flow balance should equal income - expenses', () => {
    demoCashFlow.forEach(cf => {
      expect(cf.balance).toBe(cf.income - cf.expenses);
    });
  });
});
