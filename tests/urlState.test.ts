import { describe, expect, it } from 'vitest';

import { createShareUrl, parseUrlState } from '../src/utils/urlState';

describe('URL state', () => {
  it('parses map, point and timestamp parameters', () => {
    const state = parseUrlState(
      '?product=radar250m&date=2018-07-07&time=19%3A00&lat=35.1&lon=137.2&zoom=8&pointLat=34&pointLon=132&opacity=.65&layers=rainfall,railways',
    );
    expect(state.timestamp).toBe('2018-07-07T19:00:00+09:00');
    expect(state.productId).toBe('radar250m');
    expect(state.mapView).toMatchObject({ latitude: 35.1, longitude: 137.2, zoom: 8 });
    expect(state.selectedPoint).toEqual({ latitude: 34, longitude: 132 });
    expect(state.opacity).toBe(0.65);
    expect(state.layers?.railways).toBe(true);
    expect(state.layers?.stations).toBe(false);
  });

  it('creates a shareable URL without sensitive or transient data', () => {
    const url = new URL(
      createShareUrl({
        productId: 'analyzed',
        timestamp: '2018-07-07T19:00:00+09:00',
        mapView: { latitude: 35.1, longitude: 137.2, zoom: 8, bearing: 0, pitch: 0 },
        selectedPoint: { latitude: 34, longitude: 132 },
        opacity: 0.7,
        layers: { rainfall: true, railways: true, stations: false, disasters: false },
      }),
    );
    expect(url.searchParams.get('date')).toBe('2018-07-07');
    expect(url.searchParams.get('product')).toBe('analyzed');
    expect(url.searchParams.get('time')).toBe('19:00');
    expect(url.searchParams.get('layers')).toBe('rainfall,railways');
  });
});
