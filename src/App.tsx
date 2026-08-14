import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppHeader } from './components/AppHeader';
import { InfoDialog } from './components/InfoDialog';
import { LayerPanel } from './components/LayerPanel';
import { PointAnalysisPanel } from './components/PointAnalysisPanel';
import { RainfallLegend } from './components/RainfallLegend';
import { Timeline } from './components/Timeline';
import { createRainfallProvider } from './data/LocalRainfallProvider';
import { resolveDataUrl } from './data/url';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlayback } from './hooks/usePlayback';
import { useTheme } from './hooks/useTheme';
import { useRestoreUrlState, useWriteUrlState } from './hooks/useUrlSync';
import { RainfallMap } from './map/RainfallMap';
import { useAppStore } from './stores/appStore';

export default function App() {
  const activeProduct = useAppStore((state) => state.activeProduct);
  const manifest = useAppStore((state) => state.manifest);
  const loadStatus = useAppStore((state) => state.loadStatus);
  const errorMessage = useAppStore((state) => state.errorMessage);
  const setManifest = useAppStore((state) => state.setManifest);
  const setLoadStatus = useAppStore((state) => state.setLoadStatus);
  const currentIndex = useAppStore((state) => state.currentIndex);
  const [frameLoading, setFrameLoading] = useState(true);
  const frame = manifest?.frames[currentIndex] ?? null;
  const provider = useMemo(() => createRainfallProvider(activeProduct), [activeProduct]);

  useTheme();
  usePlayback();
  useKeyboardShortcuts();
  useRestoreUrlState();
  useWriteUrlState();

  useEffect(() => {
    const controller = new AbortController();
    setLoadStatus('loading');
    provider.loadManifest(controller.signal)
      .then(setManifest)
      .catch((error: unknown) => {
        if ((error as DOMException).name !== 'AbortError') {
          setLoadStatus('error', error instanceof Error ? error.message : 'データを読み込めませんでした。');
        }
      });
    return () => controller.abort();
  }, [provider, setLoadStatus, setManifest]);

  useEffect(() => {
    if (!manifest) return;
    setFrameLoading(true);
    const currentFrame = manifest.frames[currentIndex];
    const currentImage = new Image();
    currentImage.onload = () => setFrameLoading(false);
    currentImage.onerror = () => setFrameLoading(false);
    currentImage.src = resolveDataUrl(currentFrame.displayUrl);
    const neighborIndices = [currentIndex + 1, currentIndex + 2, currentIndex - 1].filter(
      (index) => index >= 0 && index < manifest.frames.length,
    );
    provider.prefetch(neighborIndices.map((index) => manifest.frames[index]));
    return () => {
      currentImage.onload = null;
      currentImage.onerror = null;
    };
  }, [currentIndex, manifest, provider]);

  const statusText = useMemo(() => {
    if (loadStatus === 'loading') return '雨量データを準備しています';
    if (frameLoading && frame) return '雨量フレームを描画しています';
    return null;
  }, [frame, frameLoading, loadStatus]);
  const onFrameLoaded = useCallback(() => setFrameLoading(false), []);

  if (loadStatus === 'error') {
    return (
      <main className="startup-error">
        <div className="error-card">
          <p className="eyebrow">DATASET NOT READY</p>
          <h1>雨量データを読み込めませんでした</h1>
          <p>{errorMessage}</p>
          <code>python -m rainfall_pipeline download-sample<br />python -m rainfall_pipeline publish</code>
          <button type="button" onClick={() => window.location.reload()}>再読み込み</button>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="workspace">
        <section className="map-stage" aria-label="地図ビュー">
          <RainfallMap frame={frame} onFrameLoaded={onFrameLoaded} />
          <div className="data-badge">
            <span className="live-dot" />
            <div><strong>{manifest?.productLabel ?? '実データ・公式サンプル'}</strong><small>{manifest ? `${manifest.resolution} / ${manifest.intervalMinutes}分間隔` : 'JMBSC 2018.07.07'}</small></div>
          </div>
          <LayerPanel />
          <RainfallLegend />
          {statusText && <div className="map-loading" role="status"><span />{statusText}</div>}
        </section>
        <PointAnalysisPanel />
      </main>
      <Timeline />
      <InfoDialog />
    </div>
  );
}
