import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { droneSimBridge } from '../sim/droneSimBridge'
import { generatePerimeterPoints, generateGridPoints } from '../utils/geoUtils'
import type {
  CityConfig,
  DronePin,
  FlightZone,
  FlightPlan,
  FlightRecord,
  MediaItem,
  MapMode,
  SidebarTab,
  BuildingProperties,
  SimState,
  Waypoint,
  MapPopupState,
  Toast,
} from '../types'

// デフォルト都市リスト
export const PLATEAU_CITIES: CityConfig[] = [
  { id: 'taito', name: '台東区', prefecture: '東京都',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/59/0fbb20-59cb-4ce5-9d12-2273ce72e6d2/13106_taito-ku_city_2024_citygml_1_op_bldg_3dtiles_13106_taito-ku_lod2_no_texture/tileset.json',
    longitude: 139.7965, latitude: 35.7150, height: 1000, lod: 2 },
  { id: 'minato', name: '港区', prefecture: '東京都',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/ee/252e4a-c745-45fd-95f0-f0a396d4e395/13103_minato-ku_pref_2023_citygml_2_op_bldg_3dtiles_13103_minato-ku_lod2_no_texture/tileset.json',
    longitude: 139.7454, latitude: 35.6585, height: 1200, lod: 2 },
  { id: 'sendai', name: '仙台市', prefecture: '宮城県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/bd/e78220-9044-4dcd-9519-5ff5730e25f2/04100_sendai-shi_city_2024_citygml_1_op_bldg_3dtiles_04101_aoba-ku_lod2_no_texture/tileset.json',
    longitude: 140.8697, latitude: 38.2526, height: 1500, lod: 2 },
  { id: 'kaga', name: '加賀市', prefecture: '石川県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/aa/36a235-f066-4d31-861a-11cf2e25ba66/17206_kaga-shi_city_2024_citygml_1_op_bldg_3dtiles_lod2_no_texture/tileset.json',
    longitude: 136.3058, latitude: 36.2984, height: 1500, lod: 2 },
  { id: 'numazu', name: '沼津市', prefecture: '静岡県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/0e/14ced9-b904-42fa-af64-ca1be1269ac1/22203_numazu-shi_city_2023_citygml_3_op_bldg_3dtiles_lod3/tileset.json',
    longitude: 138.8643, latitude: 35.0964, height: 800, lod: 3, hasTexture: true },
  { id: 'hiroshima', name: '広島市', prefecture: '広島県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/96/b46095-22bc-4190-b658-3ef163e36c9f/34100_hiroshima-shi_city_2024_citygml_1_op_bldg_3dtiles_34101_naka-ku_lod2_no_texture/tileset.json',
    longitude: 132.4553, latitude: 34.3954, height: 1200, lod: 2 },
  { id: 'fukuoka', name: '福岡市', prefecture: '福岡県',
    tilesUrl: 'https://assets.cms.plateau.reearth.io/assets/bf/d8ff81-ad03-486b-a021-6865e50c3b23/40130_fukuoka-shi_city_2024_citygml_2_op_bldg_3dtiles_40133_chuo-ku_lod2/tileset.json',
    longitude: 130.4017, latitude: 33.5901, height: 1200, lod: 2, hasTexture: true },
]

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// サンプルメディア用（Unsplash 固定URL — ドローン/航空写真）
const AERIAL_PHOTOS = [
  'https://images.unsplash.com/photo-1506947411487-a56738267384?w=640&h=480&fit=crop', // 都市俯瞰
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=640&h=480&fit=crop', // 夜景都市
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=640&h=480&fit=crop', // 都市空撮
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=640&h=480&fit=crop', // 都市風景
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=640&h=480&fit=crop', // 東京タワー
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=640&h=480&fit=crop', // 東京渋谷
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=640&h=480&fit=crop', // 日本寺社
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=640&h=480&fit=crop', // 日本街並み
]
const PANORAMA_PHOTOS = [
  'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=1280&h=480&fit=crop', // 都市パノラマ
  'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1280&h=480&fit=crop', // 空撮パノラマ
]
const VIDEO_THUMBS = [
  'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=640&h=360&fit=crop', // ドローン飛行
  'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=640&h=360&fit=crop', // 航空映像
]

interface DroneStore {
  // 都市
  selectedCity: CityConfig
  setSelectedCity: (city: CityConfig) => void

