export function formatRainfall(value: number | null | undefined, unit = 'mm'): string {
  if (value == null || Number.isNaN(value)) {
    return '欠測';
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${unit}`;
}

export function formatCoordinate(value: number): string {
  return value.toFixed(5);
}
