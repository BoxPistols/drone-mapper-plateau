# DroneMapper

**国土交通省 PLATEAU 3D都市モデルを使ったドローン飛行計画・管理Webアプリ**

```
Vite 8 · React 19 · TypeScript 5 · CesiumJS 1.139 · Zustand 5 · OpenAI API
```

---

## 概要

DroneMapper は、国土交通省が無償公開する **PLATEAU 3D都市モデル（3D Tiles）** を地図基盤として使用する、ドローンオペレーター向けの総合飛行管理Webアプリです。

リアルな3D建物の上を実際にドローンが飛ぶシミュレーションで、飛行計画の事前確認・法規制チェック・記録管理までを一貫して行えます。

### 主な機能

| 機能 | 説明 |
|---|---|
| **3D地図ビューアー** | PLATEAU 3D Tilesをリアルタイム表示。2D/2.5D/3D切り替え対応 |
| **飛行ゾーン描画** | ポリゴンで飛行エリア・禁止区域・注意区域を地図上に登録 |
| **飛行計画作成** | ウェイポイントの配置・高度・速度・アクション設定 |
| **フライトシミュレーション** | 60fps・地形追従・POV/追従/自由カメラ |
| **飛行前チェックリスト** | 航空法150m制限警告を含む安全確認6項目 |
| **飛行統計** | 総距離・飛行時間・撮影ポイント数をリアルタイム計算 |
| **KML/JSONエクスポート** | Google Earth・DJI Pilot 2で使える形式で書き出し |
| **AIアシスタント** | 自然言語で飛行計画を生成（GPT-4.1 mini） |
| **飛行記録・メディア管理** | 飛行後の記録・撮影データを一元管理 |

---

## クイックスタート

```bash
git clone <repository-url>
cd plateau-viewer
npm install
cp .env.example .env   # 環境変数を設定
npm run dev            # http://localhost:5173
```

### 環境変数

```env
# Cesium ion トークン（地形データの高精度化に必要。なくても動作する）
VITE_CESIUM_TOKEN=your_cesium_ion_token_here

# OpenAI API キー（AIアシスタント機能に必要）
# 警告: デモ目的のみ。本番環境ではサーバーサイドプロキシ経由にすること
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

トークン・キーの取得先:
- Cesium ion: https://cesium.com/ion/（無料プラン対応）
- OpenAI: https://platform.openai.com/

---

## 使用している外部サービス・API

### 1. 国土交通省 Project PLATEAU（3D Tiles）

**なぜ使うのか**

ドローン飛行には「実際の建物高さ・形状」の把握が不可欠です。衛星写真の2Dマップでは建物の高さがわからず、飛行経路が建物に干渉するリスクを正確に評価できません。PLATEAUは日本の主要都市を LOD2（外形形状）〜 LOD3（詳細形状・テクスチャ）で3D化したデータを無償公開しており、このアプリの3D表示基盤として使用しています。

**どこで使っているのか**

`src/store/droneStore.ts` の `PLATEAU_CITIES` 配列に、各都市のtileset URLを定義しています：

```typescript
// src/store/droneStore.ts
export const PLATEAU_CITIES: CityConfig[] = [
  {
    id: 'taito',
    name: '台東区',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/.../tileset.json',
    longitude: 139.7965,
    latitude: 35.7150,
    height: 1000,
    lod: 2,
  },
  // ... 7都市
]
```

**どのように使っているのか**

`src/components/CesiumMap.tsx` の都市切替 useEffect 内で `Cesium3DTileset.fromUrl()` を呼び出し、CesiumJS のシーンにタイルセットを追加します：

```typescript
// src/components/CesiumMap.tsx
Cesium3DTileset.fromUrl(city.tilesUrl, {
  maximumScreenSpaceError: 4,  // 精細度（低いほど高品質）
})
.then((tileset) => {
  viewer.scene.primitives.add(tileset)
})
```

テクスチャなし都市（LOD2）は白色スタイルを自動適用し、建物の輪郭が視認しやすくなります。

**対応都市**

| 都市 | 都道府県 | LOD | テクスチャ | 特徴 |
|---|---|---|---|---|
| 台東区 | 東京都 | 2 | なし | 浅草・上野エリア |
| 港区 | 東京都 | 2 | なし | 東京タワー・六本木周辺 |
| 仙台市 | 宮城県 | 2 | なし | 東北最大都市 |
| 加賀市 | 石川県 | 2 | なし | 能登半島近郊 |
| 沼津市 | 静岡県 | **3** | **あり** | 最高精細・テクスチャ付き |
| 広島市 | 広島県 | 2 | なし | 平和公園周辺 |
| 福岡市 | 福岡県 | 2 | あり | 中洲・天神エリア |

**データライセンス**

国土交通省 Project PLATEAUのデータは [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) または独自ライセンスで公開されています。各データセットの利用規約を確認してください。
- 公式サイト: https://www.mlit.go.jp/plateau/
- データダウンロード: https://www.geospatial.jp/ckan/dataset/plateau

---

### 2. CesiumJS + Cesium ion（地形データ）

**なぜ使うのか**

CesiumJS は WebGL ベースの3D地球儀ライブラリで、3D Tiles の標準実装を持つ唯一の主要OSS です。ドローンの飛行高度は「地表からの高さ（AGL）」で管理しますが、実際の表示には「海抜高度（MSL）」への変換が必要です。CesiumJS の `globe.getHeight()` API でピクセル単位の地盤高を取得し、正確な飛行高度を計算しています。

Cesium ion は地形タイル（CesiumWorldTerrain）の配信サービスです。トークンなしでも動作しますが、地形の凹凸精度が低下します。

**どこで・どのように使っているのか**

```typescript
// src/components/CesiumMap.tsx

