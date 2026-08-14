import type {
  PointSeries,
  RainfallFrame,
  RainfallManifest,
  RainfallProductId,
  SelectedPoint,
} from '../types/rainfall';
import type { RainfallDataProvider } from './RainfallDataProvider';
import { sampleCog } from './cog';
import { resolveDataUrl } from './url';

const MANIFEST_VERSION = 1;

export class LocalRainfallProvider implements RainfallDataProvider {
  readonly id = 'local';

  constructor(private readonly manifestUrl = '/demo/manifest.json') {}

  async loadManifest(signal?: AbortSignal): Promise<RainfallManifest> {
    const response = await fetch(resolveDataUrl(this.manifestUrl), { signal, cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`manifestを取得できませんでした (${response.status})`);
    }
    const manifest = (await response.json()) as RainfallManifest;
    if (manifest.version !== MANIFEST_VERSION) {
      throw new Error('このデータ形式には対応していません。');
    }
    if (!Array.isArray(manifest.frames) || manifest.frames.length === 0) {
      throw new Error('利用可能な解析雨量フレームがありません。');
    }
    return manifest;
  }

  samplePoint(frame: RainfallFrame, point: SelectedPoint, signal?: AbortSignal) {
    return sampleCog(frame, point, signal);
  }

  async loadPointSeries(
    frames: RainfallFrame[],
    point: SelectedPoint,
    onProgress?: (completed: number, total: number) => void,
    signal?: AbortSignal,
  ): Promise<PointSeries> {
    const observations = new Array(frames.length);
    let next = 0;
    let completed = 0;
    const worker = async () => {
      while (next < frames.length) {
        const index = next++;
        signal?.throwIfAborted();
        observations[index] = await this.samplePoint(frames[index], point, signal);
        completed += 1;
        onProgress?.(completed, frames.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, frames.length) }, worker));
    return { point, observations };
  }

  prefetch(frames: RainfallFrame[]) {
    const constrainedConnection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (constrainedConnection?.saveData || constrainedConnection?.effectiveType === '2g') {
      return;
    }
    for (const frame of frames.slice(0, 3)) {
      const image = new Image();
      image.decoding = 'async';
      image.src = resolveDataUrl(frame.displayUrl);
    }
  }
}

export function createRainfallProvider(productId: RainfallProductId = 'analyzed'): RainfallDataProvider {
  const provider = import.meta.env.VITE_DATA_PROVIDER ?? 'local';
  if (provider !== 'local' && provider !== 'http') {
    throw new Error(`未対応のDataProviderです: ${provider}`);
  }
  const configuredBase = productId === 'radar250m'
    ? import.meta.env.VITE_RADAR_BASE_URL?.trim()
    : import.meta.env.VITE_RAINFALL_BASE_URL?.trim();
  const base = (configuredBase || (productId === 'radar250m' ? '/radar250m' : '/demo')).replace(/\/$/, '');
  return new LocalRainfallProvider(`${base}/manifest.json`);
}
