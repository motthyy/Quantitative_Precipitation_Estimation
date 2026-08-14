# ADR 0001: MapLibre GL JS

- Status: Accepted
- Date: 2026-08-13

## Context

スマートフォン・PC共通のWebGL地図、raster、GeoJSON、タッチ操作、attributionが必要。

## Decision

MapLibre GL JSを採用する。map instanceはReact componentの存続中に1回だけ生成し、時間更新ではimage sourceを更新する。

## Consequences

バックエンド不要でGitHub Pagesへ配布できる。WebGL非対応環境にはエラー説明が必要。背景地図の利用条件とattributionをstyleに保持する。

