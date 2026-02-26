import { describe, it, expect } from 'vitest';

// Test the logic directly without hooks (pure function extraction)
const DEMO_INACTIVE_PHASES = ['block_b_done', 'block_c_done', 'completed'];

function isDemoActive(phase: string | undefined, isPending: boolean): boolean {
  return !isPending && !DEMO_INACTIVE_PHASES.includes(phase ?? 'not_started');
}

describe('useDemoMode logic', () => {
  it('should be in demo mode for not_started phase', () => {
    expect(isDemoActive('not_started', false)).toBe(true);
  });

  it('should be in demo mode for started phase', () => {
    expect(isDemoActive('started', false)).toBe(true);
  });

  it('should be in demo mode for block_a_done', () => {
    expect(isDemoActive('block_a_done', false)).toBe(true);
  });

  it('should NOT be in demo mode for block_b_done', () => {
    expect(isDemoActive('block_b_done', false)).toBe(false);
  });

  it('should NOT be in demo mode for block_c_done', () => {
    expect(isDemoActive('block_c_done', false)).toBe(false);
  });

  it('should NOT be in demo mode for completed', () => {
    expect(isDemoActive('completed', false)).toBe(false);
  });

  it('should NOT be in demo mode while loading', () => {
    expect(isDemoActive(undefined, true)).toBe(false);
  });

  it('should be in demo mode when phase is undefined and not pending', () => {
    expect(isDemoActive(undefined, false)).toBe(true);
  });
});
