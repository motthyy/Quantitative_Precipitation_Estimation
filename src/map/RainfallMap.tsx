import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  FullscreenControl,
  GeolocateControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type ImageSource,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

import { FEATURE_FLAGS } from '../config/app';
import type { RainfallFrame } from '../types/rainfall';
import { resolveDataUrl } from '../data/url';
import { useAppStore } from '../stores/appStore';
import { basemapStyle } from './mapStyle';

interface RainfallMapProps {
  frame: RainfallFrame | null;
  onFrameLoaded?: () => void;
}

const RAIN_SOURCE = 'rainfall-frame';
const RAIN_LAYER = 'rainfall-frame';

setWorkerUrl(maplibreWorkerUrl);

function addGeoJsonLayers(map: MapLibreMap) {
  if (FEATURE_FLAGS.railway) {
    map.addSource('railways', {
      type: 'geojson',
      data: resolveDataUrl('/data/railways.geojson'),
      generateId: true,
    });
    map.addLayer({
      id: 'railway-halo',
      type: 'line',
      source: 'railways',
      paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: 'railways',
      type: 'line',
      source: 'railways',
      paint: {
        'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ffb21c', '#111827'],
        'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 5, 2.2],
      },
    });
    map.addSource('stations', { type: 'geojson', data: resolveDataUrl('/data/stations.geojson') });
    map.addLayer({
      id: 'stations',
      type: 'circle',
      source: 'stations',
      paint: {
        'circle-radius': 4,
        'circle-color': '#ffffff',
        'circle-stroke-color': '#111827',
        'circle-stroke-width': 2,
      },
    });
  }
  if (FEATURE_FLAGS.disasters) {
    map.addSource('disasters', { type: 'geojson', data: resolveDataUrl('/data/disasters.geojson') });
    map.addLayer({
      id: 'disasters',
      type: 'circle',
      source: 'disasters',
      paint: {
        'circle-radius': 7,
        'circle-color': '#ff4d55',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
  }
}

function visibility(visible: boolean): 'visible' | 'none' {
  return visible ? 'visible' : 'none';
}

export function RainfallMap({ frame, onFrameLoaded }: RainfallMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const previousRailwayRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const productLabel = useAppStore((state) => state.manifest?.productLabel ?? '雨量');
  const initialMapView = useRef(useAppStore.getState().mapView);
  const mapView = useAppStore((state) => state.mapView);
  const setMapView = useAppStore((state) => state.setMapView);
  const selectedPoint = useAppStore((state) => state.selectedPoint);
  const setSelectedPoint = useAppStore((state) => state.setSelectedPoint);
  const setSelectedRailwayId = useAppStore((state) => state.setSelectedRailwayId);
  const selectedRailwayId = useAppStore((state) => state.selectedRailwayId);
  const opacity = useAppStore((state) => state.opacity);
  const layers = useAppStore((state) => state.visibleLayers);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: basemapStyle,
      center: [initialMapView.current.longitude, initialMapView.current.latitude],
      zoom: initialMapView.current.zoom,
      bearing: initialMapView.current.bearing,
      pitch: initialMapView.current.pitch,
      attributionControl: false,
      maxPitch: 65,
      cooperativeGestures: false,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: true }), 'top-left');
    map.addControl(
      new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
      'top-left',
    );
    map.addControl(new FullscreenControl(), 'top-left');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      addGeoJsonLayers(map);
      setMapReady(true);
    });
    map.on('moveend', () => {
      const center = map.getCenter();
      setMapView({
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    });
    map.on('click', (event) => {
      const railFeatures = FEATURE_FLAGS.railway && map.getLayer('railways')
        ? map.queryRenderedFeatures(event.point, { layers: ['railways'] })
        : [];
      if (railFeatures.length > 0) {
        const id = String(railFeatures[0].id ?? '');
        setSelectedRailwayId(id || null);
      }
      setSelectedPoint({ longitude: event.lngLat.lng, latitude: event.lngLat.lat });
    });
    map.on('mouseenter', 'railways', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'railways', () => {
      map.getCanvas().style.cursor = '';
    });
    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [setMapView, setSelectedPoint, setSelectedRailwayId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const center = map.getCenter();
    const differs =
      Math.abs(center.lng - mapView.longitude) > 0.0001 ||
      Math.abs(center.lat - mapView.latitude) > 0.0001 ||
      Math.abs(map.getZoom() - mapView.zoom) > 0.001 ||
      Math.abs(map.getBearing() - mapView.bearing) > 0.01 ||
      Math.abs(map.getPitch() - mapView.pitch) > 0.01;
    if (differs) {
      map.easeTo({
        center: [mapView.longitude, mapView.latitude],
        zoom: mapView.zoom,
        bearing: mapView.bearing,
        pitch: mapView.pitch,
        duration: 280,
      });
    }
  }, [mapReady, mapView]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !frame) return;
    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
      [frame.bounds[0], frame.bounds[3]],
      [frame.bounds[2], frame.bounds[3]],
      [frame.bounds[2], frame.bounds[1]],
      [frame.bounds[0], frame.bounds[1]],
    ];
    const source = map.getSource(RAIN_SOURCE);
    if (source) {
      (source as ImageSource).updateImage({ url: resolveDataUrl(frame.displayUrl), coordinates });
    } else {
      map.addSource(RAIN_SOURCE, {
        type: 'image',
        url: resolveDataUrl(frame.displayUrl),
        coordinates,
      });
      map.addLayer(
        {
          id: RAIN_LAYER,
          type: 'raster',
          source: RAIN_SOURCE,
          paint: {
            'raster-opacity': opacity,
            'raster-resampling': 'nearest',
            'raster-fade-duration': 120,
          },
        },
        map.getLayer('railway-halo') ? 'railway-halo' : undefined,
      );
    }
    const onIdle = () => onFrameLoaded?.();
    map.once('idle', onIdle);
    return () => {
      map.off('idle', onIdle);
    };
  }, [frame, mapReady, onFrameLoaded, opacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.getLayer(RAIN_LAYER)) return;
    map.setPaintProperty(RAIN_LAYER, 'raster-opacity', opacity);
    map.setLayoutProperty(RAIN_LAYER, 'visibility', visibility(layers.rainfall));
  }, [layers.rainfall, mapReady, opacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    for (const layerId of ['railway-halo', 'railways']) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility(layers.railways));
    }
    if (map.getLayer('stations')) map.setLayoutProperty('stations', 'visibility', visibility(layers.stations));
    if (map.getLayer('disasters')) map.setLayoutProperty('disasters', 'visibility', visibility(layers.disasters));
  }, [layers, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.remove();
    markerRef.current = null;
    if (selectedPoint) {
      const element = document.createElement('div');
      element.className = 'selected-point-marker';
      element.setAttribute('aria-label', '選択地点');
      markerRef.current = new Marker({ element }).setLngLat([selectedPoint.longitude, selectedPoint.latitude]).addTo(map);
    }
  }, [selectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.getSource('railways')) return;
    if (previousRailwayRef.current) {
      const previousId = /^\d+$/.test(previousRailwayRef.current)
        ? Number(previousRailwayRef.current)
        : previousRailwayRef.current;
      map.removeFeatureState({ source: 'railways', id: previousId });
    }
    if (selectedRailwayId) {
      const featureId = /^\d+$/.test(selectedRailwayId) ? Number(selectedRailwayId) : selectedRailwayId;
      map.setFeatureState({ source: 'railways', id: featureId }, { selected: true });
    }
    previousRailwayRef.current = selectedRailwayId;
  }, [mapReady, selectedRailwayId]);

  return <div ref={containerRef} className="map-canvas" data-testid="rainfall-map" aria-label={`${productLabel}地図`} />;
}
