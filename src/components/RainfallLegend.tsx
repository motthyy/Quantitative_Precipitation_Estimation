import { rainfallColorScale } from '../config/rainfallColorScale';
import { useAppStore } from '../stores/appStore';

export function RainfallLegend() {
  const manifest = useAppStore((state) => state.manifest);
  const visibleStops = rainfallColorScale.stops.filter((stop) => stop.value > 0);
  return (
    <section className="rainfall-legend map-floating-panel" aria-label="雨量凡例">
      <header>
        <span>{manifest?.productLabel ?? rainfallColorScale.title}</span>
        <strong>{manifest?.unit ?? rainfallColorScale.unit}</strong>
      </header>
      <div className="legend-ramp">
        {visibleStops.map((stop) => (
          <span key={stop.value} style={{ background: stop.color }} />
        ))}
      </div>
      <div className="legend-labels">
        {[1, 8, 20, 50, 100].map((value) => <span key={value}>{value}{value === 100 ? '+' : ''}</span>)}
      </div>
    </section>
  );
}
