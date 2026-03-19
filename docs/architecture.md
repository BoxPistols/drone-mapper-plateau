# アーキテクチャ解説

## 技術スタック

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| フレームワーク | React | 19.x | UIコンポーネント管理 |
| 言語 | TypeScript | 5.x | 型安全な実装 |
| ビルド | Vite + vite-plugin-cesium | 8.x | 高速HMR・Cesiumアセット最適化 |
| 状態管理 | Zustand + persist | 5.x | グローバル状態 + localStorage永続化 |
| 3Dマップ | CesiumJS | 1.139.x | 3D地球・都市モデル・エンティティ描画 |
| スタイル | CSS（単一ファイル） | — | App.css にすべてのスタイルを集約 |

---

## ディレクトリ構成

```
src/
├── main.tsx                    # エントリーポイント
├── App.tsx                     # ルートレイアウト（ヘッダー + サイドバー + マップエリア）
├── App.css                     # 全スタイル（カラーシステム・コンポーネント定義）
├── types.ts                    # 全型定義（10インターフェース）
│
├── sim/
│   └── droneSimBridge.ts       # Reactを迂回する高速ミュータブルオブジェクト
│
├── store/
│   └── droneStore.ts           # Zustandストア（全アプリ状態 + PLATEAU都市DB）
│
└── components/
    ├── CesiumMap.tsx            # CesiumJS Viewer本体 + 全エンティティ管理
    ├── Sidebar.tsx              # タブナビ + パネルコンテナ
    ├── BuildingInfo.tsx         # 建物属性フローティングパネル
    ├── LocationSearch.tsx       # Nominatim 場所検索
    ├── HelpModal.tsx            # ヘルプモーダル
    ├── map/
    │   ├── MapToolbar.tsx       # マップモード切替ツールバー（選択/ピン/ゾーン/WP）
    │   ├── SimPlayer.tsx        # シミュレーションHUD + コントロールバー
    │   └── MapEntityPopup.tsx   # ピン/ゾーンのインラインポップアップ（CRUD）
    └── panels/
        ├── MapPanel.tsx         # 都市選択・ピン一覧・ゾーン一覧
        ├── PlansPanel.tsx       # 飛行計画CRUD + WPエディタ
        ├── RecordsPanel.tsx     # 飛行記録CRUD
        └── MediaPanel.tsx       # 撮影データ管理
```

---

## データモデル（types.ts）

```
CityConfig       都市設定（tilesUrl / 代表座標 / LOD）
DronePin         地点マーカー（lon/lat/alt/color/note）
FlightZone       飛行エリアポリゴン（type / coordinates[][]）
Waypoint         ルートポイント（lon/lat/altAGL/speedMS/action）
FlightPlan       飛行計画（waypoints[] / status / パイロット情報）
FlightRecord     飛行記録（実績データ・天候・距離）
MediaItem        撮影データ（photo/video + 位置情報）
SimState         シミュレーション実行状態（非永続）
MapPopupState    マップ上のポップアップ座標
```

### 高度の二重管理

ドローンの高度は2種類の座標系で管理します：

```
altAGL（Above Ground Level）
  └─ 飛行計画・WPで使用。地面からの相対高度（m）。
     "30m AGL" = 地面の30m上、山の上でも平地でも意味が変わらない

groundAlt（海抜 MSL）
  └─ Cesium描画用。globe.getHeight() でシミュレーション中に毎フレーム取得。
     実際の描画高度 = groundAlt + altAGL
```

---

## 状態管理（Zustand）

`droneStore.ts` の単一ストアですべてのアプリ状態を管理します。

```typescript
interface DroneStore {
  // 都市           選択中の PLATEAU 都市
  // マップ          mapMode / buildingProps / mapPopup
  // ピン            pins[] CRUD
  // ゾーン          drawingZonePoints[] / zones[] CRUD
  // 飛行計画        plans[] / activePlanId / waypoints CRUD
  // 飛行記録        records[] CRUD
  // 撮影データ      media[] CRUD
  // シミュレーション simulation: SimState | null（非永続）
  // UI             sidebarTab / sidebarOpen
}
```

### localStorage 永続化

`zustand/middleware` の `persist` で自動保存。`simulation` は意図的に除外：