// 1. 地形プロバイダーの設定（マウント時）
createWorldTerrainAsync().then((t) => {
  viewer.terrainProvider = t
})

// 2. 地盤高の毎フレーム取得（preRender ループ）
const carto = Cartographic.fromDegrees(droneSimBridge.lon, droneSimBridge.lat)
droneSimBridge.groundAlt = viewer.scene.globe.getHeight(carto) ?? 0

// 3. 飛行高度の計算
// 表示高度 = groundAlt（地盤高 MSL）+ altAGL（地上高）
const pos = Cartesian3.fromDegrees(lon, lat, groundAlt + altAGL)
```

**地表クリックのピッキング方式**

`pickPosition()` はポリゴンエンティティ表示中に誤った深度を返すバグがあるため、代わりに `globe.pick(ray)` のみを使用しています。これはカメラからのレイと地形メッシュの純粋な数学的交点を求める手法で、レンダリング状態に依存しない最も安定した方法です。

```typescript
// pickPosition() は使わない（PolylineGraphicsで深度ズレが発生するため）
const ray = viewer.camera.getPickRay(pos)
const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
```

---

### 3. OpenAI API（AIアシスタント）

**なぜ使うのか**

飛行計画の作成は「地図を見ながらウェイポイントを1つずつ配置する」という作業が基本ですが、初心者には難しく時間もかかります。AIが「浅草から隅田川沿いに飛ばして」という自然言語指示を受け取り、適切なウェイポイント座標・高度・速度を自動生成することで、計画作成を大幅に効率化します。

**どこで使っているのか**

```
src/ai/
├── useAIChat.ts    # ストリーミング対応の会話Hookとツール実行ループ
└── tools.ts        # AIが操作できるアプリ機能の定義
```

**どのように使っているのか**

OpenAI API の **Function Calling（関数呼び出し）** 機能を使い、AIが直接アプリの状態を操作します：

```typescript
// src/ai/tools.ts に定義されたツール一覧
const tools = [
  {
    name: 'get_app_state',
    description: '現在の飛行計画・ピン・ゾーンの状態を取得',
  },
  {
    name: 'create_flight_plan',
    description: '新しい飛行計画を作成',
    parameters: { name: string, description?: string }
  },
  {
    name: 'add_waypoints',
    description: 'ウェイポイントを複数追加',
    parameters: { planId: string, waypoints: WaypointInput[] }
  },
  {
    name: 'select_city',
    description: '表示都市を切り替え',
  },
  {
    name: 'add_pin',
    description: '地図にランドマークピンを追加',
  },
  {
    name: 'start_simulation',
    description: '指定した計画のシミュレーションを開始',
  },
]
```

会話フローはストリーミング対応で、AIの思考過程をリアルタイム表示します：

```typescript
// src/ai/useAIChat.ts
// 1. ユーザーメッセージを送信
// 2. finish_reason === 'tool_calls' になるまでストリーミング受信
// 3. function calling があればアプリ操作を実行
// 4. ツール結果をAPIに返送 → AIが最終回答を生成
```

使用モデル: **GPT-4.1 mini**（`gpt-4.1-mini`）

**セキュリティ上の注意**

現在の実装はデモ目的でブラウザから直接 OpenAI API を呼び出しています（`dangerouslyAllowBrowser: true`）。本番環境では、APIキーをサーバーサイドに移動し、プロキシ経由でリクエストする必要があります。

---

### 4. Cesium ion Asset（補助データ）

標準的な地図タイル（Bing Maps衛星写真・OpenStreetMap）は Cesium ion のデフォルトアセットとして自動ロードされます。PLATEAU 3D Tilesと組み合わせることで、衛星写真の上に3D建物モデルが重畳表示されます。

---

## アーキテクチャ

```
src/
├── ai/
│   ├── tools.ts          # OpenAI AIツール定義・実行マッピング
│   └── useAIChat.ts      # ストリーミング会話Hook（tool-use ループ）
│
├── components/
│   ├── CesiumMap.tsx     # 3Dビューアーのすべて
│   │                     #   - PLATEAU 3D Tiles ロード・切り替え
│   │                     #   - エンティティ（ピン/ゾーン/WP/ドローン）管理
│   │                     #   - クリック・右クリックイベント処理
│   │                     #   - preRender ループ（カメラ追従・地盤高更新）
│   │                     #   - 2D/2.5D/3D モード切り替え
│   ├── PreflightChecklist.tsx  # 飛行前安全確認モーダル
│   ├── map/
│   │   ├── SimPlayer.tsx  # シミュレーションHUD・RAFループ
│   │   ├── MapToolbar.tsx # 地図操作モード選択バー
│   │   └── MapEntityPopup.tsx  # ピン/ゾーン/WP のインライン編集
│   └── panels/
│       ├── MapPanel.tsx   # 都市選択・ピン・ゾーン管理
│       ├── PlansPanel.tsx # 飛行計画CRUD・統計・エクスポート
│       ├── RecordsPanel.tsx    # 飛行記録管理
│       ├── MediaPanel.tsx      # 撮影データ管理
│       └── AIPanel.tsx         # AIチャット UI
│
├── sim/
│   └── droneSimBridge.ts  # React-Cesium Bridge（ミュータブル共有オブジェクト）
│
├── store/
│   └── droneStore.ts      # Zustand ストア + localStorage 永続化
│
└── types.ts               # 全型定義
```

---

## シミュレーションの仕組み

### Bridge Pattern（60fps を実現するための設計）

React の `setState` は非同期・バッチ処理であるため、毎フレーム呼び出すと描画が点滅します。そこで **ミュータブルなブリッジオブジェクト** `droneSimBridge` を介して SimPlayer と CesiumMap を直結しています。

```
SimPlayer（requestAnimationFrame ループ）
  │
  │ 毎フレーム書き込む: lon / lat / altAGL / heading / cameraMode
  ↓
