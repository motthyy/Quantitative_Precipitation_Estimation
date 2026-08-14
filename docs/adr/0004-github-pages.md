# ADR 0004: GitHub Pages静的配布

- Status: Accepted
- Date: 2026-08-13

## Decision

アプリはViteの静的成果物とし、サーバーAPIを必須にしない。リポジトリには初回確認用の公式1日サンプルだけを含め、全期間データは別HTTPストレージまたはローカルフォルダへ置く。

## Consequences

秘密鍵をブラウザへ置かずに公開できる。private objectを扱う場合は将来Worker等の署名Providerが必要。

