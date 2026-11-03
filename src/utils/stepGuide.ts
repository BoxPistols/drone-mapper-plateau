// 地図下部のガイドが「今なにをすればよいか」を決める状態機械。
// 飛行エリアの有無は計画にもシミュレーションにも影響しないため、条件に含めない
import type { FlightPlan, MapMode } from '../types'

export type GuideState =
  | { kind: 'hidden' }
  | { kind: 'placingZone' }
  | { kind: 'placingPin' }
  | { kind: 'placingWaypoint'; count: number }
  | { kind: 'noPlan' }
  | { kind: 'needMoreWaypoints'; planName: string; count: number }
  | { kind: 'ready'; planName: string }

export interface GuideInput {
  mapMode: MapMode
  plans: Pick<FlightPlan, 'id' | 'name' | 'waypoints'>[]
  activePlanId: string | null
  simulating: boolean
}

export const MIN_WAYPOINTS = 2

export function resolveGuideState({ mapMode, plans, activePlanId, simulating }: GuideInput): GuideState {
  if (simulating) return { kind: 'hidden' }
  if (mapMode === 'zone') return { kind: 'placingZone' }
  if (mapMode === 'pin') return { kind: 'placingPin' }

  const active = plans.find((p) => p.id === activePlanId) ?? null
  if (mapMode === 'waypoint') return { kind: 'placingWaypoint', count: active?.waypoints.length ?? 0 }

  if (plans.length === 0) return { kind: 'noPlan' }
  // 開いている計画を優先し、無ければ飛ばせる計画があるかで判断する
  const target = active ?? plans.find((p) => p.waypoints.length >= MIN_WAYPOINTS) ?? plans[0]
  if (target.waypoints.length < MIN_WAYPOINTS) {
    return { kind: 'needMoreWaypoints', planName: target.name, count: target.waypoints.length }
  }
  return { kind: 'ready', planName: target.name }
}
