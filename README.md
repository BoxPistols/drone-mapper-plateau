# DroneMapper

**自治体向けドローン飛行管理アプリ**
Project PLATEAU 3D都市モデル × 国交省データプラットフォーム MCP

---

## 概要

DroneMapper は、国土交通省が提供する **PLATEAU 3D都市モデル** を地図基盤として使用する、自治体のドローンオペレーター向け総合飛行管理アプリです。

リアルな3D建物モデル上で飛行ルートを計画し、シミュレーションで事前確認、飛行後は記録・撮影データを一元管理できます。

```
技術スタック: Vite + React + TypeScript + CesiumJS + Zustand
```

---

## クイックスタート

```bash
# 依存インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

### 環境変数

`.env` ファイルを作成し、Cesium ion トークンを設定してください（地形データの表示に使用）:

```env
VITE_CESIUM_TOKEN=your_cesium_ion_token_here
```

Cesium ion トークンは [https://cesium.com/ion/](https://cesium.com/ion/) で無料取得できます。
トークンなしでも3D Tilesの表示は動作しますが、地形データは読み込まれません。

---

## 機能一覧

詳細は [`docs/`](./docs/) を参照してください。

| ドキュメント | 内容 |
|---|---|
| [機能ガイド](./docs/features.md) | 各機能の操作方法 |
| [国交省API解説](./docs/mlit-api.md) | DPF MCP・PLATEAU GraphQL の活用範囲と制約 |
| [アーキテクチャ](./docs/architecture.md) | コード構成・データモデル・設計判断 |

---

## ライセンス

PLATEAU 3D都市モデルのデータは [国土交通省 Project PLATEAU](https://www.mlit.go.jp/plateau/) が提供しています。
データの利用条件は各データセットのライセンスに従ってください。