droneSimBridge（src/sim/droneSimBridge.ts）
  │                              ← React の setState を迂回
  │ 毎フレーム読み出す
  ↓
CesiumMap.preRender リスナー
  │ globe.getHeight() → groundAlt を更新
  │ CallbackProperty が自動的に表示位置を更新
  ↓
CesiumJS エンティティ（60fps で点滅なし）
```

### フェーズベース時間管理

各セグメントの所要時間は「距離 ÷ 速度」で計算し、ホバー時間を加算した **累積タイムライン** を構築します。等分割（全セグメント同一時間）ではないため、速度差のあるルートでも正確に再現します。

```typescript
// 例: WP1→WP2 距離200m @ 5m/s = 40秒
//     WP2 ホバー = 10秒
//     WP2→WP3 距離500m @ 10m/s = 50秒
// タイムライン: [0〜40s: 飛行] [40〜50s: ホバー] [50〜100s: 飛行]
```

### 高度系の管理

```
altAGL    地上高（ユーザーが設定）    例: 50m
groundAlt 地盤高・海抜（MSL）        例: 8m  ← globe.getHeight() で毎フレーム取得
表示高度  = groundAlt + altAGL     例: 58m（絶対海抜高度）
```

この方式により、地形の起伏に追従しながら「常に地面から50m」の飛行を正確に表現できます。

---

## 飛行規制への対応

### 航空法 150m 制限

ウェイポイントの高度（AGL）が 150m を超えた場合:

1. ウェイポイント行に「150m超」バッジを表示
2. 飛行統計の最大高度を赤字で表示
3. 飛行前チェックリストに「国土交通省への申請が必要」と警告を表示

```typescript
// src/components/panels/PlansPanel.tsx
const overLimit = wp.altAGL > 150
// → バッジ・警告・チェックリストへ反映
```

### 飛行前チェックリスト

シミュレーション開始時に必須確認する6項目:

1. バッテリー残量（80%以上）
2. 気象条件（風速・視界）
3. NOTAM・飛行禁止情報
4. 飛行エリアの安全確認
5. 機体整備・点検
6. 許可・申請（DID地区等）

全項目をチェックしないとシミュレーション（≒実飛行の事前確認）を開始できない設計です。

---

## データ・ファイル管理

### ローカル永続化（localStorage）

飛行計画・ピン・ゾーン・記録は Zustand の `persist` ミドルウェアでブラウザの localStorage に自動保存されます。シミュレーション実行状態は揮発性（保存されません）。

### エクスポート形式

**JSON 形式**
`FlightPlan` オブジェクトをそのままJSONに書き出します。同アプリへのインポートや、バックエンド連携に使用できます。

**KML 形式**
Google Earth / DJI Pilot 2 / QGroundControl などのドローン運航管理ソフトで読み込める形式です。ウェイポイントの `absolute` 高度（MSL = groundAlt + altAGL）で書き出します。

```xml
<!-- 出力例 -->
<LineString>
  <altitudeMode>absolute</altitudeMode>
  <coordinates>
    139.7940,35.7110,36.0
    139.7980,35.7130,65.0
    ...
  </coordinates>
