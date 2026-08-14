# デプロイ

## GitHub Pages

1. GitHubリポジトリのSettings → PagesでSourceをGitHub Actionsにする。
2. `main`へpushするか、Actionsから`Deploy GitHub Pages`を実行する。
3. ViteのbaseはActions上でリポジトリ名へ自動設定される。

同梱するのは公式サンプル1日だけ。全期間データをPagesへ保存してはいけない。

## 全期間データを別HTTPストレージへ置く場合

処理済みフォルダをpublic GET/HEAD可能なHTTPストレージへアップロードし、GitHub Repository Variablesに次を追加する。

```text
VITE_RAINFALL_BASE_URL=https://data.example.com/rainfall
```

CORSの最小例：

```json
[
  {
    "AllowedOrigins": ["https://motthyy.github.io", "http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "If-None-Match"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "ETag"],
    "MaxAgeSeconds": 86400
  }
]
```

COGの地点抽出にはRange requestが必要。過去固定データには長期Cache-Controlを設定できる。秘密鍵や書込credentialをフロントエンドへ渡してはいけない。

## 完全ローカル

`public/local-data`へ処理するとViteが同一originで配信するためCORS設定は不要。PCのフォルダはインターネット上のGitHub Pagesから直接参照できない。全期間をローカル限定にする場合は`npm run dev`または`npm run preview`で閲覧する。

