import { describe, expect, it } from 'vitest';

import type { PointObservation } from '../src/types/rainfall';
import { calculateHourlyAccumulation, calculateProductAccumulation } from '../src/utils/analysis';

const point = { latitude: 35, longitude: 137 };

function observation(timestamp: string, rainfall1hMm: number | null): PointObservation {
  return { ...point, timestamp, rainfall1hMm };
}

describe('calculateHourlyAccumulation', () => {
  it('uses only non-overlapping hourly ending values', () => {
    const observations = [
      observation('2023-06-02T01:00:00+09:00', 10),
      observation('2023-06-02T01:30:00+09:00', 100),
      observation('2023-06-02T02:00:00+09:00', 20),
      observation('2023-06-02T02:30:00+09:00', 100),
      observation('2023-06-02T03:00:00+09:00', 30),
    ];
    expect(calculateHourlyAccumulation(observations, '2023-06-02T03:00:00+09:00', 3)).toEqual({
      value: 60,
      complete: true,
      expected: 3,
      available: 3,
    });
  });

  it('reports missing hours instead of treating them as zero', () => {
    const observations = [
      observation('2023-06-02T01:00:00+09:00', 10),
      observation('2023-06-02T03:00:00+09:00', 30),
    ];
    expect(calculateHourlyAccumulation(observations, '2023-06-02T03:00:00+09:00', 3)).toEqual({
      value: null,
      complete: false,
      expected: 3,
      available: 2,
    });
  });
});

describe('calculateProductAccumulation', () => {
  it('integrates 5-minute precipitation intensity without summing mm/h directly', () => {
    const observations = Array.from({ length: 12 }, (_, index) =>
      observation(`2023-06-02T00:${String((index + 1) * 5).padStart(2, '0')}:00+09:00`, 6),
    ).map((item, index) => index === 11 ? { ...item, timestamp: '2023-06-02T01:00:00+09:00' } : item);
    expect(
      calculateProductAccumulation(
        observations,
        '2023-06-02T01:00:00+09:00',
        1,
        'precipitation_intensity',
        5,
      ),
    ).toEqual({ value: 6, complete: true, expected: 12, available: 12 });
  });
});
