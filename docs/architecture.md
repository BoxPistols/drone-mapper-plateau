# アーキテクチャ

## ディレクトリ構成

```
plateau-viewer/
├── docs/                      # ドキュメント（本ドキュメント）
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.tsx                # ルートレイアウト
│   ├── App.css                # 全スタイル
│   ├── main.tsx
│   ├── index.css
│   ├── types.ts               # 全型定義
│   ├── store/
│   │   └── droneStore.ts      # Zustand グローバルストア
│   └── components/
│       ├── CesiumMap.tsx      # 3Dマップ（Cesium本体 + 全エンティティ）
│       ├── Sidebar.tsx        # サイドバーナビ + パネル切替
│       ├── LocationSearch.tsx # Nominatim 場所検索
│       ├── BuildingInfo.tsx   # 建物属性フローティングパネル
│       ├── map/
│       │   ├── MapToolbar.tsx # マップモード切替ツールバー
│       │   └── SimPlayer.tsx  # シミュレーション操作UI
│       └── panels/
│           ├── MapPanel.tsx   # 都市選択・ピン・ゾーン管理
│           ├── PlansPanel.tsx # 飛行計画CRUD + WPエディタ
│           ├── RecordsPanel.tsx # 飛行記録CRUD
│           └── MediaPanel.tsx  # 撮影データ管理
├── .env                       # VITE_CESIUM_TOKEN（gitignore済み）
├── .gitignore
├── package.json
├── vite.config.ts
└── tsconfig.app.json
```

---

## 状態管理（Zustand）

全アプリ状態は `src/store/droneStore.ts` の単一ストアで管理します。

```typescript
// 主要な状態グループ
useDroneStore = {
  // 都市
  selectedCity: CityConfig

  // マップモード
  mapMode: 'select' | 'pin' | 'zone' | 'waypoint'

  // データ（localStorageに永続化）
  pins: DronePin[]
  zones: FlightZone[]
  plans: FlightPlan[]
  records: FlightRecord[]
  media: MediaItem[]

  // ゾーン描画中の一時データ
  drawingZonePoints: [number, number][]

  // シミュレーション（永続化しない）
  simulation: SimState | null

  // UI
  sidebarTab: 'map' | 'plans' | 'records' | 'media'
  sidebarOpen: boolean
}
```

### 永続化の仕組み
`zustand/middleware` の `persist` を使用。`localStorage` への読み書きは自動。
ただし `simulation` は `partialize` オプションで除外しています。

---

## データモデル

### CityConfig（都市設定）
```typescript
interface CityConfig {
  id: string
  name: string
  prefecture: string
  tilesUrl: string    // tileset.json の URL
  longitude: number   // 代表座標
  latitude: number
  height: number      // 初期カメラ高度
  lod?: number        // 1 | 2 | 3
  hasTexture?: boolean
}
```

### FlightPlan（飛行計画）
```typescript
interface FlightPlan {
  id: string
  name: string
  cityId: string
  waypoints: Waypoint[]
  maxAltAGL: number     // 最大地上高 (m)
  droneModel?: string
  pilotName?: string
  plannedDate?: string
  status: 'draft' | 'approved' | 'completed'
  createdAt: string
  updatedAt: string
}
```

### Waypoint（ウェイポイント）
```typescript
interface Waypoint {
  id: string
  lon: number
  lat: number
  altAGL: number        // 地上高 (m)
  speedMS: number       // 速度 (m/s)
  action: 'none' | 'photo' | 'video_start' | 'video_stop' | 'hover'
  hoverSec?: number
  heading?: number      // 機首方位 (度)
}
```

---

## CesiumMap コンポーネント

最も複雑なコンポーネント。Cesiumの初期化と全エンティティのレンダリングを担います。

### 処理の流れ

```
useEffect([])         → Viewer初期化 + イベントハンドラ設定
useEffect([city])     → 都市変更時: 3D Tilesの差し替え
useEffect([pins, zones, plans, simulation...])
                      → エンティティの全再構築
window.on('cesium:flyTo') → 場所検索からのカメラ移動
```

### エンティティ管理
毎回 `entityRefs.current` の配列を全削除して再構築するシンプルな方式を採用。
パフォーマンスより実装のシンプルさを優先しています。

### クリックイベント処理
```
mapMode === 'select'   → scene.pick() → Cesium3DTileFeature → 建物属性
mapMode === 'pin'      → pickEllipsoid() → lon/lat → addPin()
mapMode === 'zone'     → pickEllipsoid() → addDrawingPoint()
mapMode === 'waypoint' → pickEllipsoid() → addWaypoint(activePlanId)
ダブルクリック(zone)   → commitZone()
```

### 場所検索との連携
`window.dispatchEvent(new CustomEvent('cesium:flyTo', ...))` で疎結合。
LocationSearch → App.tsx → window event → CesiumMap の流れ。

---

## シミュレーション

### アーキテクチャ
Cesiumの `viewer.clock` を使わず、`requestAnimationFrame` による手動アニメーション。

```
SimPlayer.tsx (UI)
  ↓ setSimulation({ playing: true })
droneStore.ts (SimState)
  ↑ setSimulation({ dronePos, progress })
SimPlayer.tsx (useEffect)
  → requestAnimationFrame loop
  → 線形補間でdronePos更新
  → droneStore経由でCesiumMapに通知
CesiumMap.tsx
  → useEffect([simulation?.dronePos])
  → droneEntityの位置更新
```

### 補間計算
```typescript
// segProgress: 0 = WP1, 1 = WP2, 2 = WP3 ...
const segProgress = progress * (waypoints.length - 1)
const segIdx = Math.floor(segProgress)
const frac = segProgress - segIdx

position = lerp(waypoints[segIdx], waypoints[segIdx+1], frac)
```

### 所要時間計算
```typescript
// 3D距離（水平 + 垂直）/ 速度
dist = sqrt(dx² + dy² + dz²)   // dx/dy: メートル換算
time += dist / wp.speedMS
```

---

## 設計上の判断

| 判断 | 理由 |
|------|------|
| Zustand（Context不使用） | 複数パネルからの参照が多く、Context のネストが深くなるため |
| localStorage 永続化 | サーバーサイド不要でMVPとして十分。データ量が増えたらIndexedDBへ移行 |
| エンティティ全再構築 | 差分更新は複雑になりバグリスクが高い。60FPS不要なので再構築コストは許容 |
| RAF手動アニメーション | Cesiumの `viewer.clock` との連携が複雑。再生/一時停止/シークを独自実装する方が制御しやすい |
| Nominatim OSM | 無料・APIキー不要。利用規約（User-Agentヘッダ推奨）を遵守すること |
| window イベントバス | LocationSearch → Cesium 間の直接のprops/refチェーンを避けるため |
