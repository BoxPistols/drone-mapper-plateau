import { describe, it, expect } from 'vitest'
import { migratePersistedState, PERSIST_VERSION } from './persistMigrate'

describe('migratePersistedState', () => {
  it('v1 の records / media を捨て、plan.status を除去する', () => {
    const v1 = {
      selectedCity: { id: 'taito' },
      pins: [{ id: 'p1' }],
      zones: [{ id: 'z1' }],
      plans: [{ id: 'pl1', name: 'A', status: 'draft', waypoints: [] }],
      records: [{ id: 'r1' }],
      media: [{ id: 'm1' }],
    }
    const out = migratePersistedState(v1, 0) as unknown as Record<string, unknown>
    expect(out).not.toHaveProperty('records')
    expect(out).not.toHaveProperty('media')
    expect(out.plans).toEqual([{ id: 'pl1', name: 'A', waypoints: [] }])
    expect(out.pins).toEqual([{ id: 'p1' }])
    expect(out.zones).toEqual([{ id: 'z1' }])
    // 元オブジェクトは変更しない
    expect(v1).toHaveProperty('records')
    expect(v1.plans[0]).toHaveProperty('status')
  })

  it('空・壊れた保存値でも例外を出さない', () => {
    expect(() => migratePersistedState(undefined, 0)).not.toThrow()
    expect(() => migratePersistedState(null, 0)).not.toThrow()
    expect(() => migratePersistedState({ plans: 'broken' }, 0)).not.toThrow()
  })

  it('現行バージョンの保存値はそのまま通す', () => {
    const v2 = { selectedCity: { id: 'taito' }, pins: [], zones: [], plans: [{ id: 'x', waypoints: [] }] }
    expect(migratePersistedState(v2, PERSIST_VERSION)).toEqual(v2)
  })
})
