import type { StyleSpecification } from 'maplibre-gl';

export const basemapStyle: StyleSpecification = {
  version: 8,
  name: 'GSI Pale',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'gsi-pale': {
      type: 'raster',
      tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">© 国土地理院</a>',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#eaf0f1' },
    },
    {
      id: 'gsi-pale',
      type: 'raster',
      source: 'gsi-pale',
      minzoom: 2,
      maxzoom: 18,
      paint: { 'raster-saturation': -0.28, 'raster-contrast': 0.06 },
    },
  ],
};

