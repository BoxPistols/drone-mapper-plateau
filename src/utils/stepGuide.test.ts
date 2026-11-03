import { describe, it, expect } from 'vitest'
import { resolveGuideState, type GuideInput } from './stepGuide'
import { guideCopy } from '../constants/guideCopy'
import { BUTTON_LABELS } from '../constants/labels'
import { STEPS } from '../constants/steps'

const wp = (id: string) => ({ id }) as GuideInput['plans'][number]['waypoints'][number]
const base: GuideInput = { mapMode: 'select', plans: [], activePlanId: null, simulating: false }

describe('resolveGuideState', () => {
  it('シミュレーション中は出さない', () => {
    expect(resolveGuideState({ ...base, simulating: true, mapMode: 'zone' })).toEqual({ kind: 'hidden' })
  })

  it('配置モード中はモードの案内を優先する', () => {
    expect(resolveGuideState({ ...base, mapMode: 'zone' }).kind).toBe('placingZone')
    expect(resolveGuideState({ ...base, mapMode: 'pin' }).kind).toBe('placingPin')
    const plans = [{ id: 'a', name: 'A', waypoints: [wp('1')] }]
    expect(resolveGuideState({ ...base, mapMode: 'waypoint', plans, activePlanId: 'a' }))
      .toEqual({ kind: 'placingWaypoint', count: 1 })
  })

  it('飛行エリアが無くても計画の段階に進める', () => {
    expect(resolveGuideState(base).kind).toBe('noPlan')
    const plans = [{ id: 'a', name: 'A', waypoints: [] }]
    expect(resolveGuideState({ ...base, plans })).toEqual({ kind: 'needMoreWaypoints', planName: 'A', count: 0 })
  })

  it('開いている計画を基準に判断する', () => {
    const plans = [
      { id: 'a', name: 'A', waypoints: [wp('1'), wp('2')] },
      { id: 'b', name: 'B', waypoints: [wp('3')] },
    ]
    expect(resolveGuideState({ ...base, plans, activePlanId: 'b' }).kind).toBe('needMoreWaypoints')
    expect(resolveGuideState({ ...base, plans, activePlanId: null })).toEqual({ kind: 'ready', planName: 'A' })
  })
})

describe('guideCopy', () => {
  it('案内に出すボタン名は実在するボタンの表記と一致する', () => {
    const labels = Object.values(BUTTON_LABELS) as string[]
    const states = [
      resolveGuideState({ ...base, mapMode: 'waypoint' }),
      resolveGuideState(base),
      resolveGuideState({ ...base, plans: [{ id: 'a', name: 'A', waypoints: [] }] }),
      resolveGuideState({ ...base, plans: [{ id: 'a', name: 'A', waypoints: [wp('1'), wp('2')] }] }),
    ]
    for (const s of states) {
      const c = guideCopy(s)
      expect(c?.button).toBeDefined()
      expect(labels).toContain(c?.button)
    }
  })

  it('手順番号は STEPS の定義と一致する', () => {
    const ready = guideCopy({ kind: 'ready', planName: 'A' })
    expect(ready?.step).toBe(`STEP ${STEPS.find((s) => s.id === 'fly')?.number}`)
    expect(STEPS.map((s) => s.number)).toEqual([1, 2, 3])
  })
})
