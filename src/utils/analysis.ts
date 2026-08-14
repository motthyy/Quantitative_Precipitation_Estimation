import type { PointObservation } from '../types/rainfall';

export interface AccumulationResult {
  value: number | null;
  complete: boolean;
  expected: number;
  available: number;
}

export function calculateHourlyAccumulation(
  observations: PointObservation[],
  endTimestamp: string,
  hours: number,
): AccumulationResult {
  const end = new Date(endTimestamp);
  end.setMinutes(0, 0, 0);
  const hourly = new Map(
    observations
      .filter((item) => new Date(item.timestamp).getMinutes() === 0)
      .map((item) => [new Date(item.timestamp).getTime(), item.rainfall1hMm] as const),
  );
  const values = Array.from({ length: hours }, (_, offset) =>
    hourly.get(end.getTime() - offset * 60 * 60 * 1000),
  );
  const available = values.filter((value) => value != null).length;
  if (available !== hours) {
    return { value: null, complete: false, expected: hours, available };
  }
  return {
    value: values.reduce<number>((sum, value) => sum + (value ?? 0), 0),
    complete: true,
    expected: hours,
    available,
  };
}

export function calculateProductAccumulation(
  observations: PointObservation[],
  endTimestamp: string,
  hours: number,
  quantity: 'preceding_1h' | 'precipitation_intensity',
  intervalMinutes: number,
): AccumulationResult {
  if (quantity === 'preceding_1h') {
    return calculateHourlyAccumulation(observations, endTimestamp, hours);
  }
  const end = new Date(endTimestamp).getTime();
  const start = end - hours * 60 * 60 * 1000;
  const values = observations
    .filter((item) => {
      const timestamp = new Date(item.timestamp).getTime();
      return timestamp > start && timestamp <= end;
    })
    .map((item) => item.rainfall1hMm);
  const expected = Math.round((hours * 60) / intervalMinutes);
  const available = values.filter((value) => value != null).length;
  if (available !== expected) {
    return { value: null, complete: false, expected, available };
  }
  return {
    value: values.reduce<number>((sum, value) => sum + (value ?? 0) * intervalMinutes / 60, 0),
    complete: true,
    expected,
    available,
  };
}

export interface RainfallIndexCalculator {
  id: string;
  label: string;
  configured: boolean;
  calculate(observations: PointObservation[]): number | null;
}

export const unconfiguredEffectiveRainfall: RainfallIndexCalculator = {
  id: 'effective-rainfall',
  label: '実効雨量',
  configured: false,
  calculate: () => null,
};
