import type { PointObservation, RainfallManifest, SelectedPoint } from '../types/rainfall';

function downloadBlob(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(point: SelectedPoint, observations: PointObservation[], manifest: RainfallManifest) {
  const valueColumn = manifest.quantity === 'precipitation_intensity' ? 'precipitation_intensity_mm_h' : 'rainfall_1h_mm';
  const header = `timestamp,latitude,longitude,${valueColumn}`;
  const rows = observations.map((item) =>
    [item.timestamp, point.latitude.toFixed(6), point.longitude.toFixed(6), item.rainfall1hMm ?? ''].join(','),
  );
  downloadBlob(`${manifest.productId}-rainfall.csv`, `\uFEFF${[header, ...rows].join('\r\n')}`, 'text/csv;charset=utf-8');
}

export function exportJson(point: SelectedPoint, observations: PointObservation[], manifest: RainfallManifest) {
  downloadBlob(
    `${manifest.productId}-rainfall.json`,
    JSON.stringify({ point, unit: manifest.unit, semantics: manifest.semantics, observations }, null, 2),
    'application/json;charset=utf-8',
  );
}
