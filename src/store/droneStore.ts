import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { droneSimBridge } from '../sim/droneSimBridge'
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
        const w0 = plan.waypoints[0]
        droneSimBridge.active = true
        droneSimBridge.lon = w0.lon
        droneSimBridge.lat = w0.lat
        droneSimBridge.altAGL = w0.altAGL
        droneSimBridge.heading = 0
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
        media: s.media.map((m) => ({ ...m, dataUrl: undefined })), // thumbnailは除外
      }),
    }
  )
)
