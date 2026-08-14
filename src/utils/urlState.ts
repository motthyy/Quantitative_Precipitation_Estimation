import type { MapViewState, RainfallProductId, SelectedPoint, VisibleLayers } from '../types/rainfall';

export interface UrlState {
  productId?: RainfallProductId;
  timestamp?: string;
  mapView?: Partial<MapViewState>;
  selectedPoint?: SelectedPoint;
  opacity?: number;
  layers?: Partial<VisibleLayers>;
}

function finite(value: string | null): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseUrlState(search: string): UrlState {
  const query = new URLSearchParams(search);
  const product = query.get('product');
  const date = query.get('date');
  const time = query.get('time');
  const latitude = finite(query.get('lat'));
  const longitude = finite(query.get('lon'));
  const pointLatitude = finite(query.get('pointLat'));
  const pointLongitude = finite(query.get('pointLon'));
  const layers = query.get('layers')?.split(',') ?? [];
  return {
    productId: product === 'radar250m' || product === 'analyzed' ? product : undefined,
    timestamp: date && time ? `${date}T${time}:00+09:00` : undefined,
    mapView:
      latitude != null && longitude != null
        ? {
            latitude,
            longitude,
            zoom: finite(query.get('zoom')),
            bearing: finite(query.get('bearing')),
            pitch: finite(query.get('pitch')),
          }
        : undefined,
    selectedPoint:
      pointLatitude != null && pointLongitude != null
        ? { latitude: pointLatitude, longitude: pointLongitude }
        : undefined,
    opacity: finite(query.get('opacity')),
    layers: layers.length
      ? {
          rainfall: layers.includes('rainfall'),
          railways: layers.includes('railways'),
          stations: layers.includes('stations'),
          disasters: layers.includes('disasters'),
        }
      : undefined,
  };
}

export function createShareUrl(input: {
  productId: RainfallProductId;
  timestamp?: string;
  mapView: MapViewState;
  selectedPoint: SelectedPoint | null;
  opacity: number;
  layers: VisibleLayers;
}): string {
  const url = new URL(window.location.href);
  url.searchParams.set('product', input.productId);
  const timestamp = input.timestamp ? new Date(input.timestamp) : null;
  if (timestamp) {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
    const [date, time] = parts.split(' ');
    url.searchParams.set('date', date);
    url.searchParams.set('time', time);
  }
  url.searchParams.set('lat', input.mapView.latitude.toFixed(5));
  url.searchParams.set('lon', input.mapView.longitude.toFixed(5));
  url.searchParams.set('zoom', input.mapView.zoom.toFixed(2));
  url.searchParams.set('bearing', input.mapView.bearing.toFixed(1));
  url.searchParams.set('pitch', input.mapView.pitch.toFixed(1));
  url.searchParams.set('opacity', input.opacity.toFixed(2));
  url.searchParams.set(
    'layers',
    Object.entries(input.layers)
      .filter(([, visible]) => visible)
      .map(([name]) => name)
      .join(','),
  );
  if (input.selectedPoint) {
    url.searchParams.set('pointLat', input.selectedPoint.latitude.toFixed(5));
    url.searchParams.set('pointLon', input.selectedPoint.longitude.toFixed(5));
  } else {
    url.searchParams.delete('pointLat');
    url.searchParams.delete('pointLon');
  }
  return url.toString();
}
