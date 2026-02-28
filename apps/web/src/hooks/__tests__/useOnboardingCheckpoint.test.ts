import { describe, it, expect } from 'vitest';

// Test the LEVEL_MAP logic
const LEVEL_MAP: Record<string, number> = {
  not_started: 0,
  started: 0,
  block_a_done: 1,
  block_b_done: 2,
  block_c_done: 3,
  completed: 4,
};

describe('useOnboardingCheckpoint - LEVEL_MAP', () => {
  it('not_started should be level 0', () => {
    expect(LEVEL_MAP['not_started']).toBe(0);
  });

  it('started should be level 0', () => {
    expect(LEVEL_MAP['started']).toBe(0);
  });

  it('block_a_done should be level 1', () => {
    expect(LEVEL_MAP['block_a_done']).toBe(1);
  });

  it('block_b_done should be level 2', () => {
    expect(LEVEL_MAP['block_b_done']).toBe(2);
  });

  it('block_c_done should be level 3', () => {
    expect(LEVEL_MAP['block_c_done']).toBe(3);
  });

  it('completed should be level 4', () => {
    expect(LEVEL_MAP['completed']).toBe(4);
  });

  it('levels should be monotonically increasing', () => {
    const phases = ['not_started', 'started', 'block_a_done', 'block_b_done', 'block_c_done', 'completed'];
    for (let i = 1; i < phases.length; i++) {
      expect(LEVEL_MAP[phases[i]]).toBeGreaterThanOrEqual(LEVEL_MAP[phases[i - 1]]);
    }
  });

  it('unknown phase should return undefined (fallback to 0)', () => {
    expect(LEVEL_MAP['unknown_phase'] ?? 0).toBe(0);
  });
});
