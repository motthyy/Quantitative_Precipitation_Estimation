# 鉄道データ

`public/data/railways.geojson`、`stations.geojson`、`disasters.geojson`を差し替える。付属ファイルはすべてDEMOであり、実路線・実災害位置ではない。

路線属性例：

```json
{
  "id": "line-001",
  "company": "Example Railway",
  "line_name": "Example Line",
  "start_km": 0,
  "end_km": 195.7,
  "demo": false
}
```

M値付きLineStringを本番で使う場合はM値をキロ程の一次情報とする。M値がない場合、`python/rainfall_pipeline/railway`の測地距離から暫定距離を計算する。緯度経度の度数をそのまま距離として扱わない。

大量路線では前処理でbbox indexを生成し、ブラウザ側の総当たりを避ける。路線×キロ程×timestampの出力は独立したsampling Providerとして追加する。

