import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_MAP_VIEW, RADAR_MAP_VIEW } from '../config/app';
import type {
  MapViewState,
  RainfallManifest,
  RainfallProductId,
  SelectedPoint,
  ThemePreference,
  VisibleLayers,
} from '../types/rainfall';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AppState {
  activeProduct: RainfallProductId;
  manifest: RainfallManifest | null;
  loadStatus: LoadStatus;
  errorMessage: string | null;
  currentIndex: number;
  rangeStartIndex: number;
  rangeEndIndex: number;
  isPlaying: boolean;
  playbackSpeed: 0.5 | 1 | 2 | 4;
  skipMinutes: number;
  opacity: number;
  theme: ThemePreference;
  visibleLayers: VisibleLayers;
  mapView: MapViewState;
  selectedPoint: SelectedPoint | null;
  selectedRailwayId: string | null;
  panelOpen: boolean;
  mobileSheetExpanded: boolean;
  infoOpen: boolean;
  setActiveProduct: (product: RainfallProductId) => void;
  setManifest: (manifest: RainfallManifest) => void;
  setLoadStatus: (status: LoadStatus, error?: string | null) => void;
  setCurrentIndex: (index: number) => void;
  moveFrame: (direction: -1 | 1, minutes?: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setPlaybackSpeed: (speed: 0.5 | 1 | 2 | 4) => void;
  setSkipMinutes: (minutes: number) => void;
  setPlaybackRange: (start: number, end: number) => void;
  setOpacity: (opacity: number) => void;
  setTheme: (theme: ThemePreference) => void;
  toggleLayer: (layer: keyof VisibleLayers) => void;
  setVisibleLayers: (layers: VisibleLayers) => void;
  setMapView: (view: MapViewState) => void;
  resetMapView: () => void;
  setSelectedPoint: (point: SelectedPoint | null) => void;
  setSelectedRailwayId: (id: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setMobileSheetExpanded: (expanded: boolean) => void;
  setInfoOpen: (open: boolean) => void;
}

function clampIndex(index: number, manifest: RainfallManifest | null): number {
  if (!manifest) return Math.max(0, index);
  return Math.min(manifest.frames.length - 1, Math.max(0, index));
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeProduct: 'analyzed',
      manifest: null,
      loadStatus: 'idle',
      errorMessage: null,
      currentIndex: 0,
      rangeStartIndex: 0,
      rangeEndIndex: 0,
      isPlaying: false,
      playbackSpeed: 1,
      skipMinutes: 30,
      opacity: 0.7,
      theme: 'system',
      visibleLayers: {
        rainfall: true,
        railways: true,
        stations: true,
        disasters: true,
      },
      mapView: { ...DEFAULT_MAP_VIEW },
      selectedPoint: null,
      selectedRailwayId: null,
      panelOpen: true,
      mobileSheetExpanded: false,
      infoOpen: false,
      setActiveProduct: (activeProduct) =>
        set({
          activeProduct,
          manifest: null,
          loadStatus: 'loading',
          errorMessage: null,
          currentIndex: 0,
          rangeStartIndex: 0,
          rangeEndIndex: 0,
          isPlaying: false,
          mapView: { ...(activeProduct === 'radar250m' ? RADAR_MAP_VIEW : DEFAULT_MAP_VIEW) },
        }),
      setManifest: (manifest) =>
        set((state) => ({
          manifest,
          loadStatus: 'ready',
          errorMessage: null,
          currentIndex: clampIndex(state.currentIndex || Math.floor(manifest.frames.length * 0.42), manifest),
          rangeStartIndex: 0,
          rangeEndIndex: manifest.frames.length - 1,
          skipMinutes: manifest.intervalMinutes,
        })),
      setLoadStatus: (loadStatus, errorMessage = null) => set({ loadStatus, errorMessage }),
      setCurrentIndex: (currentIndex) =>
        set((state) => ({ currentIndex: clampIndex(currentIndex, state.manifest) })),
      moveFrame: (direction, minutes) =>
        set((state) => {
          const interval = state.manifest?.intervalMinutes ?? 30;
          const step = Math.max(1, Math.round((minutes ?? state.skipMinutes) / interval));
          const next = clampIndex(state.currentIndex + direction * step, state.manifest);
          return { currentIndex: next };
        }),
      setPlaying: (isPlaying) => set({ isPlaying }),
      togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
      setSkipMinutes: (skipMinutes) => set({ skipMinutes }),
      setPlaybackRange: (start, end) =>
        set((state) => ({
          rangeStartIndex: clampIndex(Math.min(start, end), state.manifest),
          rangeEndIndex: clampIndex(Math.max(start, end), state.manifest),
        })),
      setOpacity: (opacity) => set({ opacity: Math.min(1, Math.max(0, opacity)) }),
      setTheme: (theme) => set({ theme }),
      toggleLayer: (layer) =>
        set((state) => ({
          visibleLayers: { ...state.visibleLayers, [layer]: !state.visibleLayers[layer] },
        })),
      setVisibleLayers: (visibleLayers) => set({ visibleLayers }),
      setMapView: (mapView) => set({ mapView }),
      resetMapView: () =>
        set((state) => ({
          mapView: { ...(state.activeProduct === 'radar250m' ? RADAR_MAP_VIEW : DEFAULT_MAP_VIEW) },
        })),
      setSelectedPoint: (selectedPoint) =>
        set({ selectedPoint, panelOpen: selectedPoint != null, mobileSheetExpanded: selectedPoint != null }),
      setSelectedRailwayId: (selectedRailwayId) =>
        set({ selectedRailwayId, panelOpen: selectedRailwayId != null }),
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      setMobileSheetExpanded: (mobileSheetExpanded) => set({ mobileSheetExpanded }),
      setInfoOpen: (infoOpen) => set({ infoOpen }),
    }),
    {
      name: 'rainfall-viewer-preferences',
      partialize: (state) => ({
        opacity: state.opacity,
        theme: state.theme,
        playbackSpeed: state.playbackSpeed,
        skipMinutes: state.skipMinutes,
        visibleLayers: state.visibleLayers,
        activeProduct: state.activeProduct,
      }),
    },
  ),
);
