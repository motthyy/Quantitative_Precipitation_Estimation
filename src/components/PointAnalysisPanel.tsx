import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { ACCUMULATION_HOURS, FEATURE_FLAGS } from '../config/app';
import { createRainfallProvider } from '../data/LocalRainfallProvider';
import { useAppStore } from '../stores/appStore';
import type { PointObservation } from '../types/rainfall';
import { calculateProductAccumulation, unconfiguredEffectiveRainfall } from '../utils/analysis';
import { formatDateTime } from '../utils/date';
import { exportCsv, exportJson } from '../utils/export';
import { formatCoordinate, formatRainfall } from '../utils/format';
import { Icon } from './Icon';

const PointChart = lazy(() => import('../chart/PointChart').then((module) => ({ default: module.PointChart })));
type PanelTab = 'point' | 'series' | 'accumulation' | 'railway';

export function PointAnalysisPanel() {
  const activeProduct = useAppStore((state) => state.activeProduct);
  const manifest = useAppStore((state) => state.manifest);
  const currentIndex = useAppStore((state) => state.currentIndex);
  const selectedPoint = useAppStore((state) => state.selectedPoint);
  const selectedRailwayId = useAppStore((state) => state.selectedRailwayId);
  const panelOpen = useAppStore((state) => state.panelOpen);
  const setPanelOpen = useAppStore((state) => state.setPanelOpen);
  const mobileExpanded = useAppStore((state) => state.mobileSheetExpanded);
  const setMobileExpanded = useAppStore((state) => state.setMobileSheetExpanded);
  const setSelectedPoint = useAppStore((state) => state.setSelectedPoint);
  const [tab, setTab] = useState<PanelTab>('point');
  const [observation, setObservation] = useState<PointObservation | null>(null);
  const [series, setSeries] = useState<PointObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const frame = manifest?.frames[currentIndex];
  const provider = useMemo(() => createRainfallProvider(activeProduct), [activeProduct]);
  const quantityLabel = manifest?.quantity === 'precipitation_intensity' ? '降水強度' : '前1時間降水量';

  useEffect(() => {
    if (!frame || !selectedPoint) {
      setObservation(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    provider.samplePoint(frame, selectedPoint, controller.signal)
      .then(setObservation)
      .catch((reason: unknown) => {
        if ((reason as DOMException).name !== 'AbortError') setError('地点の数値を読み込めませんでした。');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [frame, provider, selectedPoint]);

  useEffect(() => {
    if (!manifest || !selectedPoint) {
      setSeries([]);
      return;
    }
    const controller = new AbortController();
    setProgress(0);
    provider.loadPointSeries(
      manifest.frames,
      selectedPoint,
      (completed, total) => setProgress(completed / total),
      controller.signal,
    ).then((result) => setSeries(result.observations))
      .catch((reason: unknown) => {
        if ((reason as DOMException).name !== 'AbortError') setError('時系列を読み込めませんでした。');
      });
    return () => controller.abort();
  }, [manifest, provider, selectedPoint]);

  const accumulations = useMemo(() => {
    if (!frame) return [];
    return ACCUMULATION_HOURS.map((hours) => ({
      hours,
      result: calculateProductAccumulation(
        series,
        frame.timestamp,
        hours,
        manifest?.quantity ?? 'preceding_1h',
        manifest?.intervalMinutes ?? 30,
      ),
    }));
  }, [frame, manifest, series]);

  if (!panelOpen) {
    return (
      <button className="panel-restore" type="button" onClick={() => setPanelOpen(true)}>
        <Icon name="chevron" /> 地点分析
      </button>
    );
  }

  return (
    <aside className={`analysis-panel ${mobileExpanded ? 'mobile-expanded' : ''}`} aria-label="地点分析パネル">
      <button className="sheet-handle" type="button" onClick={() => setMobileExpanded(!mobileExpanded)} aria-label="パネルの高さを切り替え"><span /></button>
      <header className="panel-header">
        <div><p className="eyebrow">POINT ANALYSIS</p><h2>{selectedPoint ? '選択地点' : '地点を選択'}</h2></div>
        <button className="icon-button" type="button" onClick={() => setPanelOpen(false)} aria-label="分析パネルを閉じる"><Icon name="close" /></button>
      </header>
      {!selectedPoint ? (
        <div className="empty-panel">
          <div className="target-illustration"><span /><span /><span /></div>
          <h3>地図をクリック</h3>
          <p>地図をクリックすると、選択中レイヤの地点雨量と時系列を数値データから取得します。</p>
        </div>
      ) : (
        <>
          <nav className="panel-tabs" aria-label="分析内容">
            {([['point', '雨量値'], ['series', '時系列'], ['accumulation', '累積'], ['railway', '鉄道']] as const).map(([id, label]) => (
              <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
            ))}
          </nav>
          <div className="panel-content">
            {tab === 'point' && (
              <section className="point-summary">
                <div className="value-card">
                  <span>{quantityLabel}</span>
                  <strong data-testid="point-rainfall">{loading ? '読込中…' : formatRainfall(observation?.rainfall1hMm, manifest?.unit)}</strong>
                  <small>{frame ? formatDateTime(frame.timestamp) : ''} {manifest?.quantity === 'precipitation_intensity' ? '時点' : 'までの1時間'}</small>
                </div>
                <dl className="coordinate-grid">
                  <div><dt>緯度</dt><dd>{formatCoordinate(selectedPoint.latitude)}</dd></div>
                  <div><dt>経度</dt><dd>{formatCoordinate(selectedPoint.longitude)}</dd></div>
                  <div><dt>格子ID</dt><dd>{observation?.gridId ?? '—'}</dd></div>
                  <div><dt>空間抽出</dt><dd>nearest cell</dd></div>
                </dl>
                <button className="secondary-button" type="button" onClick={() => void navigator.clipboard.writeText(`${selectedPoint.latitude.toFixed(6)}, ${selectedPoint.longitude.toFixed(6)}`)}>緯度経度をコピー</button>
                <div className="semantics-note"><strong>値の意味</strong><p>{manifest?.semantics}</p></div>
              </section>
            )}
            {tab === 'series' && (
              <section className="series-section">
                <header><div><h3>雨量時系列</h3><p>{quantityLabel} [{manifest?.unit}]</p></div><span>{Math.round(progress * 100)}%</span></header>
                {series.length && manifest ? <Suspense fallback={<div className="chart-skeleton">グラフを準備中…</div>}><PointChart observations={series} unit={manifest.unit} quantityLabel={quantityLabel} /></Suspense> : <div className="chart-skeleton">数値データを取得中…</div>}
                {FEATURE_FLAGS.export && series.length > 0 && manifest && <div className="export-actions"><button type="button" onClick={() => exportCsv(selectedPoint, series, manifest)}><Icon name="download" /> CSV</button><button type="button" onClick={() => exportJson(selectedPoint, series, manifest)}><Icon name="download" /> JSON</button></div>}
              </section>
            )}
            {tab === 'accumulation' && (
              <section className="accumulation-section">
                <h3>{manifest?.quantity === 'precipitation_intensity' ? '5分間隔の強度から推定' : '重複しない正時系列から計算'}</h3>
                <p>{manifest?.quantity === 'precipitation_intensity' ? '降水強度 [mm/h] を各5分の雨量へ換算して合計します。' : '30分更新値をすべて足すと二重計上になるため、毎正時の前1時間雨量だけを使用します。'}</p>
                <div className="accumulation-list">{accumulations.map(({ hours, result }) => <div key={hours}><span>{hours}時間</span><strong>{result.complete ? formatRainfall(result.value) : '欠測を含む'}</strong><small>{result.available}/{result.expected} {manifest?.quantity === 'precipitation_intensity' ? '点' : '時間'}</small></div>)}</div>
                <div className="unconfigured-index"><span>{unconfiguredEffectiveRainfall.label}</span><strong>計算条件が設定されていません</strong></div>
              </section>
            )}
            {tab === 'railway' && (
              <section className="railway-section">
                <span className="demo-chip">DEMO</span>
                <h3>{selectedRailwayId ? '選択路線' : '路線は未選択です'}</h3>
                <p>{selectedRailwayId ? `内部ID: ${selectedRailwayId}` : '地図上のデモ路線をクリックすると路線を強調し、クリック地点の解析雨量を取得します。'}</p>
                <p className="caution">表示中の路線・駅・災害地点は機能確認用の架空データです。</p>
              </section>
            )}
            {error && <p className="inline-error" role="alert">{error}</p>}
          </div>
          <button className="clear-selection" type="button" onClick={() => setSelectedPoint(null)}>地点選択を解除</button>
        </>
      )}
    </aside>
  );
}
