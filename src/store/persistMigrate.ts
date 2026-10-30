// localStorage(persist) スキーマのマイグレーション。
// droneStore から分離して cesium 非依存にし、単体テストできるようにしている。
import type { CityConfig, DronePin, FlightZone, FlightPlan } from '../types'

/** persist に保存する状態（シミュレーション・UI 状態は含めない） */
export interface PersistedDroneState {
  selectedCity: CityConfig
  pins: DronePin[]
  zones: FlightZone[]
  plans: FlightPlan[]
}

// v2 (Phase 0): 飛行記録(records)・撮影データ(media)・計画ステータス(status)を廃止
export const PERSIST_VERSION = 2

export function migratePersistedState(persisted: unknown, version: number): PersistedDroneState {
  const s = { ...((persisted ?? {}) as Record<string, unknown>) }
  if (version < 2) {
    delete s.records
    delete s.media
    if (Array.isArray(s.plans)) {
      s.plans = s.plans.map((p) => {
        const plan = { ...(p as Record<string, unknown>) }
        delete plan.status
        return plan
      })
    }
  }
  return s as unknown as PersistedDroneState
}