</LineString>
```

---

## 操作リファレンス

### マップ操作

| 操作 | 動作 |
|---|---|
| 左クリック（選択モード）| 地図を移動・3D建物の属性を表示 |
| **右クリック**（エンティティ）| **ピン・ゾーン・WPの編集ポップアップを表示** |
| 右クリック（空白）| ポップアップを閉じる |
| ドラッグ | 視点移動 |
| スクロール | ズーム |
| 右ドラッグ / 2本指 | 視点回転・傾き変更 |

### キーボードショートカット

| キー | 動作 |
|---|---|
| **Space** | シミュレーション 再生 / 一時停止 |
| Escape | 描画モードをキャンセル / ポップアップを閉じる |

### マップコントロールパネル（右下）

| ボタン | 動作 |
|---|---|
| 2D | 平面地図に切り替え（現在地保持） |
| 2.5D | コロンバスビュー（斜め俯瞰）に切り替え |
| 3D | 3Dグローブに切り替え（デフォルト） |
| ＋ / − | ズームイン / アウト |
| ⊕ | カメラの傾き（roll）をリセット |

---

## 技術スタック

| 技術 | バージョン | 用途 |
|---|---|---|
| React | 19 | UIフレームワーク |
| TypeScript | 5.9 | 型安全な開発 |
| Vite | 8 | ビルドツール |
| CesiumJS | 1.139 | 3D地球儀・3D Tiles表示 |
| Zustand | 5 | グローバル状態管理 |
| `openai` | ^4 | OpenAI API クライアント |
| `vite-plugin-cesium` | 1.2 | CesiumJSのVite統合 |

---

## 開発者向け情報

### ビルドコマンド

```bash
npm run dev      # 開発サーバー起動 (http://localhost:5173)
npm run build    # 本番ビルド → dist/
npm run lint     # ESLint 実行
npx tsc --noEmit # 型チェックのみ
```

### コーディング規約

- **AGL/MSL の混在厳禁**: `altAGL`（地上高）と `groundAlt`（海抜地盤高）は必ず区別する
- **droneSimBridge への書き込みは SimPlayer のみ**: preRender からの読み取り専用
- **`globe.pick()` のみ使用**: `pickPosition()` は廃止（PolylineGraphics 時に深度ズレ発生）
- `depthTestAgainstTerrain` は意図的に無効化（有効化するとピッキング精度低下）
- CSS の `--accent` 色変数を使用（ハードコードの blue 禁止）

### Agent Teams（AI 協調開発）

このプロジェクトは Claude Code の複数エージェントで開発されています。詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。

---

## ライセンス

- **アプリケーションコード**: MIT License
- **PLATEAU 3D都市モデル**: 各データセットのライセンスに従う（CC BY 4.0 等）
  - 公式: https://www.mlit.go.jp/plateau/
- **CesiumJS**: Apache 2.0 License
