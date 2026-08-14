export type Bounds = [west: number, south: number, east: number, north: number];

export type RainfallProductId = 'analyzed' | 'radar250m';

export interface RainfallFrame {
  id: string;
  timestamp: string;
  displayUrl: string;
  numericUrl: string;
  metadataUrl: string;
  bounds: Bounds;
  status: 'available' | 'partial' | 'missing';
  sourceTimestamp: string;
  checksum: string;
}

export interface RainfallManifest {
  version: number;
  productId: RainfallProductId;
  productLabel: string;
  dataset: string;
  source: string;
  sample: boolean;
  sampleNotice: string;
  availableFrom: string;
  availableTo: string;
  timezone: 'Asia/Tokyo';
  resolution: string;
  intervalMinutes: number;
  quantity: 'preceding_1h' | 'precipitation_intensity';
  unit: 'mm' | 'mm/h';
  semantics: string;
  processorVersion: string;
  generatedAt: string;
  dates: Record<string, string[]>;
  frames: RainfallFrame[];
}

export interface SelectedPoint {
  longitude: number;
  latitude: number;
}

export interface PointObservation extends SelectedPoint {
  timestamp: string;
  rainfall1hMm: number | null;
  gridId?: string;
  gridCenter?: SelectedPoint;
}

export interface PointSeries {
  point: SelectedPoint;
  observations: PointObservation[];
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface VisibleLayers {
  rainfall: boolean;
  railways: boolean;
  stations: boolean;
  disasters: boolean;
}
