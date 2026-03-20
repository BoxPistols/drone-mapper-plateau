/**
 * AIアシスタント用ツール定義
 * Claude が droneStore のアクションを呼び出すためのインターフェース
 */
import type Anthropic from '@anthropic-ai/sdk'
import { useDroneStore, PLATEAU_CITIES } from '../store/droneStore'

// ── ツール定義（Claude に渡すスキーマ）────────────────────────────────
export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_app_state',
    description: '現在のアプリの状態（選択中の都市、飛行計画一覧、ピン数など）を取得する。ユーザーの質問に答えたり、操作前に現状を確認するために使う。',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'select_city',
    description: '表示する3D都市モデルを切り替える。「東京」「大阪」「福岡」などの都市名に対応するIDを指定する。',
    input_schema: {
      type: 'object',
      properties: {
        cityId: {
          type: 'string',
          description: `都市ID。選択肢: ${PLATEAU_CITIES.map((c) => `${c.id}(${c.name})`).join(', ')}`,
          enum: PLATEAU_CITIES.map((c) => c.id),
        },
      },
      required: ['cityId'],
    },
  },
  {
    name: 'create_flight_plan',
    description: '新しい飛行計画を作成する。名前を指定しない場合は自動命名される。作成後は自動的にアクティブプランになる。',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '飛行計画の名前（例: 「浅草上空巡回」）' },
      },
    },
  },
  {
    name: 'add_waypoints',
    description: 'アクティブな飛行計画にウェイポイント（通過ポイント）を追加する。緯度・経度・地上高(m)のリストを渡す。座標は日本国内の範囲で指定すること。',
    input_schema: {
      type: 'object',
      properties: {
        planId: { type: 'string', description: '飛行計画ID（get_app_state で確認できる）' },
        waypoints: {
          type: 'array',
          description: '追加するウェイポイントのリスト',
          items: {
            type: 'object',
            properties: {
              lon:    { type: 'number', description: '経度（例: 139.7965）' },
              lat:    { type: 'number', description: '緯度（例: 35.7150）' },
              altAGL: { type: 'number', description: '地上高(m)。ドローン規制上限は150m。推奨: 30〜100m' },
              action: {
                type: 'string',
                description: 'このポイントでの動作',
                enum: ['none', 'photo', 'hover'],
                default: 'none',
              },
            },
            required: ['lon', 'lat', 'altAGL'],
          },
        },
      },
      required: ['planId', 'waypoints'],
    },
  },
  {
    name: 'add_pin',
    description: '地図に目印（ピン）を追加する。ランドマーク、離発着地点、注意地点などのマーキングに使う。',
    input_schema: {
      type: 'object',
      properties: {
        name:  { type: 'string', description: 'ピン名（例: 「離陸地点」「電波塔注意」）' },
        lon:   { type: 'number', description: '経度' },
        lat:   { type: 'number', description: '緯度' },
        color: { type: 'string', description: '色（hex、例: #58a6ff）', default: '#58a6ff' },
        note:  { type: 'string', description: 'メモ（任意）' },
      },
      required: ['name', 'lon', 'lat'],
    },
  },
  {
    name: 'start_simulation',
    description: '指定した飛行計画のシミュレーションを開始する。計画にウェイポイントが2点以上必要。',
    input_schema: {
      type: 'object',
      properties: {
        planId: { type: 'string', description: 'シミュレートする飛行計画ID' },
      },
      required: ['planId'],
    },
  },
]

// ── ツール実行（Claude のツールコールを droneStore に橋渡し）──────────
export type ToolResult = string

export function executeTool(name: string, input: Record<string, unknown>): ToolResult {
  const store = useDroneStore.getState()

  switch (name) {
    case 'get_app_state': {
      const state = {
        selectedCity: { id: store.selectedCity.id, name: store.selectedCity.name },
        plans: store.plans.map((p) => ({
          id: p.id, name: p.name, status: p.status,
          waypointCount: p.waypoints.length,
          isActive: p.id === store.activePlanId,
        })),
        activePlanId: store.activePlanId,
        pinCount: store.pins.length,
        zoneCount: store.zones.length,
        simulationActive: !!store.simulation,
      }
      return JSON.stringify(state, null, 2)
    }

    case 'select_city': {
      const cityId = input.cityId as string
      const city = PLATEAU_CITIES.find((c) => c.id === cityId)
      if (!city) return `エラー: 都市ID "${cityId}" は存在しません`
      store.setSelectedCity(city)
      store.setSidebarTab('map')
      return `${city.name}に切り替えました`
    }

    case 'create_flight_plan': {
      const plan = store.addPlan()
      const name = input.name as string | undefined
      if (name) store.updatePlan(plan.id, { name })
      store.setSidebarTab('plans')
      store.setSidebarOpen(true)
      return JSON.stringify({ planId: plan.id, name: name ?? plan.name, message: '飛行計画を作成しました' })
    }

    case 'add_waypoints': {
      const planId = input.planId as string
      const wps = input.waypoints as Array<{ lon: number; lat: number; altAGL: number; action?: string }>
      const plan = store.plans.find((p) => p.id === planId)
      if (!plan) return `エラー: 飛行計画ID "${planId}" が見つかりません`

      for (const wp of wps) {
        store.addWaypoint(planId, wp.lon, wp.lat, 0)
        // 追加直後に altAGL と action を更新
        const updated = store.plans.find((p) => p.id === planId)
        const last = updated?.waypoints[updated.waypoints.length - 1]
        if (last) {
          store.updateWaypoint(planId, last.id, {
            altAGL: wp.altAGL,
            action: (wp.action as never) ?? 'none',
          })
        }
      }
      return `${wps.length}個のウェイポイントを追加しました（計画: ${plan.name}）`
    }

    case 'add_pin': {
      const pin = store.addPin(input.lon as number, input.lat as number, 0)
      store.updatePin(pin.id, {
        name:  input.name  as string,
        color: (input.color as string) ?? '#58a6ff',
        note:  input.note  as string | undefined,
      })
      return `ピン「${input.name}」を追加しました`
    }

    case 'start_simulation': {
      const planId = input.planId as string
      const plan = store.plans.find((p) => p.id === planId)
      if (!plan) return `エラー: 飛行計画ID "${planId}" が見つかりません`
      if (plan.waypoints.length < 2) return 'エラー: シミュレーションにはウェイポイントが2点以上必要です'
      store.setActivePlanId(planId)
      store.startSimulation(planId)
      return `「${plan.name}」のシミュレーションを開始しました`
    }

    default:
      return `エラー: 未知のツール "${name}"`
  }
}
