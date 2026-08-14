import { useState } from 'react';

import { useAppStore } from '../stores/appStore';
import { Icon } from './Icon';

export function LayerPanel() {
  const [open, setOpen] = useState(false);
  const activeProduct = useAppStore((state) => state.activeProduct);
  const setActiveProduct = useAppStore((state) => state.setActiveProduct);
  const manifest = useAppStore((state) => state.manifest);
  const layers = useAppStore((state) => state.visibleLayers);
  const toggleLayer = useAppStore((state) => state.toggleLayer);
  const opacity = useAppStore((state) => state.opacity);
  const setOpacity = useAppStore((state) => state.setOpacity);
  const resetMapView = useAppStore((state) => state.resetMapView);

  return (
    <div className="layer-controls">
      <button className="map-tool-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="レイヤ設定">
        <Icon name="layers" /> <span>レイヤ</span>
      </button>
      <button className="map-tool-button" type="button" onClick={resetMapView} aria-label="レイヤ全域表示">
        <Icon name="reset" /> <span>全域表示</span>
      </button>
      {open && (
        <section className="layer-panel map-floating-panel">
          <header><strong>表示レイヤ</strong><button type="button" onClick={() => setOpen(false)} aria-label="閉じる">×</button></header>
          <fieldset className="rainfall-product-picker">
            <legend>雨量データ</legend>
            <label><input type="radio" name="rainfall-product" value="analyzed" checked={activeProduct === 'analyzed'} onChange={() => setActiveProduct('analyzed')} /><span><strong>解析雨量</strong><small>1km・30分更新</small></span></label>
            <label><input type="radio" name="rainfall-product" value="radar250m" checked={activeProduct === 'radar250m'} onChange={() => setActiveProduct('radar250m')} /><span><strong>250mレーダー</strong><small>250m・5分更新</small></span></label>
          </fieldset>
          {Object.entries({ rainfall: manifest?.productLabel ?? '雨量', railways: '鉄道路線（DEMO）', stations: '駅（DEMO）', disasters: '災害地点（DEMO）' }).map(([id, label]) => (
            <label key={id} className="toggle-row">
              <input type="checkbox" checked={layers[id as keyof typeof layers]} onChange={() => toggleLayer(id as keyof typeof layers)} />
              <span>{label}</span>
            </label>
          ))}
          <label className="opacity-control">
            <span>雨量の透明度 <strong>{Math.round(opacity * 100)}%</strong></span>
            <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
          </label>
        </section>
      )}
    </div>
  );
}
