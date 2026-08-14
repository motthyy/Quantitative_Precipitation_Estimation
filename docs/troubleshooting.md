# トラブルシューティング

## 地図が白い

- WebGLが有効か確認する
- 国土地理院タイルへのネットワークアクセスを確認する
- ブラウザコンソールでCSPやmixed contentを確認する
- 地図containerに高さがあるか確認する。本アプリは`100dvh`とabsolute insetを使用する

## manifest 404

`.env`の`VITE_RAINFALL_BASE_URL`と実フォルダを合わせる。既定デモは`/demo`、利用者データの例は`/local-data`。

## 地点値だけ失敗する

COGへのHTTP Range requestとCORSの`Range` headerを確認する。WebPが見えてもCOGが取得できなければ地点値は表示できない。

## R2/S3 CORS

GET、HEAD、Rangeを許可し、Content-RangeをExposeする。`Access-Control-Allow-Origin: *`が利用条件上適切か確認する。

## GRIB2 decode

JMA解析雨量はPDT 4.50008、DRT 5.200を含む。ecCodesだけで`template.4.50008.def`エラーになる場合がある。本プロジェクトの`JmaAnalyzedRainfallDecoder`を使用する。

## Windows GDAL / Rasterio

まず通常のwheelを使用する：

```powershell
python -m pip install rasterio
```

組織環境等でwheelが利用できない場合のみConda等を代替として検討する。Condaは必須ではない。

## venv / npm

PowerShellの実行ポリシーでActivateできなくても、`.venv\Scripts\python.exe`を直接呼べばよい。Node.jsは20.19以上を使う。

## GitHub Pages path

Actions上のVite baseは`/Quantitative_Precipitation_Estimation/`。手動buildで別名へ公開する場合は`vite.config.ts`のrepository nameと一致させる。