```typescript
partialize: (s) => ({
  selectedCity: s.selectedCity,
  pins: s.pins, zones: s.zones, plans: s.plans,
  records: s.records,
  media: s.media.map((m) => ({ ...m, dataUrl: undefined })), // thumbnail除外
  // simulation: 除外（セッション限定）
})
```

---

## CesiumMap.tsx の設計

最も複雑なコンポーネント。複数の `useEffect` でライフサイクルを分割しています。

### useEffect の責務分割

| useEffect の依存 | 役割 |
|---|---|
| `[]`（マウント時のみ） | Viewer初期化・地形設定・イベントハンドラ登録 |
| `[selectedCity]` | 3D Tilesの差し替え・カメラフライ |
| `[pins, zones, plans, activePlanId, drawingZonePoints]` | 静的エンティティ（ピン/ゾーン/WP）の全再構築 |
| `[simulation?.planId]` | ドローンエンティティ・preRenderループの生成/破棄 |
| `[simulation?.cameraMode]` | カメラモード切替（free時のlookAt解除） |

### クリックイベントの座標取得

ピン・ゾーン・WP追加時の地表座標取得は3段階のフォールバック：

```
1. globe.pick(ray)         地形レイキャスト（最優先・エンティティを無視）
2. scene.pickPosition()    Cesium3DTileFeature上のみ（建物屋上対応）
3. pickEllipsoid()         地形未ロード時の最終手段
```

**重要**: `scene.pickPosition()` は既存エンティティの深度バッファも読むため、
ピン/ゾーンが先に検出されると誤った位置を返す。`globe.pick()` を最優先にすることで
エンティティに惑わされない正確な地形座標を取得できる。

### エンティティID規約

クリック時の識別にCesiumエンティティのIDを使用：

```
"pin:{uuid}"    ピンエンティティ
"zone:{uuid}"   ゾーンエンティティ
```

### マウス操作の仕様

| 操作 | select モード | zone モード |
|---|---|---|
| 左クリック | ピン/ゾーン→ポップアップ、建物→属性表示 | 頂点追加 |
| 右クリック | ピン/ゾーン→削除確認 | 最後の頂点をアンドゥ |
| ダブルクリック | ピン/ゾーン→編集ポップアップ | ゾーン確定 |
| Escキー | ポップアップ閉じる | 描画キャンセル |

---

## シミュレーションのアーキテクチャ

### Bridge Pattern（droneSimBridge）

60fpsのシミュレーションでReactのレンダーサイクルを迂回するための設計：

```
SimPlayer.tsx（RAF ループ）
    │  毎フレーム書き込み（React state を経由しない）
    ▼
droneSimBridge = { active, lon, lat, altAGL, groundAlt, heading }
    │  毎フレーム読み出し（preRender）
    ▼
CesiumMap.tsx（viewer.scene.preRender）
    │  地盤高更新 + カメラ制御 + CallbackProperty で描画
    ▼
ドローンエンティティ（CesiumJS Viewer）
```

**なぜ必要か**: React の `setState` は非同期でバッチ処理される。60fpsの位置更新を
`setState` 経由で行うとレンダリングが追いつかず、ドローンが飛行ではなくテレポートする。
Bridge オブジェクトはただのミュータブルな JS オブジェクトなので、書き込みと読み出しは即時。

### SimPlayer: RAF ループの実装

```typescript
const tick = () => {
  const elapsed = (Date.now() - sim.startedAt) * sim.speed
  const progress = Math.min(elapsed / sim.totalMs, 1.0)

  // ウェイポイント間の線形補間
  const segIdx = Math.min(Math.floor(progress * totalSegs), totalSegs - 1)
  const frac = (progress * totalSegs) - segIdx
  const a = wps[segIdx], b = wps[segIdx + 1]

  droneSimBridge.lon     = a.lon    + (b.lon    - a.lon)    * frac
  droneSimBridge.lat     = a.lat    + (b.lat    - a.lat)    * frac
  droneSimBridge.altAGL  = a.altAGL + (b.altAGL - a.altAGL) * frac
  droneSimBridge.heading = Math.atan2(b.lon - a.lon, b.lat - a.lat) * (180 / Math.PI)

  setSimulation({ progress })  // UIのシーカーだけ React state で更新

  if (progress >= 1.0) { /* 完了処理 */ return }
  rafRef.current = requestAnimationFrame(tick)
}
```

### CesiumMap: preRender ループ

