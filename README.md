# Remote Browser Streaming (Express + React + WebSocket)

Puppeteer で起動したリモート Chromium を、WebSocket 経由でフロントエンドに JPEG ストリーム配信して操作するプロジェクトです。

- フロントエンド: React + Vite + Tailwind
- バックエンド: Express + ws + Puppeteer
- 通信: `GET /api/health` と `WS /ws`

## できること

- サーバー側 Chromium の画面をクライアントにストリーミング表示
- URL 遷移 (`goto`)
- マウス操作（移動 / クリック）
- キーボード入力（押下 / 離上）
- スクロール
- ストリーム品質調整（JPEG quality / everyNthFrame）

## ディレクトリ構成

```text
client/   React UI (canvas 描画、操作イベント送信)
server/   Express + WebSocket + Puppeteer 制御
shared/   WS メッセージスキーマ (zod)
script/   本番ビルドスクリプト
scripts/  Chromium インストール補助
```

## セットアップ

### 1) 依存インストール

```bash
npm install
```

`postinstall` で `playwright install chromium` が実行され、Chromium の準備を試みます。

### 2) 開発起動

```bash
npm run dev
```

デフォルトは `http://localhost:5000` です（`PORT` で変更可）。

### 3) 本番ビルド / 起動

```bash
npm run build
npm start
```

## NPM Scripts

- `npm run dev`: 開発サーバー起動（Express + Vite ミドルウェア）
- `npm run build`: クライアントとサーバーを `dist/` にビルド
- `npm start`: `dist/index.cjs` を本番モード起動
- `npm run check`: TypeScript 型チェック
- `npm run install:chrome`: Chromium インストール処理を手動実行

## WebSocket 仕様（要約）

エンドポイント: `ws(s)://<host>/ws`

### Client -> Server

- `init` `{ viewport? }`
- `goto` `{ url }`
- `mouseMove` `{ x, y }`
- `mouseDown` `{ button }`
- `mouseUp` `{ button }`
- `keyDown` `{ key }`
- `keyUp` `{ key }`
- `scroll` `{ deltaX, deltaY }`
- `settings` `{ quality?, everyNthFrame? }`

### Server -> Client

- `frame` `{ data }` (base64 JPEG)
- `navigated` `{ url }`
- `error` `{ message }`
- `memory` `{ usage }`

詳細スキーマは `shared/schema.ts` を参照してください。

## 環境変数

- `PORT`: サーバーポート（既定: `5000`）
- `NODE_ENV`: `development` / `production`
- `PUPPETEER_EXECUTABLE_PATH`: Chromium 実行ファイルパスを明示する場合に使用
- `BROWSER_USER_DATA_DIR`: Chromium プロファイル保存先（既定: `.cache/chrome-user-data`）
- `PUPPETEER_CACHE_DIR`: Puppeteer キャッシュ
- `PLAYWRIGHT_BROWSERS_PATH`: Playwright ブラウザキャッシュ
- `RENDER`: Render 環境向け分岐に使用
- `DATABASE_URL`: `drizzle.config.ts` で必須（DB 利用時）

## 既知の課題（現状）

`npm run check` 実行時に以下の型エラーがあります。

1. `server/browser.ts` で `puppeteer.launch({ headless: "new" })` の型不一致
2. `server/storage.ts` が `@shared/schema` の `User` / `InsertUser` を参照しているが未定義

このため CI 等で型チェックを厳密運用する場合は、先に上記修正が必要です。

## 補足

- 現在のメイン画面は `/` のみです。
- クライアントは接続断時に自動再接続を行います。
- サーバー側では接続時に `https://google.com` へ初期遷移します。
- Chromium の Cookie / LocalStorage は `BROWSER_USER_DATA_DIR` に永続化されます。