  // マップ
  mapMode: MapMode
  setMapMode: (mode: MapMode) => void
  buildingProps: BuildingProperties | null
  setBuildingProps: (props: BuildingProperties | null) => void

  // ピン
  pins: DronePin[]
  addPin: (lon: number, lat: number, alt: number) => DronePin
  updatePin: (id: string, patch: Partial<DronePin>) => void
  deletePin: (id: string) => void

  // ゾーン (描画中)
  drawingZonePoints: [number, number][]
  addDrawingPoint: (lon: number, lat: number) => void
  removeLastDrawingPoint: () => void
  resetDrawingPoints: () => void
  commitZone: (name: string, type: FlightZone['type'], pts?: [number, number][]) => void
  zones: FlightZone[]
  updateZone: (id: string, patch: Partial<FlightZone>) => void
  deleteZone: (id: string) => void

  // 飛行計画
  plans: FlightPlan[]
  activePlanId: string | null
  setActivePlanId: (id: string | null) => void
  addPlan: () => FlightPlan
  updatePlan: (id: string, patch: Partial<FlightPlan>) => void
  deletePlan: (id: string) => void
  addWaypoint: (planId: string, lon: number, lat: number, groundAlt?: number) => void
  updateWaypoint: (planId: string, wpId: string, patch: Partial<Waypoint>) => void
  deleteWaypoint: (planId: string, wpId: string) => void
  moveWaypoint: (planId: string, wpId: string, dir: 'up' | 'down') => void

  // 飛行記録
  records: FlightRecord[]
  addRecord: (planId?: string) => FlightRecord
  updateRecord: (id: string, patch: Partial<FlightRecord>) => void
  deleteRecord: (id: string) => void

  // 撮影データ
  media: MediaItem[]
  addMedia: (item: Omit<MediaItem, 'id'>) => void
  deleteMedia: (id: string) => void
  selectedMediaId: string | null
  setSelectedMediaId: (id: string | null) => void

  // ゾーンからWP生成
  generateWaypointsFromZone: (planId: string, zoneId: string, opts: {
    mode: 'perimeter' | 'grid'
    spacingM: number
    altAGL: number
    speedMS: number
  }) => void

  // シミュレーション
  simulation: SimState | null
  startSimulation: (planId: string) => void
  stopSimulation: () => void
  setSimulation: (patch: Partial<SimState>) => void

  // UI
  sidebarTab: SidebarTab
  setSidebarTab: (tab: SidebarTab) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // マップポップアップ
  mapPopup: MapPopupState | null
  setMapPopup: (popup: MapPopupState | null) => void

  // トースト通知
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void

  // サンプルデータ
  seedExampleData: () => void
}

