import type {
  PointObservation,
  PointSeries,
  RainfallFrame,
  RainfallManifest,
  SelectedPoint,
} from '../types/rainfall';

export interface RainfallDataProvider {
  readonly id: string;
  loadManifest(signal?: AbortSignal): Promise<RainfallManifest>;
  samplePoint(
    frame: RainfallFrame,
    point: SelectedPoint,
    signal?: AbortSignal,
  ): Promise<PointObservation>;
  loadPointSeries(
    frames: RainfallFrame[],
    point: SelectedPoint,
    onProgress?: (completed: number, total: number) => void,
    signal?: AbortSignal,
  ): Promise<PointSeries>;
  prefetch(frames: RainfallFrame[]): void;
}

