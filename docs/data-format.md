# データ形式

## ディレクトリ

```text
rainfall/
├─ manifest.json
├─ frames/YYYY/MM/DD/YYYYMMDDTHHMMJST.webp
├─ numeric/frames/YYYY/MM/DD/YYYYMMDDTHHMMJST.tif
└─ metadata/frames/YYYY/MM/DD/YYYYMMDDTHHMMJST.json
```

## Manifest version 1

主要フィールド：

- `availableFrom`, `availableTo`: JST ISO 8601
- `timezone`: `Asia/Tokyo`
- `intervalMinutes`: 通常30
- `dates`: 利用可能な日と時刻。存在しない日時をUIで有効にしない
- `frames`: 表示URL、数値URL、metadata URL、bounds、checksum
- `processorVersion`: 処理追跡

未知のversionを受け取ったフロントエンドは「このデータ形式には対応していません」と停止する。

## WebP

- RGBA、lossless
- 0 mmとNoDataは透明
- 色階級は `config/rainfall-colors.json` が唯一の定義元
- 地理範囲はframeの`bounds`
- nearestを既定とし、見かけの平滑化で格子値を誤認させない

## COG

- CRS: EPSG:4326
- dtype: uint16
- 単位: 0.1 mm
- NoData: 65535
- tiled 512×512、DEFLATE、predictor 2
- 北から南、西から東の格子順

ブラウザはCOGの該当する1セル範囲だけをHTTP Rangeで読み取れる。ローカルViteもRange requestへ対応する。

## Processing metadata

各フレームにsource file、UTC source timestamp、JST timestamp、processedAt、processorVersion、SHA-256、min/max、NoData率を保存する。

