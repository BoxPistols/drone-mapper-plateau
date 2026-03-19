# DroneMapper

**自治体向けドローン飛行管理アプリ**
Project PLATEAU 3D都市モデル上でルートを計画し、フライトシミュレーションで事前確認する

```
Vite 8 · React 19 · TypeScript 5 · CesiumJS 1.139 · Zustand 5
```

---

## 概要

DroneMapper は、国土交通省が公開する **PLATEAU 3D都市モデル**（3D Tiles）を地図基盤として使用する、ドローンオペレーター向けの総合飛行管理Webアプリです。

- リアルな3D建物モデル上で飛行ゾーン（ポリゴン）を描画
- ウェイポイントを順に置いてルートを設計
- シミュレーションでドローンが実際に3D都市を飛行する様子を確認
- 飛行後は記録・撮影データを一元管理

---

## クイックスタート

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 本番ビルド
```

### 環境変数

`.env` ファイルを作成し Cesium ion トークンを設定します（地形データに必要）：

```env
VITE_CESIUM_TOKEN=your_cesium_ion_token_here
```

トークンは [cesium.com/ion](https://cesium.com/ion/) で無料取得できます。
トークンなしでも3D都市モデルの表示は動作します（地形の精度が下がります）。

---

## 基本操作

### 1クリックデモ

サイドバー「マップ」タブ → **「デモフライトを開始」** をクリックすると、
台東区（浅草〜隅田川）のサンプルルートが読み込まれ即座にシミュレーションが始まります。

### 飛行ゾーンを描く

1. ツールバーの **「ゾーン」** ボタンをクリック
2. 地図上で飛行エリアの頂点を順にクリック（右クリックで直前の頂点をアンドゥ）
3. **ダブルクリック**でゾーンを確定 → ゾーン名を入力

### 飛行計画とシミュレーション

1. サイドバー「計画」タブ → **「+ 新規作成」**
2. ツールバーの **「WP」** ボタン → 地図上でウェイポイントを順にクリック
3. 各WPをクリックして高度・速度・アクションを設定
4. **「▶ シミュレート」** でドローンが3D都市を飛行

### シミュレーション中のカメラ

| モード | 説明 |
|---|---|
| 自由 | カメラ固定。マウスで自由に視点移動 |
| 追従 | ドローン後方から追いかけるゲームカメラ |
| POV | ドローン一人称視点（FPV） |

### マップ上の操作

| 操作 | 内容 |
|---|---|
| ピン/ゾーンを左クリック | ポップアップで名前・メモ・色を編集 |
| ピン/ゾーンをダブルクリック | 編集ポップアップを開く |
| ピン/ゾーンを右クリック | 削除確認ダイアログ |
| 建物を左クリック | 建物属性（名称・用途・階数など）を表示 |

---

## 対応都市（PLATEAU）

| 都市 | 都道府県 | LOD | テクスチャ |
|---|---|---|---|
| 台東区 | 東京都 | 2 | — |
| 港区 | 東京都 | 2 | — |
| 仙台市 | 宮城県 | 2 | — |
| 加賀市 | 石川県 | 2 | — |
| 沼津市 | 静岡県 | 3 | あり |
| 広島市 | 広島県 | 2 | — |
| 福岡市 | 福岡県 | 2 | あり |

---

## アーキテクチャ

```
src/
├── sim/droneSimBridge.ts    # Bridge Pattern: RAFとCesiumをつなぐ共有オブジェクト
├── store/droneStore.ts      # Zustand: 全状態 + PLATEAU都市DB + localStorage永続化
├── types.ts                 # 全型定義
├── components/
│   ├── CesiumMap.tsx        # CesiumJS Viewer + 全エンティティ管理
│   ├── map/SimPlayer.tsx    # シミュレーションHUD（RAF ループ駆動）
│   ├── map/MapEntityPopup   # マップ上のインラインCRUDポップアップ
│   └── panels/              # サイドバー各タブのパネル
└── App.tsx / App.css        # レイアウトとすべてのスタイル
```

### シミュレーションの仕組み（Bridge Pattern）

```
SimPlayer (RAF ループ)
  ↓ 毎フレーム lon/lat/altAGL/heading を書き込む
droneSimBridge（ミュータブルオブジェクト）
  ↓ 毎フレーム読み出す
CesiumMap (preRender リスナー)
  ↓ globe.getHeight() で地盤高を更新
ドローンエンティティ（altAGL + groundAlt = 表示高度）
```

React の `setState` を迂回することで、60fps のスムーズな飛行アニメーションを実現しています。

### 高度管理

```
altAGL  地上高（飛行計画で使用）  例: "50m AGL"
groundAlt 地盤高・海抜（CesiumJSで毎フレーム取得）
表示高度 = groundAlt + altAGL   （地形に追従した正確な絶対高度）
```

詳しい設計は [docs/architecture.md](./docs/architecture.md) を参照してください。

---

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/architecture.md](./docs/architecture.md) | 技術アーキテクチャ・設計判断・データフロー |
| [docs/features.md](./docs/features.md) | 各機能の詳細操作ガイド |
| [docs/mlit-api.md](./docs/mlit-api.md) | 国交省DPF MCP・PLATEAU APIの活用範囲 |

---

## データ保存

すべてのデータ（ピン・ゾーン・飛行計画・記録・撮影データ）は**ブラウザのlocalStorage**に自動保存されます。シミュレーション状態のみ非永続でセッション限定です。

---

## ライセンス

PLATEAU 3D都市モデルは [国土交通省 Project PLATEAU](https://www.mlit.go.jp/plateau/) が提供しています。
各データセットのライセンスに従って利用してください。
