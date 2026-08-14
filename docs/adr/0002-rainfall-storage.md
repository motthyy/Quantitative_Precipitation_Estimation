# ADR 0002: 表示WebPと数値COGの二層保存

- Status: Accepted
- Date: 2026-08-13

## Context

XYZは長期間・高zoomでオブジェクト数が爆発する。表示画像のRGBを地点値へ使うことはできない。

## Decision

プロトタイプはフレーム単位WebP image sourceとフレーム単位COGを用いる。本番大規模表示ではフレーム単位PMTiles Providerを追加可能にする。manifestが時間軸とURLを管理する。

## Consequences

1フレーム2〜3オブジェクトで管理でき、COG Range requestにより正確な地点値を取得できる。全国WebPを毎フレーム取得するため、将来の高トラフィック運用ではPMTiles/XYZとの実測比較が必要。