export const useDroneStore = create<DroneStore>()(
  persist(
    (set, get) => ({
      // 都市
      selectedCity: PLATEAU_CITIES[0],
      setSelectedCity: (city) => set({ selectedCity: city, buildingProps: null }),

      // マップ
      mapMode: 'select',
      setMapMode: (mode) => {
        if (mode !== 'zone') set({ drawingZonePoints: [] })
        set({ mapMode: mode })
      },
      buildingProps: null,
      setBuildingProps: (props) => set({ buildingProps: props }),

      // ピン
      pins: [],
      addPin: (lon, lat, alt) => {
        const pin: DronePin = {
          id: uid(), name: `ポイント ${get().pins.length + 1}`,
          lon, lat, alt, color: '#58a6ff', createdAt: new Date().toISOString(),
        }
        set((s) => ({ pins: [...s.pins, pin] }))
        return pin
      },
      updatePin: (id, patch) =>
        set((s) => ({ pins: s.pins.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deletePin: (id) => set((s) => ({ pins: s.pins.filter((p) => p.id !== id) })),

      // ゾーン
      drawingZonePoints: [],
      addDrawingPoint: (lon, lat) =>
        set((s) => ({ drawingZonePoints: [...s.drawingZonePoints, [lon, lat]] })),
      removeLastDrawingPoint: () =>
        set((s) => ({ drawingZonePoints: s.drawingZonePoints.slice(0, -1) })),
      resetDrawingPoints: () => set({ drawingZonePoints: [] }),
      commitZone: (name, type, pts) => {
        // pts が渡された場合はそちらを使用（ダブルクリック余剰点除去済み）
        const coords = pts ?? get().drawingZonePoints
        if (coords.length < 3) return
        const zone: FlightZone = {
          id: uid(), name, type, coordinates: coords, createdAt: new Date().toISOString(),
        }
        set((s) => ({ zones: [...s.zones, zone], drawingZonePoints: [], mapMode: 'select' }))
      },
      zones: [],
      updateZone: (id, patch) =>
        set((s) => ({ zones: s.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) })),
      deleteZone: (id) => set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),

      // 飛行計画
      plans: [],
      activePlanId: null,
      setActivePlanId: (id) => set({ activePlanId: id }),
      addPlan: () => {
        const plan: FlightPlan = {
          id: uid(), name: `飛行計画 ${get().plans.length + 1}`,
          cityId: get().selectedCity.id, waypoints: [],
          maxAltAGL: 60, status: 'draft',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }
        set((s) => ({ plans: [...s.plans, plan], activePlanId: plan.id }))
        return plan
      },
      updatePlan: (id, patch) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        })),
      deletePlan: (id) =>
        set((s) => ({
          plans: s.plans.filter((p) => p.id !== id),
          activePlanId: s.activePlanId === id ? null : s.activePlanId,
        })),
      addWaypoint: (planId, lon, lat, groundAlt = 0) => {
        const plan = get().plans.find((p) => p.id === planId)
        if (!plan) return
        const prev = plan.waypoints[plan.waypoints.length - 1]
        const wp: Waypoint = {
          id: uid(), lon, lat,
          altAGL:    prev?.altAGL  ?? 50,  // 前WPの地上高を引き継ぐ
          groundAlt,                        // クリック地点の地盤高(MSL)
          speedMS:   prev?.speedMS ?? 5,
          action: 'none',
        }
        get().updatePlan(planId, { waypoints: [...plan.waypoints, wp] })
      },
      updateWaypoint: (planId, wpId, patch) => {
        const plan = get().plans.find((p) => p.id === planId)
        if (!plan) return
        get().updatePlan(planId, {
          waypoints: plan.waypoints.map((w) => (w.id === wpId ? { ...w, ...patch } : w)),
        })
      },
      deleteWaypoint: (planId, wpId) => {
        const plan = get().plans.find((p) => p.id === planId)
        if (!plan) return
        get().updatePlan(planId, { waypoints: plan.waypoints.filter((w) => w.id !== wpId) })
      },
      moveWaypoint: (planId, wpId, dir) => {
        const plan = get().plans.find((p) => p.id === planId)
        if (!plan) return
        const idx = plan.waypoints.findIndex((w) => w.id === wpId)
        if (idx < 0) return
        const newIdx = dir === 'up' ? idx - 1 : idx + 1
        if (newIdx < 0 || newIdx >= plan.waypoints.length) return
        const wps = [...plan.waypoints]
        ;[wps[idx], wps[newIdx]] = [wps[newIdx], wps[idx]]
        get().updatePlan(planId, { waypoints: wps })
      },

      // 飛行記録
      records: [],
      addRecord: (planId) => {
        const plan = planId ? get().plans.find((p) => p.id === planId) : undefined
        const rec: FlightRecord = {
          id: uid(),
          planId,
          name: plan ? `${plan.name} 記録` : `飛行記録 ${get().records.length + 1}`,
          pilot: plan?.pilotName ?? '',
          date: new Date().toISOString().slice(0, 10),
          status: 'planned',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ records: [rec, ...s.records] }))
        return rec
      },
      updateRecord: (id, patch) =>
        set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),

      // メディア
      media: [],
      addMedia: (item) =>
        set((s) => ({ media: [{ ...item, id: uid() }, ...s.media] })),
      deleteMedia: (id) => set((s) => ({ media: s.media.filter((m) => m.id !== id) })),
      selectedMediaId: null,
      setSelectedMediaId: (id) => set({ selectedMediaId: id }),

      // ゾーンからWP生成
      generateWaypointsFromZone: (planId, zoneId, opts) => {
        const zone = get().zones.find((z) => z.id === zoneId)
        const plan = get().plans.find((p) => p.id === planId)
        if (!zone || !plan || zone.coordinates.length < 3) return

        const points = opts.mode === 'grid'
          ? generateGridPoints(zone.coordinates, opts.spacingM)
          : generatePerimeterPoints(zone.coordinates, opts.spacingM)

        if (points.length > 100) {
          get().addToast(`生成ポイントが${points.length}点で多すぎます。間隔を広げてください`, 'warning')
          return
        }
        if (points.length === 0) {
          get().addToast('ポイントが生成できませんでした', 'warning')
          return
        }

        // 既存WPの後に追加
        const wps = [...plan.waypoints]
        for (const [lon, lat] of points) {
          wps.push({
            id: uid(),
            lon, lat,
            altAGL: opts.altAGL,
            groundAlt: 0,
            speedMS: opts.speedMS,
            action: 'none' as const,
          })
        }
        get().updatePlan(planId, { waypoints: wps })
        get().addToast(`${zone.name} から ${points.length} ポイントを生成しました`, 'success')
      },

      // シミュレーション (永続化しない)
      simulation: null,
      startSimulation: (planId) => {
        const plan = get().plans.find((p) => p.id === planId)
        if (!plan || plan.waypoints.length < 2) return
        // 各セグメントの所要時間（飛行 + ホバー）を積算
        let totalMs = 0
        for (let i = 0; i < plan.waypoints.length - 1; i++) {
          const a = plan.waypoints[i], b = plan.waypoints[i + 1]
          const dx = (b.lon - a.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180)
          const dy = (b.lat - a.lat) * 110540
          const dz = b.altAGL - a.altAGL
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          totalMs += Math.max((dist / a.speedMS) * 1000, 1)
          // ホバー停止時間（最終WP手前のみ有効）
          if (b.action === 'hover' && b.hoverSec && i < plan.waypoints.length - 2) {
            totalMs += b.hoverSec * 1000
          }
        }
        // ブリッジを初期位置で初期化
        const w0 = plan.waypoints[0], w1 = plan.waypoints[1]
        // WP0→WP1 の実際の飛行方向から初期ヘディングを計算
        // heading=0 (北向き) のまま放置するとPOVカメラが誤方向を向く
        const initHeadingDeg = Math.atan2(w1.lon - w0.lon, w1.lat - w0.lat) * (180 / Math.PI)
        droneSimBridge.active = true
        droneSimBridge.lon = w0.lon
        droneSimBridge.lat = w0.lat
        droneSimBridge.altAGL = w0.altAGL
        droneSimBridge.heading = initHeadingDeg
        const wpCount = plan.waypoints.length
        set({
          simulation: {
            planId, playing: true, speed: 1, progress: 0,
            startedAt: Date.now(), totalMs,
            cameraMode: 'pov',
          },
          sidebarTab: 'plans',
          activePlanId: planId,
          mapMode: 'select',
        })
        // 企画チーム: 発進時のアチーブメントメッセージ
        const minSec = Math.round(totalMs / 1000 / 60)
        const secStr = minSec > 0 ? `${minSec}分` : `${Math.round(totalMs / 1000)}秒`
        get().addToast(`「${plan.name}」を開始 — ${wpCount}ポイント・約${secStr}のフライト`, 'success')
      },
      stopSimulation: () => {
        droneSimBridge.active = false
        set({ simulation: null })
      },
      setSimulation: (patch) =>
        set((s) => ({ simulation: s.simulation ? { ...s.simulation, ...patch } : null })),

      // UI
      sidebarTab: 'map',
      setSidebarTab: (tab) => set({ sidebarTab: tab }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // マップポップアップ
      mapPopup: null,
      setMapPopup: (popup) => set({ mapPopup: popup }),

      // トースト通知
      toasts: [],
      addToast: (message, type = 'info') => {
        const id = uid()
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, type }] }))
        setTimeout(() => get().removeToast(id), 4000)
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      // サンプルデータ（台東区ベース）
      seedExampleData: () => {
        const city = PLATEAU_CITIES.find((c) => c.id === 'taito') ?? PLATEAU_CITIES[0]
        const now = new Date().toISOString()

        const pins: DronePin[] = [
          { id: uid(), name: '浅草寺', lon: 139.7967, lat: 35.7148, alt: 8, color: '#58a6ff', note: '離陸予定地点', createdAt: now },
          { id: uid(), name: '上野恩賜公園', lon: 139.7714, lat: 35.7148, alt: 5, color: '#7ee787', note: '経由点', createdAt: now },
          { id: uid(), name: '隅田公園', lon: 139.8008, lat: 35.7198, alt: 6, color: '#ffa657', note: '着陸予定地点', createdAt: now },
        ]

        const zones: FlightZone[] = [
          {
            id: uid(), name: '浅草飛行エリア', type: 'planned',
            coordinates: [
              [139.790, 35.710], [139.804, 35.710],
              [139.804, 35.720], [139.790, 35.720],
            ],
            maxAlt: 120, createdAt: now,
          },
          {
            id: uid(), name: '上野公園 飛行禁止', type: 'restricted',
            coordinates: [
              [139.768, 35.712], [139.776, 35.712],
              [139.776, 35.719], [139.768, 35.719],
            ],
            note: '特別天然記念物保護区域', createdAt: now,
          },
        ]

        const planId = uid()
        const waypoints: Waypoint[] = [
          { id: uid(), lon: 139.7940, lat: 35.7110, altAGL: 30, groundAlt: 6, speedMS: 5, action: 'none' },
          { id: uid(), lon: 139.7980, lat: 35.7130, altAGL: 60, groundAlt: 5, speedMS: 8, action: 'photo' },
          { id: uid(), lon: 139.8020, lat: 35.7160, altAGL: 100, groundAlt: 5, speedMS: 10, action: 'none' },
          { id: uid(), lon: 139.8010, lat: 35.7195, altAGL: 80, groundAlt: 5, speedMS: 8, action: 'photo' },
          { id: uid(), lon: 139.7960, lat: 35.7180, altAGL: 50, groundAlt: 5, speedMS: 5, action: 'hover', hoverSec: 10 },
          { id: uid(), lon: 139.7940, lat: 35.7110, altAGL: 30, groundAlt: 6, speedMS: 5, action: 'none' },
        ]
        const plan: FlightPlan = {
          id: planId, name: '浅草〜隅田川 試験飛行', cityId: city.id,
          waypoints, maxAltAGL: 120, droneModel: 'DJI Mavic 3E',
          pilotName: '山田 太郎', plannedDate: new Date().toISOString().slice(0, 10),
          estimatedMinutes: 15, status: 'draft',
          createdAt: now, updatedAt: now,
        }

        const recId = uid()
        const records: FlightRecord[] = [
          {
            id: recId, planId, name: '浅草〜隅田川 試験飛行 記録', pilot: '山田 太郎',
            date: new Date().toISOString().slice(0, 10),
            weather: '晴れ', windMS: 3.5, maxAltActual: 98, distanceM: 2400,
            notes: 'ウェイポイント5でホバリング撮影実施', status: 'completed',
            createdAt: now,
          },
        ]

        const media: MediaItem[] = [
          // ── ギャラリー写真（8枚） ──
          { id: uid(), recordId: recId, name: 'WP2_正面_01.jpg', type: 'photo', lon: 139.7980, lat: 35.7130, altM: 65, timestamp: now, sizeKB: 4200, dataUrl: AERIAL_PHOTOS[0], notes: '浅草寺 正面' },
          { id: uid(), recordId: recId, name: 'WP2_正面_02.jpg', type: 'photo', lon: 139.7981, lat: 35.7131, altM: 65, timestamp: now, sizeKB: 3800, dataUrl: AERIAL_PHOTOS[1] },
          { id: uid(), recordId: recId, name: 'WP2_俯瞰_03.jpg', type: 'photo', lon: 139.7980, lat: 35.7130, altM: 65, timestamp: now, sizeKB: 5100, dataUrl: AERIAL_PHOTOS[2], notes: '俯瞰ショット' },
          { id: uid(), recordId: recId, name: 'WP4_隅田川_04.jpg', type: 'photo', lon: 139.8010, lat: 35.7195, altM: 85, timestamp: now, sizeKB: 4700, dataUrl: AERIAL_PHOTOS[3] },
          { id: uid(), recordId: recId, name: 'WP4_隅田川_05.jpg', type: 'photo', lon: 139.8011, lat: 35.7196, altM: 85, timestamp: now, sizeKB: 3900, dataUrl: AERIAL_PHOTOS[4] },
          { id: uid(), recordId: recId, name: 'WP4_スカイツリー_06.jpg', type: 'photo', lon: 139.8012, lat: 35.7195, altM: 85, timestamp: now, sizeKB: 5500, dataUrl: AERIAL_PHOTOS[5], notes: 'スカイツリー方面' },
          { id: uid(), recordId: recId, name: 'WP5_ホバー_07.jpg', type: 'photo', lon: 139.7960, lat: 35.7180, altM: 55, timestamp: now, sizeKB: 4100, dataUrl: AERIAL_PHOTOS[6] },
          { id: uid(), recordId: recId, name: 'WP5_ホバー_08.jpg', type: 'photo', lon: 139.7960, lat: 35.7180, altM: 55, timestamp: now, sizeKB: 3600, dataUrl: AERIAL_PHOTOS[7] },

          // ── パノラマ写真（2枚） ──
          { id: uid(), recordId: recId, name: 'WP2_パノラマ_360.jpg', type: 'panorama', lon: 139.7980, lat: 35.7130, altM: 65, timestamp: now, sizeKB: 18200, dataUrl: PANORAMA_PHOTOS[0], notes: 'WP2地点 360°パノラマ' },
          { id: uid(), recordId: recId, name: 'WP5_パノラマ_360.jpg', type: 'panorama', lon: 139.7960, lat: 35.7180, altM: 55, timestamp: now, sizeKB: 15800, dataUrl: PANORAMA_PHOTOS[1], notes: 'WP5ホバリング地点 360°' },

          // ── 動画（2本） ──
          { id: uid(), recordId: recId, name: 'WP2-WP3_飛行映像.mp4', type: 'video', lon: 139.7980, lat: 35.7130, altM: 65, timestamp: now, sizeKB: 125000, duration: 45, dataUrl: VIDEO_THUMBS[0], videoUrl: 'procedural', notes: 'WP2→WP3 飛行中撮影' },
          { id: uid(), recordId: recId, name: 'WP5_ホバー撮影.mp4', type: 'video', lon: 139.7960, lat: 35.7180, altM: 55, timestamp: now, sizeKB: 82000, duration: 30, dataUrl: VIDEO_THUMBS[1], videoUrl: 'procedural', notes: 'WP5 ホバリング中360°撮影' },

          // ── 3Dモデル（1つ） ──
          { id: uid(), recordId: recId, name: '浅草寺_点群モデル.glb', type: 'model3d', lon: 139.7967, lat: 35.7148, altM: 50, timestamp: now, sizeKB: 45000, notes: 'WP2周辺の点群データから生成', modelUrl: 'inline' },
        ]

        droneSimBridge.active = false

        // 総飛行時間計算
        let totalMs = 0
        for (let i = 0; i < waypoints.length - 1; i++) {
          const a = waypoints[i], b = waypoints[i + 1]
          const dx = (b.lon - a.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180)
          const dy = (b.lat - a.lat) * 110540
          const dz = b.altAGL - a.altAGL
          totalMs += (Math.sqrt(dx * dx + dy * dy + dz * dz) / a.speedMS) * 1000
        }

        // ブリッジ初期化
        const w0 = waypoints[0]
        droneSimBridge.active = true
        droneSimBridge.lon = w0.lon
        droneSimBridge.lat = w0.lat
        droneSimBridge.altAGL = w0.altAGL
        droneSimBridge.heading = 0

        set({
          selectedCity: city,
          pins, zones,
          plans: [plan], activePlanId: planId,
          records,
          media,
          mapPopup: null,
          sidebarTab: 'plans',
          // シミュレーション自動開始（追従カメラ）
          simulation: {
            planId, playing: true, speed: 1, progress: 0,
            startedAt: Date.now(), totalMs,
            cameraMode: 'follow',
          },
        })

        // カメラを台東区に移動してからシミュレーション開始
        window.dispatchEvent(new CustomEvent('cesium:flyToCity'))
      },
    }),
    {
      name: 'drone-store',
      // シミュレーション状態は永続化しない
      partialize: (s) => ({
        selectedCity: s.selectedCity,
        pins: s.pins,
        zones: s.zones,
        plans: s.plans,
        records: s.records,
        media: s.media.map((m) => ({
          ...m,
          // base64データは巨大なので除外、URL文字列は軽量なので保持
          dataUrl: m.dataUrl?.startsWith('data:') ? undefined : m.dataUrl,
          videoUrl: undefined,
        })),
      }),
    }
  )
)