```typescript
viewer.scene.preRender.addEventListener(() => {
  // 1. 地盤高を同期取得（ロード済みタイルから高速に返る）
  const carto = Cartographic.fromDegrees(droneSimBridge.lon, droneSimBridge.lat)
  droneSimBridge.groundAlt = viewer.scene.globe.getHeight(carto) ?? 0

  // 2. 描画位置 = 地盤高(MSL) + 飛行高度(AGL)
  const pos = Cartesian3.fromDegrees(lon, lat, droneSimBridge.groundAlt + droneSimBridge.altAGL)

  // 3. カメラ制御（モード別）
  if (cameraMode === 'follow') {
    // 機首の真後ろ（heading + π）から追う
    viewer.camera.lookAt(pos, new HeadingPitchRange(headingRad + Math.PI, pitch, dist))
  } else if (cameraMode === 'pov') {
    // ドローン位置から前方を向く（FPV）
    viewer.camera.setView({ destination: pos, orientation: { heading, pitch: -12°, roll: 0 } })
  }
  // free モードは何もしない（カメラ解放済み）
})
```

### CallbackProperty

ドローンの position・ラベル・カメラFOV楕円を毎フレーム更新するための仕組み：

```typescript
const dronePositionCB = new CallbackProperty(() =>
  Cartesian3.fromDegrees(droneSimBridge.lon, droneSimBridge.lat,
    droneSimBridge.groundAlt + droneSimBridge.altAGL)
, false)  // false = 値がミュータブル（毎フレーム再評価）
```

---

## コンポーネント間の通信

```
[App.tsx]
  │ props       → Sidebar / CesiumMap / SimPlayer / MapEntityPopup
  │ useState    → helpOpen

[useDroneStore]（Zustand）
  │ グローバル  → すべてのコンポーネントから直接購読・更新

[window CustomEvent]（疎結合のイベントバス）
  │ 'cesium:flyTo'      LocationSearch → CesiumMap（場所検索）
  │ 'cesium:flyToCity'  App ヘッダー  → CesiumMap（都市に戻る）

[droneSimBridge]（モジュールレベルのミュータブル参照）
  │ SimPlayer → CesiumMap（60fps位置更新）
```

---

## PLATEAU 都市データベース

`droneStore.ts` の `PLATEAU_CITIES` 配列に7都市を定義：

| 都市 | LOD | テクスチャ | tileset URL の由来 |
|---|---|---|---|
| 台東区 | 2 | なし | PLATEAU CMS |
| 港区 | 2 | なし | PLATEAU CMS |
| 仙台市 | 2 | なし | PLATEAU CMS |
| 加賀市 | 2 | なし | PLATEAU CMS |
| 沼津市 | 3 | **あり** | PLATEAU CMS |
| 広島市 | 2 | なし | PLATEAU CMS |
| 福岡市 | 2 | **あり** | PLATEAU CMS |

LOD3・テクスチャ付き都市は `hasTexture: true` フラグで識別し、
白色スタイルの適用をスキップする。

---

## 設計上の主要な判断

| 判断 | 理由 |
|---|---|
| `globe.pick()` を座標取得の最優先に | `scene.pick()` は既存エンティティを拾い `pickPosition()` が誤座標を返すバグを回避 |
| Bridge Pattern（droneSimBridge） | 60fps更新をReactのバッチ処理から切り離し、ドローンを滑らかに飛ばすため |
| エンティティの全再構築方式 | 差分更新は複雑でバグリスクが高い。静的エンティティは再構築コストが許容範囲 |
| simulation を localStorage 非永続化 | リロード時に不完全な状態で再開するより、初期状態から始める方がUXが良い |
| `RAF` + `viewer.clock` 不使用 | Cesium clockはタイムライン依存で複雑。再生/一時停止/シークの独自実装の方が制御しやすい |
| `Matrix4.IDENTITY` で lookAt 解除 | `eastNorthUpToFixedFrame` をカメラ原点近くで使うと NaN になる既知バグを回避 |
| window CustomEvent バス | LocationSearch → CesiumMap の直接props/refチェーンを避け、コンポーネントを疎結合に保つ |
| `Space Grotesk` + `DM Sans` 混在 | HUDの数値表示は等幅（Space Grotesk）、日本語UIはヒューマニスト体（DM Sans）で可読性を分ける |
