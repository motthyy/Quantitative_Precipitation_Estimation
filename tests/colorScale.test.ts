import { describe, expect, it } from 'vitest';

import { rainfallColorScale } from '../src/config/rainfallColorScale';

describe('rainfall color scale', () => {
  it('is ordered and has a transparent zero class', () => {
    const values = rainfallColorScale.stops.map((stop) => stop.value);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(rainfallColorScale.stops[0]).toMatchObject({ value: 0 });
    expect(rainfallColorScale.stops[0].color.endsWith('00')).toBe(true);
  });
});

