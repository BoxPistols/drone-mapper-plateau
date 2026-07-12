import { describe, it, expect } from 'vitest'
import { coerceWaypointAction, WAYPOINT_ACTIONS, CAMERA_LABELS, ZONE_TYPE_LABELS } from './labels'

describe('coerceWaypointAction', () => {
  it('正しい WaypointAction はそのまま通す', () => {
    for (const a of WAYPOINT_ACTIONS) {
      expect(coerceWaypointAction(a)).toBe(a)
    }
  })

  it('不正な値・未知の文字列・null は none に落とす', () => {
    expect(coerceWaypointAction('dance')).toBe('none')
    expect(coerceWaypointAction(undefined)).toBe('none')
    expect(coerceWaypointAction(null)).toBe('none')
    expect(coerceWaypointAction(42)).toBe('none')
    expect(coerceWaypointAction('')).toBe('none')
  })
})

describe('ラベル定数の網羅性', () => {
  it('カメラ3モードすべてにラベルがある', () => {
    expect(CAMERA_LABELS.free).toBeTruthy()
    expect(CAMERA_LABELS.follow).toBeTruthy()
    expect(CAMERA_LABELS.pov).toBeTruthy()
  })
  it('ゾーン4種すべてにラベルがある', () => {
    for (const t of ['planned', 'restricted', 'caution', 'completed'] as const) {
      expect(ZONE_TYPE_LABELS[t]).toBeTruthy()
    }
  })
})
