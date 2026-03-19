// ── 都市モデル ──────────────────────────────────
export interface CityConfig {
  id: string
  name: string
  prefecture: string
  tilesUrl: string
  longitude: number
  latitude: number
  height: number
  lod?: number
  hasTexture?: boolean
}

export type BuildingProperties = Record<string, string | number | boolean | null | undefined>

// ── マップモード ────────────────────────────────
export type MapMode = 'select' | 'pin' | 'zone' | 'waypoint'

// ── ピン ───────────────────────────────────────
export interface DronePin {
  id: string
  name: string
  lon: number
  lat: number
  alt: number // 海抜高さ (m)
  color: string // hex
  note?: string
  createdAt: string
}

// ── 飛行ゾーン（ポリゴン）─────────────────────
export type ZoneType = 'planned' | 'restricted' | 'caution' | 'completed'

export interface FlightZone {
  id: string
  name: string
  type: ZoneType
  coordinates: [number, number][] // [lon, lat][]
  maxAlt?: number // 最高高度 (m)
  note?: string
  createdAt: string
}

// ── ウェイポイント ──────────────────────────────
export type WaypointAction = 'none' | 'photo' | 'video_start' | 'video_stop' | 'hover'

export interface Waypoint {
  id: string
  lon: number
  lat: number
  altAGL: number // AGL: 地上高 (m)
  speedMS: number // 速度 m/s
  action: WaypointAction
  hoverSec?: number
  heading?: number // 機首方位 deg
}

// ── 飛行計画 ───────────────────────────────────
export type PlanStatus = 'draft' | 'approved' | 'completed'

export interface FlightPlan {
  id: string
  name: string
  description?: string
  cityId: string
  waypoints: Waypoint[]
  maxAltAGL: number // m
  droneModel?: string
  pilotName?: string
  plannedDate?: string
  estimatedMinutes?: number
  status: PlanStatus
  createdAt: string
  updatedAt: string
}

// ── 飛行記録 ───────────────────────────────────
export type RecordStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface FlightRecord {
  id: string
  planId?: string
  name: string
  pilot: string
  date: string
  startTime?: string
  endTime?: string
  weather?: string
  windMS?: number
  maxAltActual?: number
  distanceM?: number
  notes?: string
  status: RecordStatus
  createdAt: string
}

// ── 撮影データ ─────────────────────────────────
export type MediaType = 'photo' | 'video'

export interface MediaItem {
  id: string
  recordId?: string
  planId?: string
  name: string
  type: MediaType
  lon?: number
  lat?: number
  altM?: number
  timestamp: string
  sizeKB?: number
  notes?: string
  dataUrl?: string // thumbnail base64
}

// ── シミュレーション ────────────────────────────
export type CameraMode = 'free' | 'follow' | 'pov'

export interface SimState {
  planId: string
  playing: boolean
  speed: number // 1 | 2 | 5 | 10
  progress: number // 0.0 - 1.0 (UIシーカー用)
  startedAt: number | null // Date.now()
  totalMs: number // 総所要時間 ms (speed=1x)
  cameraMode: CameraMode
  // dronePos は droneSimBridge に移動（Reactレンダーを経由しない高速更新）
}

// ── アプリタブ ─────────────────────────────────
export type SidebarTab = 'map' | 'plans' | 'records' | 'media'

// ── マップ上エンティティポップアップ ────────────
export interface MapPopupState {
  type: 'pin' | 'zone'
  id: string
  x: number // canvas pixel (left of cesium canvas)
  y: number // canvas pixel (top of cesium canvas)
}
