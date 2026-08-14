import { fromUrl, type GeoTIFF, type GeoTIFFImage } from 'geotiff';

import type { PointObservation, RainfallFrame, SelectedPoint } from '../types/rainfall';
import { resolveDataUrl } from './url';

interface CachedTiff {
  promise: Promise<{ tiff: GeoTIFF; image: GeoTIFFImage }>;
  lastUsed: number;
}

const cache = new Map<string, CachedTiff>();
const MAX_CACHE_SIZE = 8;

async function loadTiff(url: string): Promise<{ tiff: GeoTIFF; image: GeoTIFFImage }> {
  const resolved = resolveDataUrl(url);
  const cached = cache.get(resolved);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.promise;
  }

  const promise = fromUrl(resolved).then(async (tiff) => ({ tiff, image: await tiff.getImage() }));
  cache.set(resolved, { promise, lastUsed: Date.now() });
  if (cache.size > MAX_CACHE_SIZE) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
    if (oldest) {
      cache.delete(oldest[0]);
    }
  }
  return promise;
}

export async function sampleCog(
  frame: RainfallFrame,
  point: SelectedPoint,
  signal?: AbortSignal,
): Promise<PointObservation> {
  signal?.throwIfAborted();
  const { image } = await loadTiff(frame.numericUrl);
  signal?.throwIfAborted();

  const [west, south, east, north] = image.getBoundingBox();
  const width = image.getWidth();
  const height = image.getHeight();
  if (
    point.longitude < west ||
    point.longitude > east ||
    point.latitude < south ||
    point.latitude > north
  ) {
    return { ...point, timestamp: frame.timestamp, rainfall1hMm: null };
  }

  const x = Math.min(width - 1, Math.max(0, Math.floor(((point.longitude - west) / (east - west)) * width)));
  const y = Math.min(height - 1, Math.max(0, Math.floor(((north - point.latitude) / (north - south)) * height)));
  const raster = await image.readRasters({ window: [x, y, x + 1, y + 1] });
  signal?.throwIfAborted();
  const band = raster[0];
  const raw = Number(band?.[0]);
  const noData = image.getGDALNoData();
  const value = !Number.isFinite(raw) || raw === noData || raw === 65535 ? null : raw / 10;
  const cellWidth = (east - west) / width;
  const cellHeight = (north - south) / height;
  return {
    ...point,
    timestamp: frame.timestamp,
    rainfall1hMm: value,
    gridId: `${x}:${y}`,
    gridCenter: {
      longitude: west + (x + 0.5) * cellWidth,
      latitude: north - (y + 0.5) * cellHeight,
    },
  };
}

