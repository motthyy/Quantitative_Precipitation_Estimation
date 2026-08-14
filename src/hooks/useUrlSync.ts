import { useEffect, useRef } from 'react';

import { useAppStore } from '../stores/appStore';
import { createShareUrl, parseUrlState } from '../utils/urlState';

export function useRestoreUrlState() {
  const activeProduct = useAppStore((state) => state.activeProduct);
  const setActiveProduct = useAppStore((state) => state.setActiveProduct);
  const manifest = useAppStore((state) => state.manifest);
  const setCurrentIndex = useAppStore((state) => state.setCurrentIndex);
  const setMapView = useAppStore((state) => state.setMapView);
  const setOpacity = useAppStore((state) => state.setOpacity);
  const setSelectedPoint = useAppStore((state) => state.setSelectedPoint);
  const setVisibleLayers = useAppStore((state) => state.setVisibleLayers);
  const initialized = useRef(false);

  useEffect(() => {
    if (!manifest || initialized.current) return;
    const parsed = parseUrlState(window.location.search);
    if (parsed.productId && parsed.productId !== activeProduct) {
      setActiveProduct(parsed.productId);
      return;
    }
    initialized.current = true;
    if (parsed.timestamp) {
      const target = new Date(parsed.timestamp).getTime();
      const nearest = manifest.frames.reduce(
        (best, frame, index) => {
          const distance = Math.abs(new Date(frame.timestamp).getTime() - target);
          return distance < best.distance ? { index, distance } : best;
        },
        { index: 0, distance: Number.POSITIVE_INFINITY },
      );
      setCurrentIndex(nearest.index);
    }
    if (parsed.mapView?.latitude != null && parsed.mapView.longitude != null) {
      const current = useAppStore.getState().mapView;
      setMapView({ ...current, ...parsed.mapView });
    }
    if (parsed.opacity != null) setOpacity(parsed.opacity);
    if (parsed.selectedPoint) setSelectedPoint(parsed.selectedPoint);
    if (parsed.layers) {
      setVisibleLayers({
        ...useAppStore.getState().visibleLayers,
        ...parsed.layers,
      });
    }
  }, [activeProduct, manifest, setActiveProduct, setCurrentIndex, setMapView, setOpacity, setSelectedPoint, setVisibleLayers]);
}

export function useWriteUrlState() {
  const activeProduct = useAppStore((state) => state.activeProduct);
  const manifest = useAppStore((state) => state.manifest);
  const currentIndex = useAppStore((state) => state.currentIndex);
  const mapView = useAppStore((state) => state.mapView);
  const selectedPoint = useAppStore((state) => state.selectedPoint);
  const opacity = useAppStore((state) => state.opacity);
  const layers = useAppStore((state) => state.visibleLayers);

  useEffect(() => {
    if (!manifest) return;
    const timeout = window.setTimeout(() => {
      const url = createShareUrl({
        productId: activeProduct,
        timestamp: manifest.frames[currentIndex]?.timestamp,
        mapView,
        selectedPoint,
        opacity,
        layers,
      });
      window.history.replaceState(null, '', url);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [activeProduct, currentIndex, layers, manifest, mapView, opacity, selectedPoint]);
}
