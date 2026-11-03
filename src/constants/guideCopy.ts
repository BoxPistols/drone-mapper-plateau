// ガイド文。ボタン名は BUTTON_LABELS から、手順番号は STEPS から埋め込む
import type { GuideState } from '../utils/stepGuide'
import { MIN_WAYPOINTS } from '../utils/stepGuide'
import { BUTTON_LABELS } from './labels'
import { stepLabel, stepById } from './steps'

export interface GuideCopy {
  tone: 'info' | 'action' | 'ready'
  step?: string
  before: string
  /** 押すボタンの名前。「」付きで強調表示する */
  button?: string
  after?: string
}

export function guideCopy(state: GuideState): GuideCopy | null {
  switch (state.kind) {
    case 'hidden':
      return null
    case 'placingZone':
      return { tone: 'action', before: '地図をクリックしてエリアの角を置き、ダブルクリックで確定します。右クリックで1つ戻せます' }
    case 'placingPin':
      return { tone: 'action', before: '地図をクリックすると目印を置きます' }
    case 'placingWaypoint': {
      const rest = Math.max(0, MIN_WAYPOINTS - state.count)
      return {
        tone: 'action',
        step: stepLabel('route'),
        before: rest > 0
          ? `地図をクリックして通過ポイントを置きます（あと${rest}つ）。終わったら`
          : `通過ポイント ${state.count}つ。続けて置くか、終わったら`,
        button: BUTTON_LABELS.finishPlacing,
        after: 'を押します',
      }
    }
    case 'noPlan':
      return {
        tone: 'info',
        step: stepLabel('route'),
        before: `${stepById('route').title} — 「飛行計画」タブの`,
        button: BUTTON_LABELS.newPlan,
        after: 'から始めます。先に動きを見るならマップタブの「デモフライトを見る」',
      }
    case 'needMoreWaypoints':
      return {
        tone: 'info',
        step: stepLabel('route'),
        before: `「${state.planName}」に通過ポイントがあと${MIN_WAYPOINTS - state.count}つ必要です。計画の詳細で`,
        button: BUTTON_LABELS.addWaypointsOnMap,
        after: 'を押します',
      }
    case 'ready':
      return {
        tone: 'ready',
        step: stepLabel('fly'),
        before: `「${state.planName}」を飛ばせます。計画の詳細で`,
        button: BUTTON_LABELS.startSimulation,
        after: 'を押します',
      }
  }
}
