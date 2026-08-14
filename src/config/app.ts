export const APP_NAME = '解析雨量アーカイブ';
export const APP_DESCRIPTION = '気象庁解析雨量を過去にさかのぼって閲覧・分析するWeb GIS';

export const DEFAULT_MAP_VIEW = {
  longitude: 137,
  latitude: 36,
  zoom: 5,
  bearing: 0,
  pitch: 0,
} as const;

export const RADAR_MAP_VIEW = {
  longitude: 133,
  latitude: 34.166667,
  zoom: 6.2,
  bearing: 0,
  pitch: 0,
} as const;

export const FEATURE_FLAGS = {
  railway: import.meta.env.VITE_ENABLE_RAILWAY !== 'false',
  disasters: import.meta.env.VITE_ENABLE_DISASTERS !== 'false',
  export: import.meta.env.VITE_ENABLE_EXPORT !== 'false',
  debug: import.meta.env.VITE_DEBUG === 'true',
} as const;

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;
export const ACCUMULATION_HOURS = [3, 6, 12, 24, 48, 72] as const;
