import { describe, it, expect } from 'vitest';

// Test the getActiveBlock logic (aligned with OnboardingWizardV3.tsx)
type ActiveBlock = 'A' | 'B' | 'C' | 'D';

function getActiveBlock(phase: string): ActiveBlock {
  switch (phase) {
    case 'block_c_done': return 'D';
    case 'block_b_done': return 'C';
    case 'block_a_done': return 'B';
    default: return 'A';
  }
}

const BLOCK_STEPS = { A: 6, B: 5, C: 5, D: 4 } as const;

describe('OnboardingWizardV3 logic', () => {
  describe('getActiveBlock', () => {
    it('should return A for not_started', () => {
      expect(getActiveBlock('not_started')).toBe('A');
    });

    it('should return A for started', () => {
      expect(getActiveBlock('started')).toBe('A');
    });

    it('should return B for block_a_done', () => {
      expect(getActiveBlock('block_a_done')).toBe('B');
    });

    it('should return C for block_b_done', () => {
      expect(getActiveBlock('block_b_done')).toBe('C');
    });

    it('should return D for block_c_done', () => {
      expect(getActiveBlock('block_c_done')).toBe('D');
    });

    it('should return A for completed (fallback)', () => {
      expect(getActiveBlock('completed')).toBe('A');
    });
  });

  describe('BLOCK_STEPS', () => {
    it('Block A should have 6 steps', () => {
      expect(BLOCK_STEPS.A).toBe(6);
    });

    it('Block B should have 5 steps', () => {
      expect(BLOCK_STEPS.B).toBe(5);
    });

    it('Block C should have 5 steps', () => {
      expect(BLOCK_STEPS.C).toBe(5);
    });

    it('Block D should have 4 steps', () => {
      expect(BLOCK_STEPS.D).toBe(4);
    });
  });
});
